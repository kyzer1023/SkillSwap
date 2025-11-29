import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get skills for a user
export const getUserSkills = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("skills"),
      _creationTime: v.number(),
      name: v.string(),
      level: v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("expert")
      ),
      endorsements: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const skills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return skills.map((s) => ({
      _id: s._id,
      _creationTime: s._creationTime,
      name: s.name,
      level: s.level,
      endorsements: s.endorsements,
    }));
  },
});

// Add a skill
export const addSkill = mutation({
  args: {
    sessionToken: v.string(),
    name: v.string(),
    level: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("expert")
    ),
  },
  returns: v.union(
    v.object({ success: v.literal(true), skillId: v.id("skills") }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      return { success: false as const, error: "Invalid session" };
    }

    // Check if user is admin - admins cannot add skills
    const user = await ctx.db.get(session.userId);
    if (user?.role === "admin") {
      return { success: false as const, error: "Administrators cannot add skills" };
    }

    // Check if skill already exists for user
    const existingSkills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .collect();

    const normalizedName = args.name.toLowerCase().trim();
    const duplicate = existingSkills.find(
      (s) => s.name.toLowerCase() === normalizedName
    );

    if (duplicate) {
      return { success: false as const, error: "Skill already exists" };
    }

    const skillId = await ctx.db.insert("skills", {
      userId: session.userId,
      name: normalizedName,
      level: args.level,
      endorsements: 0,
    });

    return { success: true as const, skillId };
  },
});

// Update a skill
export const updateSkill = mutation({
  args: {
    sessionToken: v.string(),
    skillId: v.id("skills"),
    level: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("expert")
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const skill = await ctx.db.get(args.skillId);
    if (!skill || skill.userId !== session.userId) return false;

    await ctx.db.patch(args.skillId, { level: args.level });
    return true;
  },
});

// Delete a skill
export const deleteSkill = mutation({
  args: {
    sessionToken: v.string(),
    skillId: v.id("skills"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const skill = await ctx.db.get(args.skillId);
    if (!skill || skill.userId !== session.userId) return false;

    // Delete associated endorsements
    const endorsements = await ctx.db
      .query("skillEndorsements")
      .withIndex("by_skillId", (q) => q.eq("skillId", args.skillId))
      .collect();

    for (const endorsement of endorsements) {
      await ctx.db.delete(endorsement._id);
    }

    await ctx.db.delete(args.skillId);
    return true;
  },
});

// Search skills (for autocomplete)
export const searchSkills = query({
  args: { query: v.string() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    if (args.query.length < 2) return [];

    const allSkills = await ctx.db.query("skills").collect();
    const uniqueSkills = new Set<string>();

    for (const skill of allSkills) {
      if (skill.name.toLowerCase().includes(args.query.toLowerCase())) {
        uniqueSkills.add(skill.name);
      }
    }

    return Array.from(uniqueSkills).slice(0, 10);
  },
});

// Get all unique skills in the system
export const getAllUniqueSkills = query({
  args: {},
  returns: v.array(
    v.object({
      name: v.string(),
      count: v.number(),
    })
  ),
  handler: async (ctx) => {
    const allSkills = await ctx.db.query("skills").collect();
    const skillCounts: Record<string, number> = {};

    for (const skill of allSkills) {
      const name = skill.name.toLowerCase();
      skillCounts[name] = (skillCounts[name] || 0) + 1;
    }

    return Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  },
});

// Endorse a skill
export const endorseSkill = mutation({
  args: {
    sessionToken: v.string(),
    skillId: v.id("skills"),
    transactionId: v.id("transactions"),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      return { success: false as const, error: "Invalid session" };
    }

    const skill = await ctx.db.get(args.skillId);
    if (!skill) {
      return { success: false as const, error: "Skill not found" };
    }

    // Check if already endorsed
    const existingEndorsements = await ctx.db
      .query("skillEndorsements")
      .withIndex("by_skillId", (q) => q.eq("skillId", args.skillId))
      .collect();

    const alreadyEndorsed = existingEndorsements.find(
      (e) => e.endorserId === session.userId
    );

    if (alreadyEndorsed) {
      return { success: false as const, error: "Already endorsed this skill" };
    }

    // Verify transaction exists and user was the requester
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction || transaction.requesterId !== session.userId) {
      return { success: false as const, error: "Invalid transaction" };
    }

    // Add endorsement
    await ctx.db.insert("skillEndorsements", {
      skillId: args.skillId,
      endorserId: session.userId,
      transactionId: args.transactionId,
    });

    // Update endorsement count
    await ctx.db.patch(args.skillId, {
      endorsements: skill.endorsements + 1,
    });

    return { success: true as const };
  },
});

