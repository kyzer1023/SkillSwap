import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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
        v.literal("user")
      ),
      targetId: v.string(),
      targetName: v.string(),
      raterName: v.optional(v.string()),
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
        
        // Resolve targetId to a human-readable name based on reportType
        let targetName = "Unknown";
        let raterName: string | undefined = undefined;
        try {
          if (report.reportType === "user") {
            const targetUser = await ctx.db.get(report.targetId as Id<"users">);
            targetName = targetUser?.name ?? "Unknown User";
          } else if (report.reportType === "request") {
            const targetRequest = await ctx.db.get(report.targetId as Id<"serviceRequests">);
            targetName = targetRequest?.title ?? "Unknown Request";
          } else if (report.reportType === "feedback") {
            const targetRating = await ctx.db.get(report.targetId as Id<"ratings">);
            if (targetRating) {
              const ratee = await ctx.db.get(targetRating.rateeId);
              const rater = await ctx.db.get(targetRating.raterId);
              targetName = `Feedback for ${ratee?.name ?? "Unknown User"}`;
              raterName = rater?.name ?? "Unknown User";
            }
          }
        } catch {
          targetName = "Invalid Reference";
        }
        
        return {
          _id: report._id,
          _creationTime: report._creationTime,
          reporterId: report.reporterId,
          reporterName: reporter?.name ?? "Unknown",
          reportType: report.reportType,
          targetId: report.targetId,
          targetName,
          raterName,
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
    suspendDays: v.optional(v.union(
      v.literal(1),
      v.literal(3),
      v.literal(7),
      v.literal(14),
      v.literal(30)
    )),
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

    // Update report status
    await ctx.db.patch(args.reportId, {
      status: args.action === "resolve" ? "resolved" : "dismissed",
      adminNotes: args.adminNotes,
      resolvedBy: session.userId,
      resolvedAt: Date.now(),
    });

    // Handle actions based on report type when resolving
    if (args.action === "resolve") {
      let targetUserId: Id<"users"> | null = null;

      // Get the target user based on report type
      if (report.reportType === "user") {
        targetUserId = report.targetId as Id<"users">;
      } else if (report.reportType === "request") {
        // Cancel the reported request
        try {
          const request = await ctx.db.get(report.targetId as Id<"serviceRequests">);
          if (request && request.status === "open") {
            await ctx.db.patch(report.targetId as Id<"serviceRequests">, {
              status: "cancelled",
            });
            targetUserId = request.requesterId;
          }
        } catch {
          // Invalid reference, skip
        }
      } else if (report.reportType === "feedback") {
        // Mark feedback as reported (hidden)
        try {
          const rating = await ctx.db.get(report.targetId as Id<"ratings">);
          if (rating) {
            await ctx.db.patch(report.targetId as Id<"ratings">, {
              isReported: true,
            });
            targetUserId = rating.raterId;
          }
        } catch {
          // Invalid reference, skip
        }
      }

      // Apply suspension if requested and we have a target user
      if (args.suspendDays && targetUserId) {
        const suspendedUntil = Date.now() + args.suspendDays * 24 * 60 * 60 * 1000;
        const suspensionReason = args.adminNotes || `Suspended due to ${report.reportType} report violation`;
        
        await ctx.db.patch(targetUserId, {
          suspendedUntil,
          suspensionReason,
        });

        // Notify the suspended user
        const suspendedUser = await ctx.db.get(targetUserId);
        if (suspendedUser) {
          const endDate = new Date(suspendedUntil).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          await ctx.db.insert("notifications", {
            userId: targetUserId,
            type: "suspension",
            title: "Account Suspended",
            message: `Your account has been suspended until ${endDate}. During this time, you cannot create service requests or accept matches. Reason: ${suspensionReason}`,
            relatedId: args.reportId,
            isRead: false,
          });
        }
      }

      // Notify the reporter that their report was actioned
      await ctx.db.insert("notifications", {
        userId: report.reporterId,
        type: "report_resolved",
        title: "Report Resolved",
        message: `Your report has been reviewed and action has been taken. Thank you for helping keep our community safe.`,
        relatedId: args.reportId,
        isRead: false,
      });

      // Log admin action
      const targetUser = targetUserId ? await ctx.db.get(targetUserId) : null;
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: args.suspendDays ? "user_suspended" : "report_resolved",
        targetUserId: targetUserId ?? undefined,
        relatedId: args.reportId,
        details: args.suspendDays 
          ? `Suspended ${targetUser?.name ?? "user"} for ${args.suspendDays} days due to ${report.reportType} report. ${args.adminNotes ?? ""}`
          : `Resolved ${report.reportType} report. ${args.adminNotes ?? ""}`,
        suspendDays: args.suspendDays,
        isUndone: false,
      });
    } else {
      // When dismissing, restore the hidden content
      if (report.reportType === "feedback") {
        // Restore feedback visibility
        try {
          const rating = await ctx.db.get(report.targetId as Id<"ratings">);
          if (rating) {
            await ctx.db.patch(report.targetId as Id<"ratings">, {
              isReported: false,
            });
          }
        } catch {
          // Invalid reference, skip
        }
      } else if (report.reportType === "request") {
        // Restore request visibility
        try {
          const request = await ctx.db.get(report.targetId as Id<"serviceRequests">);
          if (request) {
            await ctx.db.patch(report.targetId as Id<"serviceRequests">, {
              isReported: false,
            });

            // Find and restore any transaction that was paused due to this report
            const transaction = await ctx.db
              .query("transactions")
              .withIndex("by_requestId", (q) => q.eq("requestId", report.targetId as Id<"serviceRequests">))
              .filter((q) => q.eq(q.field("status"), "disputed"))
              .first();

            if (transaction) {
              // Restore transaction to pending (before work started)
              await ctx.db.patch(transaction._id, { status: "pending" });

              // Notify both parties that the transaction can resume
              await ctx.db.insert("notifications", {
                userId: transaction.requesterId,
                type: "system",
                title: "Report Dismissed - Transaction Resumed",
                message: "The report on your request has been dismissed. The transaction can now proceed normally.",
                relatedId: transaction._id,
                isRead: false,
              });

              await ctx.db.insert("notifications", {
                userId: transaction.providerId,
                type: "system",
                title: "Report Dismissed - Transaction Resumed",
                message: "Your report has been dismissed. The transaction has been resumed and you can proceed with accepting or declining.",
                relatedId: transaction._id,
                isRead: false,
              });
            }
          }
        } catch {
          // Invalid reference, skip
        }
      }

      // Notify reporter that their report was dismissed
      await ctx.db.insert("notifications", {
        userId: report.reporterId,
        type: "report_resolved",
        title: "Report Reviewed",
        message: `Your report has been reviewed. After investigation, no action was deemed necessary at this time.`,
        relatedId: args.reportId,
        isRead: false,
      });

      // Log admin action
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: "report_dismissed",
        relatedId: args.reportId,
        details: `Dismissed ${report.reportType} report. ${args.adminNotes ?? ""}`,
        isUndone: false,
      });
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
    if (args.action === "complete") {
      // Mark transaction as completed
      await ctx.db.patch(dispute.transactionId, {
        status: "completed",
        completedAt: Date.now(),
      });

      // Also mark the associated request as completed
      const request = await ctx.db.get(tx.requestId);
      if (request && request.status !== "completed") {
        await ctx.db.patch(tx.requestId, {
          status: "completed",
        });
      }

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
    } else if (args.action === "dismiss") {
      // Restore transaction to in_progress so users can continue from where they left off
      await ctx.db.patch(dispute.transactionId, {
        status: "in_progress",
      });
    }

    // Notify both parties
    await ctx.db.insert("notifications", {
      userId: tx.requesterId,
      type: "dispute_resolved",
      title: args.action === "dismiss" ? "Dispute Dismissed" : "Dispute Resolved",
      message: args.action === "dismiss" 
        ? `Your dispute has been dismissed. The transaction remains active and can be completed normally.`
        : `Your dispute has been resolved and the transaction has been marked as complete.`,
      relatedId: args.disputeId,
      isRead: false,
    });

    await ctx.db.insert("notifications", {
      userId: tx.providerId,
      type: "dispute_resolved",
      title: args.action === "dismiss" ? "Dispute Dismissed" : "Dispute Resolved",
      message: args.action === "dismiss"
        ? `A dispute has been dismissed. The transaction remains active and can be completed normally.`
        : `A dispute has been resolved and the transaction has been marked as complete.`,
      relatedId: args.disputeId,
      isRead: false,
    });

    // Log admin action
    const requester = await ctx.db.get(tx.requesterId);
    const provider = await ctx.db.get(tx.providerId);
    await ctx.db.insert("adminActions", {
      adminId: session.userId,
      actionType: args.action === "dismiss" ? "dispute_dismissed" : "dispute_resolved",
      relatedId: args.disputeId,
      details: `${args.action === "dismiss" ? "Dismissed" : "Completed"} dispute between ${requester?.name ?? "Unknown"} and ${provider?.name ?? "Unknown"}. Resolution: ${args.resolution}`,
      isUndone: false,
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

// Resolve fraud alert
export const resolveFraudAlert = mutation({
  args: {
    sessionToken: v.string(),
    alertId: v.id("fraudAlerts"),
    action: v.union(
      v.literal("resolve"),
      v.literal("dismiss"),
      v.literal("investigate")
    ),
    suspendDays: v.optional(v.union(
      v.literal(1),
      v.literal(3),
      v.literal(7),
      v.literal(14),
      v.literal(30)
    )),
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

    const alert = await ctx.db.get(args.alertId);
    if (!alert) return false;

    let newStatus: "resolved" | "dismissed" | "investigating";
    if (args.action === "resolve") {
      newStatus = "resolved";
    } else if (args.action === "dismiss") {
      newStatus = "dismissed";
    } else {
      newStatus = "investigating";
    }

    await ctx.db.patch(args.alertId, {
      status: newStatus,
      resolvedBy: args.action !== "investigate" ? session.userId : undefined,
      resolvedAt: args.action !== "investigate" ? Date.now() : undefined,
    });

    // Apply suspension if resolving with suspension days
    if (args.action === "resolve" && args.suspendDays) {
      const suspendedUntil = Date.now() + args.suspendDays * 24 * 60 * 60 * 1000;
      const suspensionReason = `Suspended due to fraud alert: ${alert.alertType.replace(/_/g, " ")}`;

      await ctx.db.patch(alert.userId, {
        suspendedUntil,
        suspensionReason,
      });

      // Notify the user about suspension
      const endDate = new Date(suspendedUntil).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      await ctx.db.insert("notifications", {
        userId: alert.userId,
        type: "suspension",
        title: "Account Suspended",
        message: `Your account has been suspended until ${endDate}. During this time, you cannot create service requests or accept matches. Reason: ${suspensionReason}`,
        relatedId: args.alertId,
        isRead: false,
      });
    } else if (args.action === "resolve") {
      // Resolved without suspension - still notify the user
      await ctx.db.insert("notifications", {
        userId: alert.userId,
        type: "system",
        title: "Account Review Complete",
        message: `Your account has been reviewed and cleared. No action is required on your part.`,
        relatedId: args.alertId,
        isRead: false,
      });
    } else if (args.action === "investigate") {
      // Notify user their account is under investigation
      await ctx.db.insert("notifications", {
        userId: alert.userId,
        type: "system",
        title: "Account Under Review",
        message: `Your account is currently under review due to unusual activity. You may continue using the platform normally while we investigate.`,
        relatedId: args.alertId,
        isRead: false,
      });
    }
    // No notification for dismiss - it's a false positive

    // Log admin action
    const flaggedUser = await ctx.db.get(alert.userId);
    let actionType: "fraud_resolved" | "fraud_dismissed" | "fraud_investigating" | "user_suspended";
    if (args.action === "resolve" && args.suspendDays) {
      actionType = "user_suspended";
    } else if (args.action === "resolve") {
      actionType = "fraud_resolved";
    } else if (args.action === "investigate") {
      actionType = "fraud_investigating";
    } else {
      actionType = "fraud_dismissed";
    }

    await ctx.db.insert("adminActions", {
      adminId: session.userId,
      actionType,
      targetUserId: args.suspendDays ? alert.userId : undefined,
      relatedId: args.alertId,
      details: args.suspendDays
        ? `Suspended ${flaggedUser?.name ?? "user"} for ${args.suspendDays} days due to fraud alert: ${alert.alertType.replace(/_/g, " ")}`
        : `${args.action === "resolve" ? "Resolved" : args.action === "investigate" ? "Investigating" : "Dismissed"} fraud alert (${alert.alertType.replace(/_/g, " ")}) for ${flaggedUser?.name ?? "user"}`,
      suspendDays: args.suspendDays,
      isUndone: false,
    });

    return true;
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
      suspendedUntil: v.optional(v.number()),
      suspensionReason: v.optional(v.string()),
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
      suspendedUntil: user.suspendedUntil,
      suspensionReason: user.suspensionReason,
    }));
  },
});

// Pardon user - lift suspension early
export const pardonUser = mutation({
  args: {
    sessionToken: v.string(),
    userId: v.id("users"),
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

    // Check if user is actually suspended
    if (!user.suspendedUntil || user.suspendedUntil <= Date.now()) {
      return false;
    }

    // Lift the suspension
    await ctx.db.patch(args.userId, {
      suspendedUntil: undefined,
      suspensionReason: undefined,
    });

    // Notify the user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "system",
      title: "Suspension Lifted",
      message: "Your account suspension has been lifted early. You can now create service requests and accept matches again.",
      isRead: false,
    });

    // Log admin action
    await ctx.db.insert("adminActions", {
      adminId: session.userId,
      actionType: "user_pardoned",
      targetUserId: args.userId,
      details: `Pardoned ${user.name} - lifted suspension early. Original reason: ${user.suspensionReason ?? "Not specified"}`,
      isUndone: false,
    });

    return true;
  },
});

// Get admin action log
export const getAdminActions = query({
  args: { 
    sessionToken: v.string(),
    limit: v.optional(v.number()),
    showUndone: v.optional(v.boolean()),
  },
  returns: v.array(
    v.object({
      _id: v.id("adminActions"),
      _creationTime: v.number(),
      adminId: v.id("users"),
      adminName: v.string(),
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
      targetUserName: v.optional(v.string()),
      relatedId: v.optional(v.string()),
      details: v.string(),
      suspendDays: v.optional(v.number()),
      isUndone: v.boolean(),
      undoneAt: v.optional(v.number()),
      undoneBy: v.optional(v.id("users")),
      undoneByName: v.optional(v.string()),
      canUndo: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const isAdmin = await verifyAdmin(ctx, args.sessionToken);
    if (!isAdmin) return [];

    const limit = args.limit ?? 100;
    
    let actionsQuery = ctx.db.query("adminActions").order("desc");
    
    const actions = await actionsQuery.take(limit);

    // Filter by undone status if specified
    const filteredActions = args.showUndone === false 
      ? actions.filter(a => !a.isUndone)
      : actions;

    const actionsWithDetails = await Promise.all(
      filteredActions.map(async (action) => {
        const admin = await ctx.db.get(action.adminId);
        let targetUserName: string | undefined;
        let undoneByName: string | undefined;
        
        if (action.targetUserId) {
          const targetUser = await ctx.db.get(action.targetUserId);
          targetUserName = targetUser?.name;
        }
        
        if (action.undoneBy) {
          const undoneByUser = await ctx.db.get(action.undoneBy);
          undoneByName = undoneByUser?.name;
        }

        // Determine if action can be undone
        // All actions can be undone as long as they haven't been undone already
        const canUndo = !action.isUndone;

        return {
          _id: action._id,
          _creationTime: action._creationTime,
          adminId: action.adminId,
          adminName: admin?.name ?? "Unknown Admin",
          actionType: action.actionType,
          targetUserId: action.targetUserId,
          targetUserName,
          relatedId: action.relatedId,
          details: action.details,
          suspendDays: action.suspendDays,
          isUndone: action.isUndone,
          undoneAt: action.undoneAt,
          undoneBy: action.undoneBy,
          undoneByName,
          canUndo,
        };
      })
    );

    return actionsWithDetails;
  },
});

// Undo admin action
export const undoAdminAction = mutation({
  args: {
    sessionToken: v.string(),
    actionId: v.id("adminActions"),
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

    const action = await ctx.db.get(args.actionId);
    if (!action) {
      return { success: false as const, error: "Action not found" };
    }

    if (action.isUndone) {
      return { success: false as const, error: "Action already undone" };
    }

    // Handle undo based on action type
    if (action.actionType === "user_suspended" && action.targetUserId) {
      // Undo suspension = pardon
      const user = await ctx.db.get(action.targetUserId);
      if (!user) {
        return { success: false as const, error: "User not found" };
      }

      await ctx.db.patch(action.targetUserId, {
        suspendedUntil: undefined,
        suspensionReason: undefined,
      });

      // Notify user
      await ctx.db.insert("notifications", {
        userId: action.targetUserId,
        type: "system",
        title: "Suspension Lifted",
        message: "Your account suspension has been lifted. You can now create service requests and accept matches again.",
        isRead: false,
      });

      // Log the undo as a new action
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: "user_pardoned",
        targetUserId: action.targetUserId,
        relatedId: action._id,
        details: `Undid suspension for ${user.name} (original action ID: ${action._id})`,
        isUndone: false,
      });
    } else if (action.actionType === "user_pardoned" && action.targetUserId) {
      // Undo pardon = re-suspend (restore original suspension)
      // We can't easily restore the original suspension duration, so we'll skip this
      return { success: false as const, error: "Cannot undo a pardon - please suspend the user again manually if needed" };
    } else if (action.actionType === "user_activated" && action.targetUserId) {
      // Undo activation = deactivate
      const user = await ctx.db.get(action.targetUserId);
      if (!user || user.role === "admin") {
        return { success: false as const, error: "Cannot deactivate this user" };
      }

      await ctx.db.patch(action.targetUserId, { isActive: false });

      // Invalidate sessions
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_userId", (q) => q.eq("userId", action.targetUserId!))
        .collect();
      for (const sess of sessions) {
        await ctx.db.delete(sess._id);
      }

      // Log the undo
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: "user_deactivated",
        targetUserId: action.targetUserId,
        relatedId: action._id,
        details: `Undid activation for ${user.name} (original action ID: ${action._id})`,
        isUndone: false,
      });
    } else if (action.actionType === "user_deactivated" && action.targetUserId) {
      // Undo deactivation = activate
      const user = await ctx.db.get(action.targetUserId);
      if (!user) {
        return { success: false as const, error: "User not found" };
      }

      await ctx.db.patch(action.targetUserId, { isActive: true });

      // Log the undo
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: "user_activated",
        targetUserId: action.targetUserId,
        relatedId: action._id,
        details: `Undid deactivation for ${user.name} (original action ID: ${action._id})`,
        isUndone: false,
      });
    } else if (action.actionType === "report_resolved" || action.actionType === "report_dismissed") {
      // Undo report resolution = reopen the report
      if (action.relatedId) {
        try {
          const reportId = action.relatedId as Id<"reports">;
          const report = await ctx.db.get(reportId);
          if (report) {
            await ctx.db.patch(reportId, {
              status: "pending",
              adminNotes: undefined,
              resolvedBy: undefined,
              resolvedAt: undefined,
            });
          }
        } catch {
          // Report may have been deleted
        }
      }
      
      // Log the undo
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: action.actionType === "report_resolved" ? "report_dismissed" : "report_resolved",
        relatedId: action.relatedId,
        details: `Undid ${action.actionType === "report_resolved" ? "resolution" : "dismissal"} of report - report reopened`,
        isUndone: false,
      });
    } else if (action.actionType === "dispute_resolved" || action.actionType === "dispute_dismissed") {
      // Undo dispute resolution = reopen the dispute
      if (action.relatedId) {
        try {
          const disputeId = action.relatedId as Id<"disputes">;
          const dispute = await ctx.db.get(disputeId);
          if (dispute) {
            await ctx.db.patch(disputeId, {
              status: "open",
              resolution: undefined,
              resolvedBy: undefined,
              resolvedAt: undefined,
            });
          }
        } catch {
          // Dispute may have been deleted
        }
      }
      
      // Log the undo
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: action.actionType === "dispute_resolved" ? "dispute_dismissed" : "dispute_resolved",
        relatedId: action.relatedId,
        details: `Undid ${action.actionType === "dispute_resolved" ? "resolution" : "dismissal"} of dispute - dispute reopened`,
        isUndone: false,
      });
    } else if (action.actionType === "fraud_resolved" || action.actionType === "fraud_dismissed" || action.actionType === "fraud_investigating") {
      // Undo fraud alert action = reopen the alert
      if (action.relatedId) {
        try {
          const alertId = action.relatedId as Id<"fraudAlerts">;
          const alert = await ctx.db.get(alertId);
          if (alert) {
            await ctx.db.patch(alertId, {
              status: "pending",
              resolvedBy: undefined,
              resolvedAt: undefined,
            });
          }
        } catch {
          // Alert may have been deleted
        }
      }
      
      // Log the undo
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: "fraud_dismissed",
        relatedId: action.relatedId,
        details: `Undid fraud alert action - alert reopened to pending`,
        isUndone: false,
      });
    } else {
      // For any other action types, just mark as undone without side effects
      await ctx.db.insert("adminActions", {
        adminId: session.userId,
        actionType: action.actionType,
        relatedId: action.relatedId,
        targetUserId: action.targetUserId,
        details: `Undid action: ${action.details}`,
        isUndone: false,
      });
    }

    // Mark original action as undone
    await ctx.db.patch(args.actionId, {
      isUndone: true,
      undoneAt: Date.now(),
      undoneBy: session.userId,
    });

    return { success: true as const };
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

    // Log admin action
    await ctx.db.insert("adminActions", {
      adminId: session.userId,
      actionType: args.isActive ? "user_activated" : "user_deactivated",
      targetUserId: args.userId,
      details: `${args.isActive ? "Activated" : "Deactivated"} user account for ${user.name}`,
      isUndone: false,
    });

    return true;
  },
});

