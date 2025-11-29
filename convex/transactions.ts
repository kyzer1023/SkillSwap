import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user's transactions
export const getMyTransactions = query({
  args: { sessionToken: v.string() },
  returns: v.array(
    v.object({
      _id: v.id("transactions"),
      _creationTime: v.number(),
      requestId: v.id("serviceRequests"),
      requestTitle: v.string(),
      otherPartyId: v.id("users"),
      otherPartyName: v.string(),
      myRole: v.union(v.literal("requester"), v.literal("provider")),
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
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return [];

    // Get transactions as requester
    const asRequester = await ctx.db
      .query("transactions")
      .withIndex("by_requesterId", (q) => q.eq("requesterId", session.userId))
      .collect();

    // Get transactions as provider
    const asProvider = await ctx.db
      .query("transactions")
      .withIndex("by_providerId", (q) => q.eq("providerId", session.userId))
      .collect();

    const allTransactions = [...asRequester, ...asProvider];

    const transactionsWithDetails = await Promise.all(
      allTransactions.map(async (tx) => {
        const request = await ctx.db.get(tx.requestId);
        const isRequester = tx.requesterId === session.userId;
        const otherPartyId = isRequester ? tx.providerId : tx.requesterId;
        const otherParty = await ctx.db.get(otherPartyId);

        return {
          _id: tx._id,
          _creationTime: tx._creationTime,
          requestId: tx.requestId,
          requestTitle: request?.title ?? "Unknown Request",
          otherPartyId,
          otherPartyName: otherParty?.name ?? "Unknown User",
          myRole: isRequester ? ("requester" as const) : ("provider" as const),
          transactionType: tx.transactionType,
          creditAmount: tx.creditAmount,
          skillOffered: tx.skillOffered,
          skillReceived: tx.skillReceived,
          status: tx.status,
          requesterConfirmed: tx.requesterConfirmed,
          providerConfirmed: tx.providerConfirmed,
          completedAt: tx.completedAt,
        };
      })
    );

    // Sort by creation time descending
    return transactionsWithDetails.sort(
      (a, b) => b._creationTime - a._creationTime
    );
  },
});

// Get transaction by ID
export const getTransactionById = query({
  args: { sessionToken: v.string(), transactionId: v.id("transactions") },
  returns: v.union(
    v.object({
      _id: v.id("transactions"),
      _creationTime: v.number(),
      requestId: v.id("serviceRequests"),
      requestTitle: v.string(),
      requestDescription: v.string(),
      requesterId: v.id("users"),
      requesterName: v.string(),
      providerId: v.id("users"),
      providerName: v.string(),
      myRole: v.union(v.literal("requester"), v.literal("provider")),
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
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return null;

    const tx = await ctx.db.get(args.transactionId);
    if (!tx) return null;

    // Verify user is part of transaction
    if (tx.requesterId !== session.userId && tx.providerId !== session.userId) {
      return null;
    }

    const request = await ctx.db.get(tx.requestId);
    const requester = await ctx.db.get(tx.requesterId);
    const provider = await ctx.db.get(tx.providerId);

    return {
      _id: tx._id,
      _creationTime: tx._creationTime,
      requestId: tx.requestId,
      requestTitle: request?.title ?? "Unknown Request",
      requestDescription: request?.description ?? "",
      requesterId: tx.requesterId,
      requesterName: requester?.name ?? "Unknown User",
      providerId: tx.providerId,
      providerName: provider?.name ?? "Unknown User",
      myRole:
        tx.requesterId === session.userId
          ? ("requester" as const)
          : ("provider" as const),
      transactionType: tx.transactionType,
      creditAmount: tx.creditAmount,
      skillOffered: tx.skillOffered,
      skillReceived: tx.skillReceived,
      status: tx.status,
      requesterConfirmed: tx.requesterConfirmed,
      providerConfirmed: tx.providerConfirmed,
      completedAt: tx.completedAt,
    };
  },
});

// Start transaction (provider accepts)
export const startTransaction = mutation({
  args: {
    sessionToken: v.string(),
    transactionId: v.id("transactions"),
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

    // Check if user is admin - admins cannot participate in transactions
    const currentUser = await ctx.db.get(session.userId);
    if (currentUser?.role === "admin") {
      return { success: false as const, error: "Administrators cannot participate in transactions" };
    }

    const tx = await ctx.db.get(args.transactionId);
    if (!tx || tx.providerId !== session.userId) {
      return { success: false as const, error: "Unauthorized" };
    }

    if (tx.status !== "pending") {
      return { success: false as const, error: "Transaction already started" };
    }

    await ctx.db.patch(args.transactionId, { status: "in_progress" });

    // Update request status
    await ctx.db.patch(tx.requestId, { status: "in_progress" });

    // Notify requester
    await ctx.db.insert("notifications", {
      userId: tx.requesterId,
      type: "transaction_started",
      title: "Transaction Started",
      message: "The service provider has started working on your request.",
      relatedId: args.transactionId,
      isRead: false,
    });

    return { success: true as const };
  },
});

// Confirm completion (both parties must confirm)
export const confirmCompletion = mutation({
  args: {
    sessionToken: v.string(),
    transactionId: v.id("transactions"),
  },
  returns: v.union(
    v.object({ success: v.literal(true), completed: v.boolean() }),
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

    // Check if user is admin - admins cannot participate in transactions
    const currentUser = await ctx.db.get(session.userId);
    if (currentUser?.role === "admin") {
      return { success: false as const, error: "Administrators cannot participate in transactions" };
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

    if (tx.status !== "in_progress") {
      return { success: false as const, error: "Transaction not in progress" };
    }

    // Update confirmation
    if (isRequester) {
      await ctx.db.patch(args.transactionId, { requesterConfirmed: true });
    } else {
      await ctx.db.patch(args.transactionId, { providerConfirmed: true });
    }

    // Check if both confirmed
    const updatedTx = await ctx.db.get(args.transactionId);
    if (!updatedTx) {
      return { success: false as const, error: "Transaction not found" };
    }

    if (updatedTx.requesterConfirmed && updatedTx.providerConfirmed) {
      // Complete the transaction
      await ctx.db.patch(args.transactionId, {
        status: "completed",
        completedAt: Date.now(),
      });

      // Update request status
      await ctx.db.patch(tx.requestId, { status: "completed" });

      // Transfer credits if credit-based
      if (tx.transactionType === "credit" && tx.creditAmount) {
        const provider = await ctx.db.get(tx.providerId);
        if (provider) {
          const newBalance = provider.credits + tx.creditAmount;
          await ctx.db.patch(tx.providerId, { credits: newBalance });

          await ctx.db.insert("creditHistory", {
            userId: tx.providerId,
            transactionId: args.transactionId,
            amount: tx.creditAmount,
            type: "earned",
            description: `Earned from completed service`,
            balanceAfter: newBalance,
          });
        }
      }

      // Notify both parties
      await ctx.db.insert("notifications", {
        userId: tx.requesterId,
        type: "transaction_completed",
        title: "Transaction Completed",
        message: "Your transaction has been completed! Don't forget to leave a rating.",
        relatedId: args.transactionId,
        isRead: false,
      });

      await ctx.db.insert("notifications", {
        userId: tx.providerId,
        type: "transaction_completed",
        title: "Transaction Completed",
        message: "The transaction has been completed! Credits have been transferred.",
        relatedId: args.transactionId,
        isRead: false,
      });

      return { success: true as const, completed: true };
    }

    return { success: true as const, completed: false };
  },
});

// Cancel transaction
export const cancelTransaction = mutation({
  args: {
    sessionToken: v.string(),
    transactionId: v.id("transactions"),
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

    const tx = await ctx.db.get(args.transactionId);
    if (!tx) {
      return { success: false as const, error: "Transaction not found" };
    }

    // Only requester can cancel, and only if pending
    if (tx.requesterId !== session.userId) {
      return { success: false as const, error: "Only requester can cancel" };
    }

    if (tx.status !== "pending") {
      return { success: false as const, error: "Can only cancel pending transactions" };
    }

    await ctx.db.patch(args.transactionId, { status: "cancelled" });
    await ctx.db.patch(tx.requestId, { status: "cancelled" });

    // Refund reserved credits
    if (tx.transactionType === "credit" && tx.creditAmount) {
      const requester = await ctx.db.get(tx.requesterId);
      if (requester) {
        const newBalance = requester.credits + tx.creditAmount;
        await ctx.db.patch(tx.requesterId, { credits: newBalance });

        await ctx.db.insert("creditHistory", {
          userId: tx.requesterId,
          transactionId: args.transactionId,
          amount: tx.creditAmount,
          type: "released",
          description: "Refund for cancelled transaction",
          balanceAfter: newBalance,
        });
      }
    }

    // Notify provider
    await ctx.db.insert("notifications", {
      userId: tx.providerId,
      type: "system",
      title: "Transaction Cancelled",
      message: "A transaction you were part of has been cancelled.",
      relatedId: args.transactionId,
      isRead: false,
    });

    return { success: true as const };
  },
});

// Get credit balance and history
export const getCreditInfo = query({
  args: { sessionToken: v.string() },
  returns: v.object({
    balance: v.number(),
    history: v.array(
      v.object({
        _id: v.id("creditHistory"),
        _creationTime: v.number(),
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
      })
    ),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      return { balance: 0, history: [] };
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return { balance: 0, history: [] };
    }

    const history = await ctx.db
      .query("creditHistory")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .order("desc")
      .take(50);

    return {
      balance: user.credits,
      history: history.map((h) => ({
        _id: h._id,
        _creationTime: h._creationTime,
        amount: h.amount,
        type: h.type,
        description: h.description,
        balanceAfter: h.balanceAfter,
      })),
    };
  },
});

// Report dispute
export const reportDispute = mutation({
  args: {
    sessionToken: v.string(),
    transactionId: v.id("transactions"),
    description: v.string(),
    evidence: v.optional(v.id("_storage")),
  },
  returns: v.union(
    v.object({ success: v.literal(true), disputeId: v.id("disputes") }),
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
    if (tx.requesterId !== session.userId && tx.providerId !== session.userId) {
      return { success: false as const, error: "Unauthorized" };
    }

    // Check if dispute already exists
    const existingDispute = await ctx.db
      .query("disputes")
      .withIndex("by_transactionId", (q) =>
        q.eq("transactionId", args.transactionId)
      )
      .first();

    if (existingDispute) {
      return { success: false as const, error: "Dispute already exists" };
    }

    const disputeId = await ctx.db.insert("disputes", {
      transactionId: args.transactionId,
      reporterId: session.userId,
      description: args.description,
      evidence: args.evidence,
      status: "open",
    });

    await ctx.db.patch(args.transactionId, { status: "disputed" });

    return { success: true as const, disputeId };
  },
});

// Open dispute (alias for reportDispute with simpler interface)
export const openDispute = mutation({
  args: {
    sessionToken: v.string(),
    transactionId: v.id("transactions"),
    description: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), disputeId: v.id("disputes") }),
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
    if (tx.requesterId !== session.userId && tx.providerId !== session.userId) {
      return { success: false as const, error: "Unauthorized" };
    }

    // Can only dispute pending or in_progress transactions
    if (tx.status !== "pending" && tx.status !== "in_progress") {
      return { success: false as const, error: "Cannot dispute this transaction" };
    }

    // Check if dispute already exists
    const existingDispute = await ctx.db
      .query("disputes")
      .withIndex("by_transactionId", (q) =>
        q.eq("transactionId", args.transactionId)
      )
      .first();

    if (existingDispute) {
      return { success: false as const, error: "A dispute has already been opened for this transaction" };
    }

    const disputeId = await ctx.db.insert("disputes", {
      transactionId: args.transactionId,
      reporterId: session.userId,
      description: args.description,
      status: "open",
    });

    await ctx.db.patch(args.transactionId, { status: "disputed" });

    // Notify the other party
    const otherPartyId = tx.requesterId === session.userId ? tx.providerId : tx.requesterId;
    await ctx.db.insert("notifications", {
      userId: otherPartyId,
      type: "dispute_opened",
      title: "Dispute Opened",
      message: "A dispute has been opened for a transaction you're involved in.",
      relatedId: disputeId,
      isRead: false,
    });

    return { success: true as const, disputeId };
  },
});

