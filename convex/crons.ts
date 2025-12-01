import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Internal mutation to find new matches for open requests
export const findNewMatchesForOpenRequests = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Get all open requests
    const openRequests = await ctx.db
      .query("serviceRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    for (const request of openRequests) {
      // Find users with the required skill
      const matchingSkills = await ctx.db
        .query("skills")
        .withIndex("by_name", (q) => q.eq("name", request.skillNeeded))
        .collect();

      // Get existing matches for this request
      const existingMatches = await ctx.db
        .query("suggestedMatches")
        .withIndex("by_requestId", (q) => q.eq("requestId", request._id))
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
          requestId: request._id,
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
          relatedId: request._id,
          isRead: false,
        });
      }
    }

    return null;
  },
});

// Internal mutation to detect abnormal credit activity (UC5003)
export const detectAbnormalCreditActivity = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Get all transactions from the last 24 hours
    const recentTransactions = await ctx.db
      .query("transactions")
      .order("desc")
      .collect();

    const last24hTransactions = recentTransactions.filter(
      (t) => t._creationTime >= oneDayAgo
    );

    // Track user transaction patterns
    const userTransactionCounts: Record<string, { count: number; volume: number; partners: Set<string> }> = {};

    for (const tx of last24hTransactions) {
      // Track requester activity
      const requesterId = tx.requesterId.toString();
      if (!userTransactionCounts[requesterId]) {
        userTransactionCounts[requesterId] = { count: 0, volume: 0, partners: new Set() };
      }
      userTransactionCounts[requesterId].count++;
      userTransactionCounts[requesterId].volume += tx.creditAmount ?? 0;
      userTransactionCounts[requesterId].partners.add(tx.providerId.toString());

      // Track provider activity
      const providerId = tx.providerId.toString();
      if (!userTransactionCounts[providerId]) {
        userTransactionCounts[providerId] = { count: 0, volume: 0, partners: new Set() };
      }
      userTransactionCounts[providerId].count++;
      userTransactionCounts[providerId].volume += tx.creditAmount ?? 0;
      userTransactionCounts[providerId].partners.add(tx.requesterId.toString());
    }

    // Detect unusual patterns
    for (const [userIdStr, data] of Object.entries(userTransactionCounts)) {
      const userId = userIdStr as Id<"users">;

      // Check if alert already exists for this user
      const existingAlert = await ctx.db
        .query("fraudAlerts")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .order("desc")
        .first();

      // Skip if there's a pending/investigating alert from the last 24 hours
      if (
        existingAlert &&
        (existingAlert.status === "pending" || existingAlert.status === "investigating") &&
        existingAlert._creationTime >= oneDayAgo
      ) {
        continue;
      }

      // Pattern 1: Unusual volume (more than 10 transactions in 24 hours)
      if (data.count > 10) {
        await ctx.db.insert("fraudAlerts", {
          userId,
          alertType: "unusual_volume",
          description: `User has ${data.count} transactions in the last 24 hours, which is unusually high.`,
          severity: data.count > 20 ? "high" : "medium",
          status: "pending",
        });

        // Notify admins
        const admins = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .collect();

        for (const admin of admins) {
          await ctx.db.insert("notifications", {
            userId: admin._id,
            type: "system",
            title: "Fraud Alert: Unusual Volume",
            message: `A user has ${data.count} transactions in 24 hours. Please review.`,
            relatedId: userId,
            isRead: false,
          });
        }
        continue;
      }

      // Pattern 2: Repeated transfers between same users (more than 3 with same partner)
      const partnerTransactionCounts: Record<string, number> = {};
      for (const tx of last24hTransactions) {
        if (tx.requesterId.toString() === userIdStr) {
          const partner = tx.providerId.toString();
          partnerTransactionCounts[partner] = (partnerTransactionCounts[partner] ?? 0) + 1;
        }
        if (tx.providerId.toString() === userIdStr) {
          const partner = tx.requesterId.toString();
          partnerTransactionCounts[partner] = (partnerTransactionCounts[partner] ?? 0) + 1;
        }
      }

      for (const [, count] of Object.entries(partnerTransactionCounts)) {
        if (count > 3) {
          await ctx.db.insert("fraudAlerts", {
            userId,
            alertType: "repeated_transfers",
            description: `User has ${count} transactions with the same partner in 24 hours, suggesting possible credit manipulation.`,
            severity: count > 5 ? "high" : "medium",
            status: "pending",
          });

          // Notify admins
          const admins = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "admin"))
            .collect();

          for (const admin of admins) {
            await ctx.db.insert("notifications", {
              userId: admin._id,
              type: "system",
              title: "Fraud Alert: Repeated Transfers",
              message: `Suspicious repeated transactions detected between users. Please review.`,
              relatedId: userId,
              isRead: false,
            });
          }
          break;
        }
      }

      // Pattern 3: Suspicious pattern (high volume with low partner diversity)
      if (data.count >= 5 && data.partners.size <= 2 && data.volume > 100) {
        await ctx.db.insert("fraudAlerts", {
          userId,
          alertType: "suspicious_pattern",
          description: `User has ${data.count} transactions totaling ${data.volume} credits with only ${data.partners.size} partner(s), suggesting possible collusion.`,
          severity: "high",
          status: "pending",
        });

        // Notify admins
        const admins = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .collect();

        for (const admin of admins) {
          await ctx.db.insert("notifications", {
            userId: admin._id,
            type: "system",
            title: "Fraud Alert: Suspicious Pattern",
            message: `Suspicious transaction pattern detected. Please review immediately.`,
            relatedId: userId,
            isRead: false,
          });
        }
      }
    }

    return null;
  },
});

const crons = cronJobs();

// Run background matching every 15 minutes
crons.interval(
  "find new matches for open requests",
  { minutes: 15 },
  internal.crons.findNewMatchesForOpenRequests,
  {}
);

// Run fraud detection every hour
crons.interval(
  "detect abnormal credit activity",
  { hours: 1 },
  internal.crons.detectAbnormalCreditActivity,
  {}
);

export default crons;

