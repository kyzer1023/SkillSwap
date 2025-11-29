import { v } from "convex/values";
import { query } from "./_generated/server";

// Get personal contribution analytics (UC5004)
export const getMyAnalytics = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      completedExchanges: v.number(),
      creditsEarned: v.number(),
      creditsSpent: v.number(),
      currentBalance: v.number(),
      providerRating: v.number(),
      requesterRating: v.number(),
      totalRatingsReceived: v.number(),
      skillsCount: v.number(),
      endorsementsReceived: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    const user = await ctx.db.get(session.userId);
    if (!user) return null;

    // Get transactions
    const asProvider = await ctx.db
      .query("transactions")
      .withIndex("by_providerId", (q) => q.eq("providerId", session.userId))
      .collect();

    const asRequester = await ctx.db
      .query("transactions")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", session.userId))
      .collect();

    const completedAsProvider = asProvider.filter(
      (t) => t.status === "completed"
    );
    const completedAsRequester = asRequester.filter(
      (t) => t.status === "completed"
    );

    // Calculate credits earned/spent
    const creditHistory = await ctx.db
      .query("creditHistory")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .collect();

    const creditsEarned = creditHistory
      .filter((h) => h.type === "earned" || h.type === "initial")
      .reduce((sum, h) => sum + h.amount, 0);

    const creditsSpent = creditHistory
      .filter((h) => h.type === "spent" || h.type === "reserved")
      .reduce((sum, h) => sum + Math.abs(h.amount), 0);

    // Get ratings
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_rateeId", (q) => q.eq("rateeId", session.userId))
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

    // Get skills and endorsements
    const skills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .collect();

    const totalEndorsements = skills.reduce((sum, s) => sum + s.endorsements, 0);

    return {
      completedExchanges: completedAsProvider.length + completedAsRequester.length,
      creditsEarned,
      creditsSpent,
      currentBalance: user.credits,
      providerRating: Math.round(providerRating * 10) / 10,
      requesterRating: Math.round(requesterRating * 10) / 10,
      totalRatingsReceived: ratings.length,
      skillsCount: skills.length,
      endorsementsReceived: totalEndorsements,
    };
  },
});

// Get request activity insights (UC5005)
export const getRequestInsights = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      totalRequests: v.number(),
      completedRequests: v.number(),
      openRequests: v.number(),
      cancelledRequests: v.number(),
      completionRate: v.number(),
      totalCreditsSpent: v.number(),
      avgResponseTime: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    const requests = await ctx.db
      .query("serviceRequests")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", session.userId))
      .collect();

    const completed = requests.filter((r) => r.status === "completed");
    const open = requests.filter((r) => r.status === "open");
    const cancelled = requests.filter((r) => r.status === "cancelled");

    // Get credit transactions for requests
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", session.userId))
      .collect();

    const completedCreditTransactions = transactions.filter(
      (t) => t.status === "completed" && t.transactionType === "credit"
    );

    const totalCreditsSpent = completedCreditTransactions.reduce(
      (sum, t) => sum + (t.creditAmount ?? 0),
      0
    );

    // Exclude cancelled requests from completion rate calculation
    const relevantRequests = requests.filter((r) => r.status !== "cancelled");

    return {
      totalRequests: requests.length,
      completedRequests: completed.length,
      openRequests: open.length,
      cancelledRequests: cancelled.length,
      completionRate:
        relevantRequests.length > 0
          ? Math.round((completed.length / relevantRequests.length) * 100)
          : 0,
      totalCreditsSpent,
    };
  },
});

// Compare with community average (UC5006)
export const getCommunityComparison = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      user: v.object({
        completedExchanges: v.number(),
        avgRating: v.number(),
        skillsCount: v.number(),
      }),
      community: v.object({
        avgCompletedExchanges: v.number(),
        avgRating: v.number(),
        avgSkillsCount: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    // User stats
    const userTransactionsAsProvider = await ctx.db
      .query("transactions")
      .withIndex("by_providerId", (q) => q.eq("providerId", session.userId))
      .collect();

    const userTransactionsAsRequester = await ctx.db
      .query("transactions")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", session.userId))
      .collect();

    const userCompletedExchanges =
      userTransactionsAsProvider.filter((t) => t.status === "completed").length +
      userTransactionsAsRequester.filter((t) => t.status === "completed").length;

    const userRatings = await ctx.db
      .query("ratings")
      .withIndex("by_rateeId", (q) => q.eq("rateeId", session.userId))
      .collect();

    const userAvgRating =
      userRatings.length > 0
        ? userRatings.reduce((sum, r) => sum + r.rating, 0) / userRatings.length
        : 0;

    const userSkills = await ctx.db
      .query("skills")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .collect();

    // Community stats
    const allUsers = await ctx.db.query("users").collect();
    const activeUsers = allUsers.filter((u) => u.isActive);
    const allTransactions = await ctx.db.query("transactions").collect();
    const completedTransactions = allTransactions.filter(
      (t) => t.status === "completed"
    );
    const allRatings = await ctx.db.query("ratings").collect();
    const allSkills = await ctx.db.query("skills").collect();

    const communityAvgExchanges =
      activeUsers.length > 0
        ? completedTransactions.length / activeUsers.length
        : 0;

    const communityAvgRating =
      allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        : 0;

    const communityAvgSkills =
      activeUsers.length > 0 ? allSkills.length / activeUsers.length : 0;

    return {
      user: {
        completedExchanges: userCompletedExchanges,
        avgRating: Math.round(userAvgRating * 10) / 10,
        skillsCount: userSkills.length,
      },
      community: {
        avgCompletedExchanges: Math.round(communityAvgExchanges * 10) / 10,
        avgRating: Math.round(communityAvgRating * 10) / 10,
        avgSkillsCount: Math.round(communityAvgSkills * 10) / 10,
      },
    };
  },
});

// Get service history (UC5007)
export const getServiceHistory = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("transactions"),
      _creationTime: v.number(),
      completedAt: v.optional(v.number()),
      requestTitle: v.string(),
      skillUsed: v.optional(v.string()),
      role: v.union(v.literal("provider"), v.literal("requester")),
      rating: v.optional(v.number()),
      feedback: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return [];

    // Get completed transactions as provider
    const asProvider = await ctx.db
      .query("transactions")
      .withIndex("by_providerId", (q) => q.eq("providerId", session.userId))
      .collect();

    // Get completed transactions as requester
    const asRequester = await ctx.db
      .query("transactions")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", session.userId))
      .collect();

    const completedTransactions = [
      ...asProvider
        .filter((t) => t.status === "completed")
        .map((t) => ({ ...t, role: "provider" as const })),
      ...asRequester
        .filter((t) => t.status === "completed")
        .map((t) => ({ ...t, role: "requester" as const })),
    ];

    const historyWithDetails = await Promise.all(
      completedTransactions.map(async (tx) => {
        const request = await ctx.db.get(tx.requestId);

        // Get rating for this transaction
        const ratings = await ctx.db
          .query("ratings")
          .withIndex("by_transactionId", (q) =>
            q.eq("transactionId", tx._id)
          )
          .collect();

        // Find rating given TO this user
        const receivedRating = ratings.find(
          (r) => r.rateeId === session.userId
        );

        return {
          _id: tx._id,
          _creationTime: tx._creationTime,
          completedAt: tx.completedAt,
          requestTitle: request?.title ?? "Unknown Request",
          skillUsed: tx.role === "provider" ? tx.skillReceived : tx.skillOffered,
          role: tx.role,
          rating: receivedRating?.rating,
          feedback: receivedRating?.comment,
        };
      })
    );

    // Sort by completion date descending
    return historyWithDetails.sort(
      (a, b) => (b.completedAt ?? b._creationTime) - (a.completedAt ?? a._creationTime)
    );
  },
});

