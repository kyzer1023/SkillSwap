import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get ratings for a user
export const getUserRatings = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("ratings"),
      _creationTime: v.number(),
      raterId: v.id("users"),
      raterName: v.string(),
      raterRole: v.union(v.literal("requester"), v.literal("provider")),
      rating: v.number(),
      comment: v.optional(v.string()),
      response: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_rateeId", (q) => q.eq("rateeId", args.userId))
      .order("desc")
      .collect();

    const ratingsWithDetails = await Promise.all(
      ratings
        .filter((r) => !r.isReported)
        .map(async (rating) => {
          const rater = await ctx.db.get(rating.raterId);
          return {
            _id: rating._id,
            _creationTime: rating._creationTime,
            raterId: rating.raterId,
            raterName: rater?.name ?? "Unknown User",
            raterRole: rating.raterRole,
            rating: rating.rating,
            comment: rating.comment,
            response: rating.response,
          };
        })
    );

    return ratingsWithDetails;
  },
});

// Get my received ratings
export const getMyReceivedRatings = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("ratings"),
      _creationTime: v.number(),
      transactionId: v.id("transactions"),
      raterId: v.id("users"),
      raterName: v.string(),
      raterRole: v.union(v.literal("requester"), v.literal("provider")),
      rating: v.number(),
      comment: v.optional(v.string()),
      response: v.optional(v.string()),
      canRespond: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return [];

    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_rateeId", (q) => q.eq("rateeId", session.userId))
      .order("desc")
      .collect();

    const ratingsWithDetails = await Promise.all(
      ratings.map(async (rating) => {
        const rater = await ctx.db.get(rating.raterId);
        return {
          _id: rating._id,
          _creationTime: rating._creationTime,
          transactionId: rating.transactionId,
          raterId: rating.raterId,
          raterName: rater?.name ?? "Unknown User",
          raterRole: rating.raterRole,
          rating: rating.rating,
          comment: rating.comment,
          response: rating.response,
          canRespond: !rating.response && rating.comment !== undefined,
        };
      })
    );

    return ratingsWithDetails;
  },
});

// Check if user can rate a transaction
export const canRateTransaction = query({
  args: { sessionToken: v.string(), transactionId: v.id("transactions") },
  returns: v.object({
    canRate: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      return { canRate: false, reason: "Invalid session" };
    }

    const tx = await ctx.db.get(args.transactionId);
    if (!tx) {
      return { canRate: false, reason: "Transaction not found" };
    }

    // Verify user is part of transaction
    if (tx.requesterId !== session.userId && tx.providerId !== session.userId) {
      return { canRate: false, reason: "Not part of this transaction" };
    }

    // Check if transaction is completed
    if (tx.status !== "completed") {
      return { canRate: false, reason: "Transaction not completed" };
    }

    // Check if already rated
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_transactionId", (q) =>
        q.eq("transactionId", args.transactionId)
      )
      .collect();

    const alreadyRated = existingRating.some(
      (r) => r.raterId === session.userId
    );

    if (alreadyRated) {
      return { canRate: false, reason: "Already rated" };
    }

    return { canRate: true };
  },
});

// Submit rating
export const submitRating = mutation({
  args: {
    sessionToken: v.string(),
    transactionId: v.id("transactions"),
    rating: v.number(),
    comment: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.literal(true), ratingId: v.id("ratings") }),
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

    const tx = await ctx.db.get(args.transactionId);
    if (!tx) {
      return { success: false as const, error: "Transaction not found" };
    }

    // Verify user is part of transaction
    const isRequester = tx.requesterId === session.userId;
    const isProvider = tx.providerId === session.userId;

    if (!isRequester && !isProvider) {
      return { success: false as const, error: "Unauthorized" };
    }

    if (tx.status !== "completed") {
      return { success: false as const, error: "Transaction not completed" };
    }

    // Check if already rated - if so, update instead of inserting
    const existingRatings = await ctx.db
      .query("ratings")
      .withIndex("by_transactionId", (q) =>
        q.eq("transactionId", args.transactionId)
      )
      .collect();

    const existingRating = existingRatings.find(
      (r) => r.raterId === session.userId
    );

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      return { success: false as const, error: "Rating must be between 1 and 5" };
    }

    const rateeId = isRequester ? tx.providerId : tx.requesterId;
    const raterRole = isRequester ? "requester" : "provider";

    // If already rated, update the existing rating
    if (existingRating) {
      await ctx.db.patch(existingRating._id, {
        rating: args.rating,
        comment: args.comment,
      });

      return { success: true as const, ratingId: existingRating._id };
    }
    // Insert new rating

    const ratingId = await ctx.db.insert("ratings", {
      transactionId: args.transactionId,
      raterId: session.userId,
      rateeId,
      raterRole,
      rating: args.rating,
      comment: args.comment,
      isReported: false,
    });

    // Notify the rated user
    await ctx.db.insert("notifications", {
      userId: rateeId,
      type: "rating_received",
      title: "New Rating Received",
      message: `You received a ${args.rating}-star rating!`,
      relatedId: ratingId,
      isRead: false,
    });

    return { success: true as const, ratingId };
  },
});

// Respond to rating
export const respondToRating = mutation({
  args: {
    sessionToken: v.string(),
    ratingId: v.id("ratings"),
    response: v.string(),
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

    const rating = await ctx.db.get(args.ratingId);
    if (!rating) {
      return { success: false as const, error: "Rating not found" };
    }

    // Verify user is the ratee
    if (rating.rateeId !== session.userId) {
      return { success: false as const, error: "Unauthorized" };
    }

    // Check if already responded
    if (rating.response) {
      return { success: false as const, error: "Already responded" };
    }

    await ctx.db.patch(args.ratingId, { response: args.response });

    return { success: true as const };
  },
});

// Report rating
export const reportRating = mutation({
  args: {
    sessionToken: v.string(),
    ratingId: v.id("ratings"),
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

    const rating = await ctx.db.get(args.ratingId);
    if (!rating) {
      return { success: false as const, error: "Rating not found" };
    }

    // Verify user is the ratee
    if (rating.rateeId !== session.userId) {
      return { success: false as const, error: "Can only report ratings about yourself" };
    }

    await ctx.db.insert("reports", {
      reporterId: session.userId,
      reportType: "feedback",
      targetId: args.ratingId,
      reason: args.reason,
      status: "pending",
    });

    await ctx.db.patch(args.ratingId, { isReported: true });

    return { success: true as const };
  },
});

// Get reputation summary
export const getReputationSummary = query({
  args: { userId: v.id("users") },
  returns: v.object({
    providerRating: v.number(),
    requesterRating: v.number(),
    totalProviderRatings: v.number(),
    totalRequesterRatings: v.number(),
    completedAsProvider: v.number(),
    completedAsRequester: v.number(),
  }),
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_rateeId", (q) => q.eq("rateeId", args.userId))
      .collect();

    const providerRatings = ratings.filter((r) => r.raterRole === "requester");
    const requesterRatings = ratings.filter((r) => r.raterRole === "provider");

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

    // Get completed transactions
    const asProvider = await ctx.db
      .query("transactions")
      .withIndex("by_providerId", (q) => q.eq("providerId", args.userId))
      .collect();

    const asRequester = await ctx.db
      .query("transactions")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", args.userId))
      .collect();

    return {
      providerRating: Math.round(providerRating * 10) / 10,
      requesterRating: Math.round(requesterRating * 10) / 10,
      totalProviderRatings: providerRatings.length,
      totalRequesterRatings: requesterRatings.length,
      completedAsProvider: asProvider.filter((t) => t.status === "completed")
        .length,
      completedAsRequester: asRequester.filter((t) => t.status === "completed")
        .length,
    };
  },
});

