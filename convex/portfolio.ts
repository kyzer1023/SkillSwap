import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get portfolio items for a user
export const getUserPortfolio = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("portfolioItems"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      fileId: v.id("_storage"),
      fileType: v.union(v.literal("image"), v.literal("document")),
      fileUrl: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("portfolioItems")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const itemsWithUrls = await Promise.all(
      items.map(async (item) => ({
        _id: item._id,
        _creationTime: item._creationTime,
        title: item.title,
        description: item.description,
        fileId: item.fileId,
        fileType: item.fileType,
        fileUrl: await ctx.storage.getUrl(item.fileId),
      }))
    );

    return itemsWithUrls;
  },
});

// Add portfolio item
export const addPortfolioItem = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    fileId: v.id("_storage"),
    fileType: v.union(v.literal("image"), v.literal("document")),
  },
  returns: v.union(
    v.object({ success: v.literal(true), itemId: v.id("portfolioItems") }),
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

    const itemId = await ctx.db.insert("portfolioItems", {
      userId: session.userId,
      title: args.title,
      description: args.description,
      fileId: args.fileId,
      fileType: args.fileType,
    });

    return { success: true as const, itemId };
  },
});

// Update portfolio item
export const updatePortfolioItem = mutation({
  args: {
    sessionToken: v.string(),
    itemId: v.id("portfolioItems"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== session.userId) return false;

    const updates: Record<string, string> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;

    await ctx.db.patch(args.itemId, updates);
    return true;
  },
});

// Delete portfolio item
export const deletePortfolioItem = mutation({
  args: {
    sessionToken: v.string(),
    itemId: v.id("portfolioItems"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== session.userId) return false;

    // Delete the file from storage
    await ctx.storage.delete(item.fileId);

    // Delete the portfolio item
    await ctx.db.delete(args.itemId);
    return true;
  },
});

// Generate upload URL for portfolio files
export const generateUploadUrl = mutation({
  args: { sessionToken: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    return await ctx.storage.generateUploadUrl();
  },
});

