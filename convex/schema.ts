import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - core user information
  users: defineTable({
    email: v.string(),
    passwordHash: v.string(),
    name: v.string(),
    bio: v.optional(v.string()),
    profilePicture: v.optional(v.id("_storage")),
    credits: v.number(),
    role: v.union(v.literal("user"), v.literal("admin")),
    isActive: v.boolean(),
    // Suspension fields for disciplinary action
    suspendedUntil: v.optional(v.number()), // Timestamp when suspension ends
    suspensionReason: v.optional(v.string()), // Reason for suspension
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Skills table - user skills with expertise levels
  skills: defineTable({
    userId: v.id("users"),
    name: v.string(),
    level: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("expert")
    ),
    endorsements: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"])
    .index("by_name_and_level", ["name", "level"]),

  // Portfolio items - images/documents showcasing work
  portfolioItems: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    fileId: v.id("_storage"),
    fileType: v.union(v.literal("image"), v.literal("document")),
  }).index("by_userId", ["userId"]),

  // Service listings - services offered by providers
  serviceListings: defineTable({
    userId: v.id("users"),
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
    .index("by_userId", ["userId"])
    .index("by_skillRequired", ["skillRequired"])
    .index("by_isActive", ["isActive"]),

  // External links - LinkedIn, GitHub, etc.
  externalLinks: defineTable({
    userId: v.id("users"),
    platform: v.string(),
    url: v.string(),
  }).index("by_userId", ["userId"]),

  // Service requests - requests posted by users seeking services
  serviceRequests: defineTable({
    requesterId: v.id("users"),
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
    isReported: v.boolean(),
  })
    .index("by_requesterId", ["requesterId"])
    .index("by_status", ["status"])
    .index("by_skillNeeded", ["skillNeeded"])
    .index("by_matchedProviderId", ["matchedProviderId"]),

  // Suggested matches - system-generated matches for requests
  suggestedMatches: defineTable({
    requestId: v.id("serviceRequests"),
    providerId: v.id("users"),
    matchScore: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
  })
    .index("by_requestId", ["requestId"])
    .index("by_providerId", ["providerId"])
    .index("by_requestId_and_status", ["requestId", "status"]),

  // Negotiations - counter-offers for service requests
  negotiations: defineTable({
    requestId: v.id("serviceRequests"),
    matchId: v.id("suggestedMatches"),
    requesterId: v.id("users"),
    providerId: v.id("users"),
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
    .index("by_requestId", ["requestId"])
    .index("by_matchId", ["matchId"])
    .index("by_providerId", ["providerId"])
    .index("by_requesterId", ["requesterId"])
    .index("by_status", ["status"]),

  // Transactions - both skill-swap and credit-based exchanges
  transactions: defineTable({
    requestId: v.id("serviceRequests"),
    requesterId: v.id("users"),
    providerId: v.id("users"),
    transactionType: v.union(v.literal("credit"), v.literal("skill_swap")),
    creditAmount: v.optional(v.number()),
    skillOffered: v.optional(v.string()),
    skillReceived: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("disputed"),
      v.literal("cancelled"),
      v.literal("reversed")
    ),
    requesterConfirmed: v.boolean(),
    providerConfirmed: v.boolean(),
    completedAt: v.optional(v.number()),
  })
    .index("by_requesterId", ["requesterId"])
    .index("by_providerId", ["providerId"])
    .index("by_status", ["status"])
    .index("by_requestId", ["requestId"]),

  // Credit history - tracking all credit movements
  creditHistory: defineTable({
    userId: v.id("users"),
    transactionId: v.optional(v.id("transactions")),
    amount: v.number(),
    type: v.union(
      v.literal("earned"),
      v.literal("spent"),
      v.literal("reserved"),
      v.literal("released"),
      v.literal("initial"),
      v.literal("adjustment")
    ),
    description: v.string(),
    balanceAfter: v.number(),
  }).index("by_userId", ["userId"]),

  // Ratings - feedback from both parties
  ratings: defineTable({
    transactionId: v.id("transactions"),
    raterId: v.id("users"),
    rateeId: v.id("users"),
    raterRole: v.union(v.literal("requester"), v.literal("provider")),
    rating: v.number(),
    comment: v.optional(v.string()),
    response: v.optional(v.string()),
    isReported: v.boolean(),
  })
    .index("by_rateeId", ["rateeId"])
    .index("by_raterId", ["raterId"])
    .index("by_transactionId", ["transactionId"]),

  // Skill endorsements - tracking who endorsed which skills
  skillEndorsements: defineTable({
    skillId: v.id("skills"),
    endorserId: v.id("users"),
    transactionId: v.id("transactions"),
  })
    .index("by_skillId", ["skillId"])
    .index("by_endorserId", ["endorserId"]),

  // Reports - for requests, feedback, and other content
  reports: defineTable({
    reporterId: v.id("users"),
    reportType: v.union(
      v.literal("request"),
      v.literal("feedback"),
      v.literal("user")
    ),
    targetId: v.string(),
    reason: v.string(),
    evidence: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    adminNotes: v.optional(v.string()),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_reportType", ["reportType"])
    .index("by_reporterId", ["reporterId"]),

  // Disputes - for transaction disputes
  disputes: defineTable({
    transactionId: v.id("transactions"),
    reporterId: v.id("users"),
    description: v.string(),
    evidence: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("open"),
      v.literal("under_review"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    resolution: v.optional(v.string()),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_transactionId", ["transactionId"])
    .index("by_status", ["status"])
    .index("by_reporterId", ["reporterId"]),

  // Notifications - user notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("match_found"),
      v.literal("match_accepted"),
      v.literal("match_rejected"),
      v.literal("transaction_started"),
      v.literal("transaction_completed"),
      v.literal("rating_received"),
      v.literal("dispute_opened"),
      v.literal("dispute_resolved"),
      v.literal("credit_received"),
      v.literal("negotiation_received"),
      v.literal("suspension"), // User account suspended
      v.literal("report_resolved"), // Reporter notified their report was actioned
      v.literal("system")
    ),
    title: v.string(),
    message: v.string(),
    relatedId: v.optional(v.string()),
    isRead: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_isRead", ["userId", "isRead"]),

  // Fraud alerts - for admin monitoring
  fraudAlerts: defineTable({
    userId: v.id("users"),
    alertType: v.union(
      v.literal("unusual_volume"),
      v.literal("repeated_transfers"),
      v.literal("suspicious_pattern")
    ),
    description: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    status: v.union(
      v.literal("pending"),
      v.literal("investigating"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    resolvedBy: v.optional(v.id("users")),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_userId", ["userId"])
    .index("by_severity", ["severity"]),

  // Sessions - for authentication
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_userId", ["userId"]),

  // Admin actions - tracking all admin moderation actions
  adminActions: defineTable({
    adminId: v.id("users"),
    actionType: v.union(
      v.literal("report_resolved"),
      v.literal("report_dismissed"),
      v.literal("dispute_resolved"),
      v.literal("dispute_dismissed"),
      v.literal("fraud_resolved"),
      v.literal("fraud_dismissed"),
      v.literal("fraud_investigating"),
      v.literal("user_suspended"),
      v.literal("user_pardoned"),
      v.literal("user_activated"),
      v.literal("user_deactivated")
    ),
    targetUserId: v.optional(v.id("users")),
    relatedId: v.optional(v.string()), // Report ID, Dispute ID, Fraud Alert ID
    details: v.string(),
    suspendDays: v.optional(v.number()),
    isUndone: v.boolean(),
    undoneAt: v.optional(v.number()),
    undoneBy: v.optional(v.id("users")),
  })
    .index("by_adminId", ["adminId"])
    .index("by_targetUserId", ["targetUserId"])
    .index("by_actionType", ["actionType"])
    .index("by_isUndone", ["isUndone"]),
});
