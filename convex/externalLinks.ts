import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get external links for a user
export const getUserLinks = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("externalLinks"),
      platform: v.string(),
      url: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const links = await ctx.db
      .query("externalLinks")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return links.map((l) => ({
      _id: l._id,
      platform: l.platform,
      url: l.url,
    }));
  },
});

// Add external link
export const addLink = mutation({
  args: {
    sessionToken: v.string(),
    platform: v.string(),
    url: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), linkId: v.id("externalLinks") }),
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

    // Basic URL validation
    try {
      new URL(args.url);
    } catch {
      return { success: false as const, error: "Invalid URL format" };
    }

    // Check for duplicate platform
    const existingLinks = await ctx.db
      .query("externalLinks")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .collect();

    const duplicate = existingLinks.find(
      (l) => l.platform.toLowerCase() === args.platform.toLowerCase()
    );

    if (duplicate) {
      return {
        success: false as const,
        error: "Link for this platform already exists",
      };
    }

    const linkId = await ctx.db.insert("externalLinks", {
      userId: session.userId,
      platform: args.platform,
      url: args.url,
    });

    return { success: true as const, linkId };
  },
});

// Update external link
export const updateLink = mutation({
  args: {
    sessionToken: v.string(),
    linkId: v.id("externalLinks"),
    url: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const link = await ctx.db.get(args.linkId);
    if (!link || link.userId !== session.userId) return false;

    // Basic URL validation
    try {
      new URL(args.url);
    } catch {
      return false;
    }

    await ctx.db.patch(args.linkId, { url: args.url });
    return true;
  },
});

// Delete external link
export const deleteLink = mutation({
  args: {
    sessionToken: v.string(),
    linkId: v.id("externalLinks"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const link = await ctx.db.get(args.linkId);
    if (!link || link.userId !== session.userId) return false;

    await ctx.db.delete(args.linkId);
    return true;
  },
});

