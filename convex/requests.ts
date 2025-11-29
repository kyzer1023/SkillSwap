import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Get all open service requests
export const getOpenRequests = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("serviceRequests"),
      _creationTime: v.number(),
      requesterId: v.id("users"),
      requesterName: v.string(),
      title: v.string(),
      description: v.string(),
      skillNeeded: v.string(),
      exchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
      creditAmount: v.optional(v.number()),
      skillOffered: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const requests = await ctx.db
      .query("serviceRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(limit);

    const requestsWithUsers = await Promise.all(
      requests
        .filter((r) => !r.isReported)
        .map(async (request) => {
          const user = await ctx.db.get(request.requesterId);
          return {
            _id: request._id,
            _creationTime: request._creationTime,
            requesterId: request.requesterId,
            requesterName: user?.name ?? "Unknown User",
            title: request.title,
            description: request.description,
            skillNeeded: request.skillNeeded,
            exchangeMode: request.exchangeMode,
            creditAmount: request.creditAmount,
            skillOffered: request.skillOffered,
          };
        })
    );

    return requestsWithUsers;
  },
});

// Get request by ID
export const getRequestById = query({
  args: { requestId: v.id("serviceRequests") },
  returns: v.union(
    v.object({
      _id: v.id("serviceRequests"),
      _creationTime: v.number(),
      requesterId: v.id("users"),
      requesterName: v.string(),
      title: v.string(),
      description: v.string(),
      skillNeeded: v.string(),
      exchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
      creditAmount: v.optional(v.number()),
      skillOffered: v.optional(v.string()),
      status: v.union(
        v.literal("open"),
        v.literal("matched"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      ),
      matchedProviderId: v.optional(v.id("users")),
      matchedProviderName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) return null;

    const requester = await ctx.db.get(request.requesterId);
    let matchedProviderName: string | undefined;

    if (request.matchedProviderId) {
      const provider = await ctx.db.get(request.matchedProviderId);
      matchedProviderName = provider?.name;
    }

    return {
      _id: request._id,
      _creationTime: request._creationTime,
      requesterId: request.requesterId,
      requesterName: requester?.name ?? "Unknown User",
      title: request.title,
      description: request.description,
      skillNeeded: request.skillNeeded,
      exchangeMode: request.exchangeMode,
      creditAmount: request.creditAmount,
      skillOffered: request.skillOffered,
      status: request.status,
      matchedProviderId: request.matchedProviderId,
      matchedProviderName,
    };
  },
});

// Get my requests (as requester)
export const getMyRequests = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("serviceRequests"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      skillNeeded: v.string(),
      exchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
      creditAmount: v.optional(v.number()),
      skillOffered: v.optional(v.string()),
      status: v.union(
        v.literal("open"),
        v.literal("matched"),
        v.literal("in_progress"),
        v.literal("completed"),
        v.literal("cancelled")
      ),
      matchedProviderName: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return [];

    const requests = await ctx.db
      .query("serviceRequests")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", session.userId))
      .order("desc")
      .collect();

    const requestsWithProviders = await Promise.all(
      requests.map(async (request) => {
        let matchedProviderName: string | undefined;
        if (request.matchedProviderId) {
          const provider = await ctx.db.get(request.matchedProviderId);
          matchedProviderName = provider?.name;
        }

        return {
          _id: request._id,
          _creationTime: request._creationTime,
          title: request.title,
          description: request.description,
          skillNeeded: request.skillNeeded,
          exchangeMode: request.exchangeMode,
          creditAmount: request.creditAmount,
          skillOffered: request.skillOffered,
          status: request.status,
          matchedProviderName,
        };
      })
    );

    return requestsWithProviders;
  },
});

// Create service request
export const createRequest = mutation({
  args: {
    sessionToken: v.string(),
    title: v.string(),
    description: v.string(),
    skillNeeded: v.string(),
    exchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
    creditAmount: v.optional(v.number()),
    skillOffered: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.literal(true), requestId: v.id("serviceRequests") }),
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

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return { success: false as const, error: "User not found" };
    }

    // Admins cannot use platform features
    if (user.role === "admin") {
      return { success: false as const, error: "Administrators cannot create service requests" };
    }

    // Validate credit amount if credit mode
    if (args.exchangeMode === "credit") {
      if (!args.creditAmount || args.creditAmount <= 0) {
        return { success: false as const, error: "Credit amount is required" };
      }
      if (user.credits < args.creditAmount) {
        return { success: false as const, error: "Insufficient credits" };
      }
    }

    // Validate skill offered if skill swap mode
    if (args.exchangeMode === "skill_swap" && !args.skillOffered) {
      return {
        success: false as const,
        error: "Skill to offer is required for skill swap",
      };
    }

    const requestId = await ctx.db.insert("serviceRequests", {
      requesterId: session.userId,
      title: args.title,
      description: args.description,
      skillNeeded: args.skillNeeded.toLowerCase(),
      exchangeMode: args.exchangeMode,
      creditAmount: args.creditAmount,
      skillOffered: args.skillOffered?.toLowerCase(),
      status: "open",
      isReported: false,
    });

    // Auto-generate matches
    await generateMatches(ctx, requestId, args.skillNeeded.toLowerCase());

    return { success: true as const, requestId };
  },
});

// Helper function to generate matches
async function generateMatches(
  ctx: { db: { query: Function; insert: Function; get: Function } },
  requestId: Id<"serviceRequests">,
  skillNeeded: string
) {
  // Find users with the required skill
  const matchingSkills = await ctx.db
    .query("skills")
    .withIndex("by_name", (q: { eq: Function }) => q.eq("name", skillNeeded))
    .collect();

  // Calculate match scores and create suggestions
  for (const skill of matchingSkills) {
    // Score based on skill level
    let matchScore = 50;
    if (skill.level === "intermediate") matchScore = 70;
    if (skill.level === "expert") matchScore = 90;

    // Add endorsement bonus
    matchScore += Math.min(skill.endorsements * 2, 10);

    await ctx.db.insert("suggestedMatches", {
      requestId,
      providerId: skill.userId,
      matchScore,
      status: "pending",
    });
  }

  // Send notification to requester if matches were found
  if (matchingSkills.length > 0) {
    const request = await ctx.db.get(requestId);
    if (request) {
      await ctx.db.insert("notifications", {
        userId: request.requesterId,
        type: "match_found",
        title: "Matches Found!",
        message: `We found ${matchingSkills.length} potential provider${matchingSkills.length > 1 ? "s" : ""} for your request.`,
        relatedId: requestId,
        isRead: false,
      });
    }
  }
}

// Refresh matches for a specific request (called when owner views their request)
export const refreshMatchesForRequest = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("serviceRequests"),
  },
  returns: v.object({
    success: v.boolean(),
    newMatchesCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      return { success: false, newMatchesCount: 0 };
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { success: false, newMatchesCount: 0 };
    }

    // Only allow the owner to refresh matches
    if (request.requesterId !== session.userId) {
      return { success: false, newMatchesCount: 0 };
    }

    // Only refresh for open requests
    if (request.status !== "open") {
      return { success: true, newMatchesCount: 0 };
    }

    // Find users with the required skill
    const matchingSkills = await ctx.db
      .query("skills")
      .withIndex("by_name", (q) => q.eq("name", request.skillNeeded))
      .collect();

    // Get existing matches for this request
    const existingMatches = await ctx.db
      .query("suggestedMatches")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .collect();

    const existingProviderIds = new Set(
      existingMatches.map((m) => m.providerId.toString())
    );

    let newMatchesCount = 0;

    // Create new matches for providers not already matched
    for (const skill of matchingSkills) {
      // Skip if already matched or if it's the requester themselves
      if (
        existingProviderIds.has(skill.userId.toString()) ||
        skill.userId === request.requesterId
      ) {
        continue;
      }

      // Calculate match score
      let matchScore = 50;
      if (skill.level === "intermediate") matchScore = 70;
      if (skill.level === "expert") matchScore = 90;
      matchScore += Math.min(skill.endorsements * 2, 10);

      await ctx.db.insert("suggestedMatches", {
        requestId: args.requestId,
        providerId: skill.userId,
        matchScore,
        status: "pending",
      });

      newMatchesCount++;
    }

    // Notify requester if new matches were found
    if (newMatchesCount > 0) {
      await ctx.db.insert("notifications", {
        userId: request.requesterId,
        type: "match_found",
        title: "New Matches Found!",
        message: `We found ${newMatchesCount} new potential provider${newMatchesCount > 1 ? "s" : ""} for "${request.title}".`,
        relatedId: args.requestId,
        isRead: false,
      });
    }

    return { success: true, newMatchesCount };
  },
});

// Update service request
export const updateRequest = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("serviceRequests"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    skillNeeded: v.optional(v.string()),
    exchangeMode: v.optional(v.union(v.literal("credit"), v.literal("skill_swap"))),
    creditAmount: v.optional(v.number()),
    skillOffered: v.optional(v.string()),
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
      return { success: false as const, error: "Invalid or expired session" };
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { success: false as const, error: "Request not found" };
    }

    if (request.requesterId !== session.userId) {
      return { success: false as const, error: "You can only edit your own requests" };
    }

    if (request.status !== "open") {
      return { success: false as const, error: "Can only edit open requests" };
    }

    const updates: Record<string, any> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.skillNeeded !== undefined) updates.skillNeeded = args.skillNeeded.toLowerCase();
    if (args.exchangeMode !== undefined) updates.exchangeMode = args.exchangeMode;
    if (args.creditAmount !== undefined) updates.creditAmount = args.creditAmount;
    if (args.skillOffered !== undefined) updates.skillOffered = args.skillOffered?.toLowerCase();

    // Validate credit amount if credit mode
    if (updates.exchangeMode === "credit" && updates.creditAmount !== undefined && updates.creditAmount <= 0) {
      return { success: false as const, error: "Credit amount must be greater than 0" };
    }

    // Validate skill offered if skill swap mode
    if (updates.exchangeMode === "skill_swap" && !updates.skillOffered) {
      return { success: false as const, error: "Skill to offer is required for skill swap mode" };
    }

    // Check if there's at least one field to update
    if (Object.keys(updates).length === 0) {
      return { success: false as const, error: "No changes to update" };
    }

    await ctx.db.patch(args.requestId, updates);
    return { success: true as const };
  },
});

// Delete/Cancel service request
export const cancelRequest = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("serviceRequests"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const request = await ctx.db.get(args.requestId);
    if (!request || request.requesterId !== session.userId) return false;
    if (request.status !== "open") return false;

    // Delete suggested matches
    const matches = await ctx.db
      .query("suggestedMatches")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .collect();

    for (const match of matches) {
      await ctx.db.delete(match._id);
    }

    await ctx.db.patch(args.requestId, { status: "cancelled" });
    return true;
  },
});

// Get suggested matches for a request
export const getSuggestedMatches = query({
  args: { sessionToken: v.string(), requestId: v.id("serviceRequests") },
  returns: v.array(
    v.object({
      _id: v.id("suggestedMatches"),
      providerId: v.id("users"),
      providerName: v.string(),
      matchScore: v.number(),
      skillLevel: v.union(
        v.literal("beginner"),
        v.literal("intermediate"),
        v.literal("expert")
      ),
      endorsements: v.number(),
      providerRating: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return [];

    const request = await ctx.db.get(args.requestId);
    if (!request || request.requesterId !== session.userId) return [];

    const matches = await ctx.db
      .query("suggestedMatches")
      .withIndex("by_requestId_and_status", (q) =>
        q.eq("requestId", args.requestId).eq("status", "pending")
      )
      .collect();

    const matchesWithDetails = await Promise.all(
      matches.map(async (match) => {
        const provider = await ctx.db.get(match.providerId);

        // Get skill details
        const skills = await ctx.db
          .query("skills")
          .withIndex("by_userId", (q) => q.eq("userId", match.providerId))
          .collect();

        const relevantSkill = skills.find(
          (s) => s.name === request.skillNeeded
        );

        // Get provider rating
        const ratings = await ctx.db
          .query("ratings")
          .withIndex("by_rateeId", (q) => q.eq("rateeId", match.providerId))
          .collect();

        const providerRatings = ratings.filter(
          (r) => r.raterRole === "requester"
        );
        const avgRating =
          providerRatings.length > 0
            ? providerRatings.reduce((sum, r) => sum + r.rating, 0) /
              providerRatings.length
            : 0;

        return {
          _id: match._id,
          providerId: match.providerId,
          providerName: provider?.name ?? "Unknown",
          matchScore: match.matchScore,
          skillLevel: relevantSkill?.level ?? ("beginner" as const),
          endorsements: relevantSkill?.endorsements ?? 0,
          providerRating: avgRating,
        };
      })
    );

    // Sort by match score
    return matchesWithDetails.sort((a, b) => b.matchScore - a.matchScore);
  },
});

// Accept a suggested match
export const acceptMatch = mutation({
  args: {
    sessionToken: v.string(),
    matchId: v.id("suggestedMatches"),
  },
  returns: v.union(
    v.object({ success: v.literal(true), transactionId: v.id("transactions") }),
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

    // Check if user is admin
    const currentUser = await ctx.db.get(session.userId);
    if (currentUser?.role === "admin") {
      return { success: false as const, error: "Administrators cannot participate in exchanges" };
    }

    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "pending") {
      return { success: false as const, error: "Match not found or already processed" };
    }

    const request = await ctx.db.get(match.requestId);
    if (!request || request.requesterId !== session.userId) {
      return { success: false as const, error: "Unauthorized" };
    }

    if (request.status !== "open") {
      return { success: false as const, error: "Request is no longer open" };
    }

    // Update match status
    await ctx.db.patch(args.matchId, { status: "accepted" });

    // Reject other matches
    const otherMatches = await ctx.db
      .query("suggestedMatches")
      .withIndex("by_requestId", (q) => q.eq("requestId", match.requestId))
      .collect();

    for (const otherMatch of otherMatches) {
      if (otherMatch._id !== args.matchId && otherMatch.status === "pending") {
        await ctx.db.patch(otherMatch._id, { status: "rejected" });
      }
    }

    // Update request status
    await ctx.db.patch(match.requestId, {
      status: "matched",
      matchedProviderId: match.providerId,
    });

    // Create transaction
    const transactionId = await ctx.db.insert("transactions", {
      requestId: match.requestId,
      requesterId: session.userId,
      providerId: match.providerId,
      transactionType: request.exchangeMode,
      creditAmount: request.creditAmount,
      skillOffered: request.skillOffered,
      skillReceived: request.skillNeeded,
      status: "pending",
      requesterConfirmed: false,
      providerConfirmed: false,
    });

    // Reserve credits if credit-based
    if (request.exchangeMode === "credit" && request.creditAmount) {
      const user = await ctx.db.get(session.userId);
      if (user) {
        const newBalance = user.credits - request.creditAmount;
        await ctx.db.patch(session.userId, { credits: newBalance });

        await ctx.db.insert("creditHistory", {
          userId: session.userId,
          transactionId,
          amount: -request.creditAmount,
          type: "reserved",
          description: `Reserved for: ${request.title}`,
          balanceAfter: newBalance,
        });
      }
    }

    // Create notification for provider
    await ctx.db.insert("notifications", {
      userId: match.providerId,
      type: "match_accepted",
      title: "You've been matched!",
      message: `Your skills have been matched to a request: ${request.title}`,
      relatedId: transactionId,
      isRead: false,
    });

    return { success: true as const, transactionId };
  },
});

// Reject a suggested match
export const rejectMatch = mutation({
  args: {
    sessionToken: v.string(),
    matchId: v.id("suggestedMatches"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "pending") return false;

    const request = await ctx.db.get(match.requestId);
    if (!request || request.requesterId !== session.userId) return false;

    await ctx.db.patch(args.matchId, { status: "rejected" });
    return true;
  },
});

// Report a request
export const reportRequest = mutation({
  args: {
    sessionToken: v.string(),
    requestId: v.id("serviceRequests"),
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

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return { success: false as const, error: "Request not found" };
    }

    await ctx.db.insert("reports", {
      reporterId: session.userId,
      reportType: "request",
      targetId: args.requestId,
      reason: args.reason,
      status: "pending",
    });

    await ctx.db.patch(args.requestId, { isReported: true });

    return { success: true as const };
  },
});

// Search requests
export const searchRequests = query({
  args: { query: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("serviceRequests"),
      _creationTime: v.number(),
      requesterId: v.id("users"),
      requesterName: v.string(),
      title: v.string(),
      description: v.string(),
      skillNeeded: v.string(),
      exchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
      creditAmount: v.optional(v.number()),
      skillOffered: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const searchTerm = args.query.toLowerCase();

    const requests = await ctx.db
      .query("serviceRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    const filtered = requests.filter(
      (r) =>
        !r.isReported &&
        (r.title.toLowerCase().includes(searchTerm) ||
          r.description.toLowerCase().includes(searchTerm) ||
          r.skillNeeded.toLowerCase().includes(searchTerm))
    );

    const requestsWithUsers = await Promise.all(
      filtered.map(async (request) => {
        const user = await ctx.db.get(request.requesterId);
        return {
          _id: request._id,
          _creationTime: request._creationTime,
          requesterId: request.requesterId,
          requesterName: user?.name ?? "Unknown User",
          title: request.title,
          description: request.description,
          skillNeeded: request.skillNeeded,
          exchangeMode: request.exchangeMode,
          creditAmount: request.creditAmount,
          skillOffered: request.skillOffered,
        };
      })
    );

    return requestsWithUsers;
  },
});

// Send a negotiation/counter-offer
export const sendNegotiation = mutation({
  args: {
    sessionToken: v.string(),
    matchId: v.id("suggestedMatches"),
    proposedExchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
    proposedCredits: v.optional(v.number()),
    proposedSkillOffered: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.literal(true), negotiationId: v.id("negotiations") }),
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

    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "pending") {
      return { success: false as const, error: "Match not found or already processed" };
    }

    const request = await ctx.db.get(match.requestId);
    if (!request) {
      return { success: false as const, error: "Request not found" };
    }

    // Verify user is the requester
    if (request.requesterId !== session.userId) {
      return { success: false as const, error: "Only the requester can send counter-offers" };
    }

    // Check for existing pending negotiation
    const existingNegotiation = await ctx.db
      .query("negotiations")
      .withIndex("by_matchId", (q) => q.eq("matchId", args.matchId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .first();

    if (existingNegotiation) {
      return { success: false as const, error: "A pending negotiation already exists for this match" };
    }

    const negotiationId = await ctx.db.insert("negotiations", {
      requestId: match.requestId,
      matchId: args.matchId,
      requesterId: session.userId,
      providerId: match.providerId,
      initiatorRole: "requester",
      proposedExchangeMode: args.proposedExchangeMode,
      proposedCredits: args.proposedCredits,
      proposedSkillOffered: args.proposedSkillOffered,
      message: args.message,
      status: "pending",
    });

    // Notify the provider - use requestId so they can navigate to the request page
    await ctx.db.insert("notifications", {
      userId: match.providerId,
      type: "negotiation_received",
      title: "Counter-Offer Received",
      message: `You received a counter-offer for: ${request.title}`,
      relatedId: request._id,
      isRead: false,
    });

    return { success: true as const, negotiationId };
  },
});

// Send a counter-offer from provider back to requester
export const sendProviderCounterOffer = mutation({
  args: {
    sessionToken: v.string(),
    negotiationId: v.id("negotiations"),
    proposedExchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
    proposedCredits: v.optional(v.number()),
    proposedSkillOffered: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.literal(true), negotiationId: v.id("negotiations") }),
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

    // Get the original negotiation
    const originalNegotiation = await ctx.db.get(args.negotiationId);
    if (!originalNegotiation || originalNegotiation.status !== "pending") {
      return { success: false as const, error: "Negotiation not found or already processed" };
    }

    // Verify user is the recipient of this negotiation (provider receiving requester's offer)
    if (originalNegotiation.providerId !== session.userId) {
      return { success: false as const, error: "Only the provider can send a counter-offer" };
    }

    // Only allow counter-offer if the original was from requester
    if (originalNegotiation.initiatorRole !== "requester") {
      return { success: false as const, error: "Can only counter-offer to requester's proposal" };
    }

    const request = await ctx.db.get(originalNegotiation.requestId);
    if (!request) {
      return { success: false as const, error: "Request not found" };
    }

    // Mark the original negotiation as rejected (superseded by new counter-offer)
    await ctx.db.patch(args.negotiationId, { status: "rejected" });

    // Create new negotiation from provider
    const newNegotiationId = await ctx.db.insert("negotiations", {
      requestId: originalNegotiation.requestId,
      matchId: originalNegotiation.matchId,
      requesterId: originalNegotiation.requesterId,
      providerId: session.userId,
      initiatorRole: "provider",
      proposedExchangeMode: args.proposedExchangeMode,
      proposedCredits: args.proposedCredits,
      proposedSkillOffered: args.proposedSkillOffered,
      message: args.message,
      status: "pending",
    });

    // Notify the requester
    await ctx.db.insert("notifications", {
      userId: originalNegotiation.requesterId,
      type: "negotiation_received",
      title: "Counter-Offer Received",
      message: `Provider sent a counter-offer for: ${request.title}`,
      relatedId: request._id,
      isRead: false,
    });

    return { success: true as const, negotiationId: newNegotiationId };
  },
});

// Send a counter-offer from requester back to provider (in response to provider's counter)
export const sendRequesterCounterOffer = mutation({
  args: {
    sessionToken: v.string(),
    negotiationId: v.id("negotiations"),
    proposedExchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
    proposedCredits: v.optional(v.number()),
    proposedSkillOffered: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  returns: v.union(
    v.object({ success: v.literal(true), negotiationId: v.id("negotiations") }),
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

    // Get the original negotiation
    const originalNegotiation = await ctx.db.get(args.negotiationId);
    if (!originalNegotiation || originalNegotiation.status !== "pending") {
      return { success: false as const, error: "Negotiation not found or already processed" };
    }

    // Verify user is the requester
    if (originalNegotiation.requesterId !== session.userId) {
      return { success: false as const, error: "Only the requester can send a counter-offer" };
    }

    // Only allow counter-offer if the original was from provider
    if (originalNegotiation.initiatorRole !== "provider") {
      return { success: false as const, error: "Can only counter-offer to provider's proposal" };
    }

    const request = await ctx.db.get(originalNegotiation.requestId);
    if (!request) {
      return { success: false as const, error: "Request not found" };
    }

    // Mark the original negotiation as rejected (superseded by new counter-offer)
    await ctx.db.patch(args.negotiationId, { status: "rejected" });

    // Create new negotiation from requester
    const newNegotiationId = await ctx.db.insert("negotiations", {
      requestId: originalNegotiation.requestId,
      matchId: originalNegotiation.matchId,
      requesterId: session.userId,
      providerId: originalNegotiation.providerId,
      initiatorRole: "requester",
      proposedExchangeMode: args.proposedExchangeMode,
      proposedCredits: args.proposedCredits,
      proposedSkillOffered: args.proposedSkillOffered,
      message: args.message,
      status: "pending",
    });

    // Notify the provider
    await ctx.db.insert("notifications", {
      userId: originalNegotiation.providerId,
      type: "negotiation_received",
      title: "Counter-Offer Received",
      message: `Requester sent a counter-offer for: ${request.title}`,
      relatedId: request._id,
      isRead: false,
    });

    return { success: true as const, negotiationId: newNegotiationId };
  },
});

// Get negotiations for a request where the current user is the recipient
export const getNegotiationsForRequest = query({
  args: {
    sessionToken: v.string(),
    requestId: v.id("serviceRequests"),
  },
  returns: v.array(
    v.object({
      _id: v.id("negotiations"),
      _creationTime: v.number(),
      senderId: v.id("users"),
      senderName: v.string(),
      initiatorRole: v.union(v.literal("requester"), v.literal("provider")),
      proposedExchangeMode: v.union(v.literal("credit"), v.literal("skill_swap")),
      proposedCredits: v.optional(v.number()),
      proposedSkillOffered: v.optional(v.string()),
      message: v.optional(v.string()),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("rejected"),
        v.literal("expired")
      ),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return [];

    const request = await ctx.db.get(args.requestId);
    if (!request) return [];

    const isRequester = request.requesterId === session.userId;

    // Get all negotiations for this request
    const negotiations = await ctx.db
      .query("negotiations")
      .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
      .order("desc")
      .collect();

    // Filter to only show negotiations where the current user is the RECIPIENT
    // If requester sent it (initiatorRole = "requester"), provider should see it
    // If provider sent it (initiatorRole = "provider"), requester should see it
    const relevantNegotiations = negotiations.filter((neg) => {
      if (isRequester && neg.initiatorRole === "provider") {
        // Requester sees negotiations initiated by provider
        return true;
      }
      // Check if current user is the provider in this negotiation
      if (neg.providerId === session.userId && neg.initiatorRole === "requester") {
        // Provider sees negotiations initiated by requester (sent TO them)
        return true;
      }
      return false;
    });

    const negotiationsWithDetails = await Promise.all(
      relevantNegotiations.map(async (neg) => {
        // Get the sender's info (the one who initiated)
        const senderId = neg.initiatorRole === "requester" ? neg.requesterId : neg.providerId;
        const sender = await ctx.db.get(senderId);
        return {
          _id: neg._id,
          _creationTime: neg._creationTime,
          senderId: senderId,
          senderName: sender?.name ?? "Unknown",
          initiatorRole: neg.initiatorRole,
          proposedExchangeMode: neg.proposedExchangeMode,
          proposedCredits: neg.proposedCredits,
          proposedSkillOffered: neg.proposedSkillOffered,
          message: neg.message,
          status: neg.status,
        };
      })
    );

    return negotiationsWithDetails;
  },
});

// Respond to a negotiation (accept or reject)
export const respondToNegotiation = mutation({
  args: {
    sessionToken: v.string(),
    negotiationId: v.id("negotiations"),
    accept: v.boolean(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), transactionId: v.optional(v.id("transactions")) }),
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

    const negotiation = await ctx.db.get(args.negotiationId);
    if (!negotiation || negotiation.status !== "pending") {
      return { success: false as const, error: "Negotiation not found or already processed" };
    }

    const request = await ctx.db.get(negotiation.requestId);
    if (!request) {
      return { success: false as const, error: "Request not found" };
    }

    // Verify user is the RECIPIENT of the negotiation (not the initiator)
    // If requester initiated, provider should respond
    // If provider initiated, requester should respond
    const isRecipient = 
      (negotiation.initiatorRole === "requester" && negotiation.providerId === session.userId) ||
      (negotiation.initiatorRole === "provider" && negotiation.requesterId === session.userId);
    
    if (!isRecipient) {
      return { success: false as const, error: "Only the recipient can respond to this negotiation" };
    }

    if (!args.accept) {
      // Reject the negotiation
      await ctx.db.patch(args.negotiationId, { status: "rejected" });

      // Notify the initiator that their offer was declined
      const initiatorId = negotiation.initiatorRole === "requester" 
        ? negotiation.requesterId 
        : negotiation.providerId;
      
      await ctx.db.insert("notifications", {
        userId: initiatorId,
        type: "system",
        title: "Counter-Offer Declined",
        message: `Your counter-offer for "${request.title}" was declined.`,
        relatedId: negotiation.requestId,
        isRead: false,
      });

      return { success: true as const, transactionId: undefined };
    }

    // Accept the negotiation
    await ctx.db.patch(args.negotiationId, { status: "accepted" });

    // Update the match status
    const match = await ctx.db.get(negotiation.matchId);
    if (match) {
      await ctx.db.patch(negotiation.matchId, { status: "accepted" });

      // Reject other matches
      const otherMatches = await ctx.db
        .query("suggestedMatches")
        .withIndex("by_requestId", (q) => q.eq("requestId", negotiation.requestId))
        .collect();

      for (const otherMatch of otherMatches) {
        if (otherMatch._id !== negotiation.matchId && otherMatch.status === "pending") {
          await ctx.db.patch(otherMatch._id, { status: "rejected" });
        }
      }
    }

    // Update request status
    await ctx.db.patch(negotiation.requestId, {
      status: "matched",
      matchedProviderId: negotiation.providerId,
    });

    // Create transaction with negotiated terms
    // IMPORTANT: Use the correct requester and provider from the negotiation, not session.userId
    const transactionId = await ctx.db.insert("transactions", {
      requestId: negotiation.requestId,
      requesterId: negotiation.requesterId,
      providerId: negotiation.providerId,
      transactionType: negotiation.proposedExchangeMode,
      creditAmount: negotiation.proposedCredits,
      skillOffered: negotiation.proposedSkillOffered,
      skillReceived: request.skillNeeded,
      status: "pending",
      requesterConfirmed: false,
      providerConfirmed: false,
    });

    // Reserve credits if credit-based - credits come from the REQUESTER
    if (negotiation.proposedExchangeMode === "credit" && negotiation.proposedCredits) {
      const requester = await ctx.db.get(negotiation.requesterId);
      if (requester) {
        if (requester.credits < negotiation.proposedCredits) {
          return { success: false as const, error: "Requester has insufficient credits" };
        }

        const newBalance = requester.credits - negotiation.proposedCredits;
        await ctx.db.patch(negotiation.requesterId, { credits: newBalance });

        await ctx.db.insert("creditHistory", {
          userId: negotiation.requesterId,
          transactionId,
          amount: -negotiation.proposedCredits,
          type: "reserved",
          description: `Reserved for: ${request.title}`,
          balanceAfter: newBalance,
        });
      }
    }

    // Notify provider
    await ctx.db.insert("notifications", {
      userId: negotiation.providerId,
      type: "match_accepted",
      title: "Counter-Offer Accepted!",
      message: `Your counter-offer for "${request.title}" was accepted!`,
      relatedId: transactionId,
      isRead: false,
    });

    return { success: true as const, transactionId };
  },
});

