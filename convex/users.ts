import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get current user by session token
export const getCurrentUser = query({
  args: { sessionToken: v.optional(v.string()) },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.string(),
      bio: v.optional(v.string()),
      profilePicture: v.optional(v.id("_storage")),
      credits: v.number(),
      role: v.union(v.literal("user"), v.literal("admin")),
      isActive: v.boolean(),
      suspendedUntil: v.optional(v.number()),
      suspensionReason: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    if (!args.sessionToken) return null;

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken!))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) return null;

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      email: user.email,
      name: user.name,
      bio: user.bio,
      profilePicture: user.profilePicture,
      credits: user.credits,
      role: user.role,
      isActive: user.isActive,
      suspendedUntil: user.suspendedUntil,
      suspensionReason: user.suspensionReason,
    };
  },
});

// Get user by ID (public profile view)
export const getUserById = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.string(),
      bio: v.optional(v.string()),
      profilePicture: v.optional(v.id("_storage")),
      credits: v.number(),
      role: v.union(v.literal("user"), v.literal("admin")),
      providerRating: v.number(),
      requesterRating: v.number(),
      totalProviderRatings: v.number(),
      totalRequesterRatings: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.isActive) return null;

    // Calculate reputation metrics
    const ratingsAsProvider = await ctx.db
      .query("ratings")
      .withIndex("by_rateeId", (q) => q.eq("rateeId", args.userId))
      .collect();

    const providerRatings = ratingsAsProvider.filter(
      (r) => r.raterRole === "requester"
    );
    const requesterRatings = ratingsAsProvider.filter(
      (r) => r.raterRole === "provider"
    );

    const providerRating =
      providerRatings.length > 0
        ? providerRatings.reduce((sum, r) => sum + r.rating, 0) /
          providerRatings.length
        : 0;

    const requesterRating =
      requesterRatings.length > 0
        ? requesterRatings.reduce((sum, r) => sum + r.rating, 0) /
          requesterRatings.length
        : 0;

    return {
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      bio: user.bio,
      profilePicture: user.profilePicture,
      credits: user.credits,
      role: user.role,
      providerRating,
      requesterRating,
      totalProviderRatings: providerRatings.length,
      totalRequesterRatings: requesterRatings.length,
    };
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    sessionToken: v.string(),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePicture: v.optional(v.id("_storage")),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const updates: Record<string, string | Id<"_storage">> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.profilePicture !== undefined)
      updates.profilePicture = args.profilePicture;

    await ctx.db.patch(session.userId, updates);
    return true;
  },
});

// Get all users (for admin)
export const getAllUsers = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.string(),
      name: v.string(),
      credits: v.number(),
      role: v.union(v.literal("user"), v.literal("admin")),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return [];

    const currentUser = await ctx.db.get(session.userId);
    if (!currentUser || currentUser.role !== "admin") return [];

    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      _creationTime: u._creationTime,
      email: u.email,
      name: u.name,
      credits: u.credits,
      role: u.role,
      isActive: u.isActive,
    }));
  },
});

// Search users by skill
export const searchUsersBySkill = query({
  args: { skillName: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.string(),
      bio: v.optional(v.string()),
      profilePicture: v.optional(v.id("_storage")),
      skillLevel: v.union(
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
      .withIndex("by_name", (q) => q.eq("name", args.skillName.toLowerCase()))
      .collect();

    const results: Array<{
      _id: Id<"users">;
      name: string;
      bio: string | undefined;
      profilePicture: Id<"_storage"> | undefined;
      skillLevel: "beginner" | "intermediate" | "expert";
      endorsements: number;
    }> = [];

    for (const skill of skills) {
      const user = await ctx.db.get(skill.userId);
      if (user && user.isActive) {
        results.push({
          _id: user._id,
          name: user.name,
          bio: user.bio,
          profilePicture: user.profilePicture,
          skillLevel: skill.level,
          endorsements: skill.endorsements,
        });
      }
    }

    return results;
  },
});

// Internal: Create initial admin user
export const createInitialAdmin = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
  },
  returns: v.id("users"),
  handler: async (ctx, args) => {
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (existingAdmin) {
      return existingAdmin._id;
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      name: args.name,
      credits: 1000,
      role: "admin",
      isActive: true,
    });

    // Add initial credit history
    await ctx.db.insert("creditHistory", {
      userId,
      amount: 1000,
      type: "initial",
      description: "Initial admin credits",
      balanceAfter: 1000,
    });

    return userId;
  },
});

// Get profile picture URL
export const getProfilePictureUrl = query({
  args: { storageId: v.optional(v.id("_storage")) },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    if (!args.storageId) return null;
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Report a user
export const reportUser = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    reason: v.string(),
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

    // Can't report yourself
    if (session.userId === args.userId) {
      return { success: false as const, error: "Cannot report yourself" };
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      return { success: false as const, error: "User not found" };
    }

    // Can't report admins
    if (targetUser.role === "admin") {
      return { success: false as const, error: "Cannot report administrators" };
    }

    await ctx.db.insert("reports", {
      reporterId: session.userId,
      reportType: "user",
      targetId: args.userId,
      reason: args.reason,
      status: "pending",
    });

    return { success: true as const };
  },
});

