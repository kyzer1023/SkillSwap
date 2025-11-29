import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

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

const crons = cronJobs();

// Run background matching every 15 minutes
crons.interval(
  "find new matches for open requests",
  { minutes: 15 },
  internal.crons.findNewMatchesForOpenRequests,
  {}
);

export default crons;

