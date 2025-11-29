import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Helper to verify admin session
async function verifyAdmin(
  ctx: { db: { query: Function; get: Function } },
  sessionToken: string
): Promise<boolean> {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: { eq: Function }) => q.eq("token", sessionToken))
    .unique();

  if (!session || session.expiresAt < Date.now()) return false;

  const user = await ctx.db.get(session.userId);
  return user?.role === "admin";
}

// Get system overview stats
export const getSystemOverview = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      totalUsers: v.number(),
      activeUsers: v.number(),
      totalRequests: v.number(),
      openRequests: v.number(),
      completedExchanges: v.number(),
      totalCreditsInCirculation: v.number(),
      pendingReports: v.number(),
      pendingDisputes: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return null;

    const users = await ctx.db.query("users").collect();
    const requests = await ctx.db.query("serviceRequests").collect();
    const transactions = await ctx.db.query("transactions").collect();
    const reports = await ctx.db.query("reports").collect();
    const disputes = await ctx.db.query("disputes").collect();

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.isActive).length,
      totalRequests: requests.length,
      openRequests: requests.filter((r) => r.status === "open").length,
      completedExchanges: transactions.filter((t) => t.status === "completed")
        .length,
      totalCreditsInCirculation: users.reduce((sum, u) => sum + u.credits, 0),
      pendingReports: reports.filter((r) => r.status === "pending").length,
      pendingDisputes: disputes.filter((d) => d.status === "open").length,
    };
  },
});

// Get module analytics
export const getModuleAnalytics = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      profiles: v.object({
        totalProfiles: v.number(),
        profilesWithSkills: v.number(),
        profilesWithPortfolio: v.number(),
        avgSkillsPerUser: v.number(),
      }),
      requests: v.object({
        totalRequests: v.number(),
        byStatus: v.object({
          open: v.number(),
          matched: v.number(),
          inProgress: v.number(),
          completed: v.number(),
          cancelled: v.number(),
        }),
        avgMatchTime: v.number(),
      }),
      transactions: v.object({
        total: v.number(),
        creditBased: v.number(),
        skillSwap: v.number(),
        completionRate: v.number(),
      }),
      ratings: v.object({
        totalRatings: v.number(),
        avgRating: v.number(),
        reportedRatings: v.number(),
      }),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return null;

    const users = await ctx.db.query("users").collect();
    const skills = await ctx.db.query("skills").collect();
    const portfolioItems = await ctx.db.query("portfolioItems").collect();
    const requests = await ctx.db.query("serviceRequests").collect();
    const transactions = await ctx.db.query("transactions").collect();
    const ratings = await ctx.db.query("ratings").collect();

    // Calculate unique users with skills
    const usersWithSkills = new Set(skills.map((s) => s.userId)).size;
    const usersWithPortfolio = new Set(portfolioItems.map((p) => p.userId)).size;

    // Request status breakdown
    const requestsByStatus = {
      open: requests.filter((r) => r.status === "open").length,
      matched: requests.filter((r) => r.status === "matched").length,
      inProgress: requests.filter((r) => r.status === "in_progress").length,
      completed: requests.filter((r) => r.status === "completed").length,
      cancelled: requests.filter((r) => r.status === "cancelled").length,
    };

    // Transaction breakdown
    const creditTransactions = transactions.filter(
      (t) => t.transactionType === "credit"
    );
    const skillSwapTransactions = transactions.filter(
      (t) => t.transactionType === "skill_swap"
    );
    const completedTransactions = transactions.filter(
      (t) => t.status === "completed"
    );

    // Average rating
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    return {
      profiles: {
        totalProfiles: users.length,
        profilesWithSkills: usersWithSkills,
        profilesWithPortfolio: usersWithPortfolio,
        avgSkillsPerUser:
          users.length > 0
            ? Math.round((skills.length / users.length) * 10) / 10
            : 0,
      },
      requests: {
        totalRequests: requests.length,
        byStatus: requestsByStatus,
        avgMatchTime: 0, // Would need timestamps to calculate
      },
      transactions: {
        total: transactions.length,
        creditBased: creditTransactions.length,
        skillSwap: skillSwapTransactions.length,
        completionRate:
          transactions.length > 0
            ? Math.round(
                (completedTransactions.length / transactions.length) * 100
              )
            : 0,
      },
      ratings: {
        totalRatings: ratings.length,
        avgRating: Math.round(avgRating * 10) / 10,
        reportedRatings: ratings.filter((r) => r.isReported).length,
      },
    };
  },
});

// Get pending reports
export const getPendingReports = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("reports"),
      _creationTime: v.number(),
      reporterId: v.id("users"),
      reporterName: v.string(),
      reportType: v.union(
        v.literal("request"),
        v.literal("feedback"),
        v.literal("user"),
        v.literal("transaction")
      ),
      targetId: v.string(),
      reason: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("resolved"),
        v.literal("dismissed")
      ),
    })
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return [];

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    const reportsWithDetails = await Promise.all(
      reports.map(async (report) => {
        const reporter = await ctx.db.get(report.reporterId);
        return {
          _id: report._id,
          _creationTime: report._creationTime,
          reporterId: report.reporterId,
          reporterName: reporter?.name ?? "Unknown",
          reportType: report.reportType,
          targetId: report.targetId,
          reason: report.reason,
          status: report.status,
        };
      })
    );

    return reportsWithDetails;
  },
});

// Resolve report
export const resolveReport = mutation({
  args: {
    sessionToken: v.string(),
    reportId: v.id("reports"),
    action: v.union(v.literal("resolve"), v.literal("dismiss")),
    adminNotes: v.optional(v.string()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const admin = await ctx.db.get(session.userId);
    if (!admin || admin.role !== "admin") return false;

    const report = await ctx.db.get(args.reportId);
    if (!report) return false;

    await ctx.db.patch(args.reportId, {
      status: args.action === "resolve" ? "resolved" : "dismissed",
      adminNotes: args.adminNotes,
      resolvedBy: session.userId,
      resolvedAt: Date.now(),
    });

    // If resolving a request report, remove the request
    if (args.action === "resolve" && report.reportType === "request") {
      // Note: In a real app, you'd want to properly type this
      // For now, we'll just update the report status
    }

    return true;
  },
});

// Get pending disputes
export const getPendingDisputes = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("disputes"),
      _creationTime: v.number(),
      transactionId: v.id("transactions"),
      reporterId: v.id("users"),
      reporterName: v.string(),
      description: v.string(),
      status: v.union(
        v.literal("open"),
        v.literal("under_review"),
        v.literal("resolved"),
        v.literal("dismissed")
      ),
    })
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return [];

    const disputes = await ctx.db
      .query("disputes")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .collect();

    const disputesWithDetails = await Promise.all(
      disputes.map(async (dispute) => {
        const reporter = await ctx.db.get(dispute.reporterId);
        return {
          _id: dispute._id,
          _creationTime: dispute._creationTime,
          transactionId: dispute.transactionId,
          reporterId: dispute.reporterId,
          reporterName: reporter?.name ?? "Unknown",
          description: dispute.description,
          status: dispute.status,
        };
      })
    );

    return disputesWithDetails;
  },
});

// Resolve dispute
export const resolveDispute = mutation({
  args: {
    sessionToken: v.string(),
    disputeId: v.id("disputes"),
    action: v.union(
      v.literal("reverse"),
      v.literal("complete"),
      v.literal("dismiss")
    ),
    resolution: v.string(),
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

    const admin = await ctx.db.get(session.userId);
    if (!admin || admin.role !== "admin") {
      return { success: false as const, error: "Unauthorized" };
    }

    const dispute = await ctx.db.get(args.disputeId);
    if (!dispute) {
      return { success: false as const, error: "Dispute not found" };
    }

    const tx = await ctx.db.get(dispute.transactionId);
    if (!tx) {
      return { success: false as const, error: "Transaction not found" };
    }

    // Update dispute
    await ctx.db.patch(args.disputeId, {
      status: args.action === "dismiss" ? "dismissed" : "resolved",
      resolution: args.resolution,
      resolvedBy: session.userId,
      resolvedAt: Date.now(),
    });

    // Handle transaction based on action
    if (args.action === "reverse") {
      await ctx.db.patch(dispute.transactionId, { status: "reversed" });

      // Refund credits if credit-based
      if (tx.transactionType === "credit" && tx.creditAmount) {
        const requester = await ctx.db.get(tx.requesterId);
        if (requester) {
          const newBalance = requester.credits + tx.creditAmount;
          await ctx.db.patch(tx.requesterId, { credits: newBalance });

          await ctx.db.insert("creditHistory", {
            userId: tx.requesterId,
            transactionId: dispute.transactionId,
            amount: tx.creditAmount,
            type: "adjustment",
            description: "Refund from dispute resolution",
            balanceAfter: newBalance,
          });
        }
      }
    } else if (args.action === "complete") {
      await ctx.db.patch(dispute.transactionId, {
        status: "completed",
        completedAt: Date.now(),
      });

      // Transfer credits if not already done
      if (tx.transactionType === "credit" && tx.creditAmount) {
        const provider = await ctx.db.get(tx.providerId);
        if (provider) {
          const newBalance = provider.credits + tx.creditAmount;
          await ctx.db.patch(tx.providerId, { credits: newBalance });

          await ctx.db.insert("creditHistory", {
            userId: tx.providerId,
            transactionId: dispute.transactionId,
            amount: tx.creditAmount,
            type: "earned",
            description: "Earned from dispute resolution",
            balanceAfter: newBalance,
          });
        }
      }
    }

    // Notify both parties
    await ctx.db.insert("notifications", {
      userId: tx.requesterId,
      type: "dispute_resolved",
      title: "Dispute Resolved",
      message: `Your dispute has been ${args.action === "dismiss" ? "dismissed" : "resolved"}.`,
      relatedId: args.disputeId,
      isRead: false,
    });

    await ctx.db.insert("notifications", {
      userId: tx.providerId,
      type: "dispute_resolved",
      title: "Dispute Resolved",
      message: `A dispute has been ${args.action === "dismiss" ? "dismissed" : "resolved"}.`,
      relatedId: args.disputeId,
      isRead: false,
    });

    return { success: true as const };
  },
});

// Get fraud alerts
export const getFraudAlerts = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("fraudAlerts"),
      _creationTime: v.number(),
      userId: v.id("users"),
      userName: v.string(),
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
    })
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return [];

    const alerts = await ctx.db
      .query("fraudAlerts")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .order("desc")
      .collect();

    const alertsWithDetails = await Promise.all(
      alerts.map(async (alert) => {
        const user = await ctx.db.get(alert.userId);
        return {
          _id: alert._id,
          _creationTime: alert._creationTime,
          userId: alert.userId,
          userName: user?.name ?? "Unknown",
          alertType: alert.alertType,
          description: alert.description,
          severity: alert.severity,
          status: alert.status,
        };
      })
    );

    return alertsWithDetails;
  },
});

// Get activity trends (for charts)
export const getActivityTrends = query({
  args: { sessionToken: v.string(), days: v.optional(v.number()) },
  returns: v.union(
    v.array(
      v.object({
        date: v.string(),
        requests: v.number(),
        transactions: v.number(),
        newUsers: v.number(),
      })
    ),
    v.null()
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return null;

    const days = args.days ?? 30;
    const now = Date.now();
    const startTime = now - days * 24 * 60 * 60 * 1000;

    const requests = await ctx.db.query("serviceRequests").collect();
    const transactions = await ctx.db.query("transactions").collect();
    const users = await ctx.db.query("users").collect();

    // Group by date
    const trends: Record<
      string,
      { requests: number; transactions: number; newUsers: number }
    > = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      trends[dateStr] = { requests: 0, transactions: 0, newUsers: 0 };
    }

    for (const request of requests) {
      if (request._creationTime >= startTime) {
        const dateStr = new Date(request._creationTime)
          .toISOString()
          .split("T")[0];
        if (trends[dateStr]) {
          trends[dateStr].requests++;
        }
      }
    }

    for (const tx of transactions) {
      if (tx._creationTime >= startTime) {
        const dateStr = new Date(tx._creationTime).toISOString().split("T")[0];
        if (trends[dateStr]) {
          trends[dateStr].transactions++;
        }
      }
    }

    for (const user of users) {
      if (user._creationTime >= startTime) {
        const dateStr = new Date(user._creationTime).toISOString().split("T")[0];
        if (trends[dateStr]) {
          trends[dateStr].newUsers++;
        }
      }
    }

    return Object.entries(trends)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Get top skills
export const getTopSkills = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  returns: v.union(
    v.array(
      v.object({
        skill: v.string(),
        providers: v.number(),
        requests: v.number(),
      })
    ),
    v.null()
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return null;

    const limit = args.limit ?? 10;
    const skills = await ctx.db.query("skills").collect();
    const requests = await ctx.db.query("serviceRequests").collect();

    // Count providers per skill
    const skillCounts: Record<string, { providers: number; requests: number }> =
      {};

    for (const skill of skills) {
      const name = skill.name.toLowerCase();
      if (!skillCounts[name]) {
        skillCounts[name] = { providers: 0, requests: 0 };
      }
      skillCounts[name].providers++;
    }

    // Count requests per skill
    for (const request of requests) {
      const name = request.skillNeeded.toLowerCase();
      if (!skillCounts[name]) {
        skillCounts[name] = { providers: 0, requests: 0 };
      }
      skillCounts[name].requests++;
    }

    return Object.entries(skillCounts)
      .map(([skill, data]) => ({ skill, ...data }))
      .sort((a, b) => b.providers + b.requests - (a.providers + a.requests))
      .slice(0, limit);
  },
});

// Get all users for admin management
export const getAllUsers = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.string(),
      email: v.string(),
      role: v.union(v.literal("user"), v.literal("admin")),
      credits: v.number(),
      isActive: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return [];

    const users = await ctx.db.query("users").order("desc").collect();

    return users.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      name: user.name,
      email: user.email,
      role: user.role,
      credits: user.credits,
      isActive: user.isActive,
    }));
  },
});

// Toggle user active status
export const toggleUserStatus = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
    isActive: v.boolean(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const admin = await ctx.db.get(session.userId);
    if (!admin || admin.role !== "admin") return false;

    const user = await ctx.db.get(args.userId);
    if (!user) return false;

    // Cannot deactivate admin accounts
    if (user.role === "admin") return false;

    await ctx.db.patch(args.userId, { isActive: args.isActive });

    // If deactivating, invalidate all their sessions
    if (!args.isActive) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();

      for (const sess of sessions) {
        await ctx.db.delete(sess._id);
      }
    }

    return true;
  },
});

