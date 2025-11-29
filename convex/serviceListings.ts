import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get service listings for a user
export const getUserListings = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("serviceListings"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      skillRequired: v.string(),
      exchangeMode: v.union(
        v.literal("credit"),
        v.literal("skill_swap"),
        v.literal("both")
      ),
      creditAmount: v.optional(v.number()),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const listings = await ctx.db
      .query("serviceListings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return listings.map((l) => ({
      _id: l._id,
      _creationTime: l._creationTime,
      title: l.title,
      description: l.description,
      skillRequired: l.skillRequired,
      exchangeMode: l.exchangeMode,
      creditAmount: l.creditAmount,
      isActive: l.isActive,
    }));
  },
});

// Get all active service listings
export const getActiveListings = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("serviceListings"),
      _creationTime: v.number(),
      userId: v.id("users"),
      userName: v.string(),
      title: v.string(),
      description: v.string(),
      skillRequired: v.string(),
      exchangeMode: v.union(
        v.literal("credit"),
        v.literal("skill_swap"),
        v.literal("both")
      ),
      creditAmount: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const listings = await ctx.db
      .query("serviceListings")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .take(limit);

    const listingsWithUsers = await Promise.all(
      listings.map(async (listing) => {
        const user = await ctx.db.get(listing.userId);
        return {
          _id: listing._id,
          _creationTime: listing._creationTime,
          userId: listing.userId,
          userName: user?.name ?? "Unknown User",
          title: listing.title,
          description: listing.description,
          skillRequired: listing.skillRequired,
          exchangeMode: listing.exchangeMode,
          creditAmount: listing.creditAmount,
        };
      })
    );

    return listingsWithUsers;
  },
});

// Search service listings
export const searchListings = query({
  args: { query: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("serviceListings"),
      _creationTime: v.number(),
      userId: v.id("users"),
      userName: v.string(),
      title: v.string(),
      description: v.string(),
      skillRequired: v.string(),
      exchangeMode: v.union(
        v.literal("credit"),
        v.literal("skill_swap"),
        v.literal("both")
      ),
      creditAmount: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    const listings = await ctx.db
      .query("serviceListings")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();

    const filtered = listings.filter(
      (l) =>
        l.title.toLowerCase().includes(searchTerm) ||
        l.description.toLowerCase().includes(searchTerm) ||
        l.skillRequired.toLowerCase().includes(searchTerm)
    );

    const listingsWithUsers = await Promise.all(
      filtered.map(async (listing) => {
        const user = await ctx.db.get(listing.userId);
        return {
          _id: listing._id,
          _creationTime: listing._creationTime,
          userId: listing.userId,
          userName: user?.name ?? "Unknown User",
          title: listing.title,
          description: listing.description,
          skillRequired: listing.skillRequired,
          exchangeMode: listing.exchangeMode,
          creditAmount: listing.creditAmount,
        };
      })
    );

    return listingsWithUsers;
  },
});

// Create service listing
export const createListing = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    description: v.string(),
    skillRequired: v.string(),
    exchangeMode: v.union(
      v.literal("credit"),
      v.literal("skill_swap"),
      v.literal("both")
    ),
    creditAmount: v.optional(v.number()),
  },
  returns: v.union(
    v.object({ success: v.literal(true), listingId: v.id("serviceListings") }),
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

    // Check if user is admin - admins cannot create service listings
    const user = await ctx.db.get(session.userId);
    if (!user) {
      return { success: false as const, error: "User not found" };
    }

    if (user.role === "admin") {
      return { success: false as const, error: "Administrators cannot create service listings" };
    }

    // Verify user has the skill
    const userSkills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .collect();

    const hasSkill = userSkills.some(
      (s) => s.name.toLowerCase() === args.skillRequired.toLowerCase()
    );

    if (!hasSkill) {
      return {
        success: false as const,
        error: "You must have this skill in your profile first",
      };
    }

    const listingId = await ctx.db.insert("serviceListings", {
      userId: session.userId,
      title: args.title,
      description: args.description,
      skillRequired: args.skillRequired.toLowerCase(),
      exchangeMode: args.exchangeMode,
      creditAmount: args.creditAmount,
      isActive: true,
    });

    return { success: true as const, listingId };
  },
});

// Update service listing
export const updateListing = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("serviceListings"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    exchangeMode: v.optional(
      v.union(v.literal("credit"), v.literal("skill_swap"), v.literal("both"))
    ),
    creditAmount: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.userId !== session.userId) return false;

    const updates: Record<string, string | number | boolean> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.exchangeMode !== undefined) updates.exchangeMode = args.exchangeMode;
    if (args.creditAmount !== undefined) updates.creditAmount = args.creditAmount;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.listingId, updates);
    return true;
  },
});

// Delete service listing
export const deleteListing = mutation({
  args: {
    sessionToken: v.string(),
    listingId: v.id("serviceListings"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.userId !== session.userId) return false;

    await ctx.db.delete(args.listingId);
    return true;
  },
});

