import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Get user notifications
export const getMyNotifications = query({
  args: { sessionToken: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("notifications"),
      _creationTime: v.number(),
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
        v.literal("system")
      ),
      title: v.string(),
      message: v.string(),
      relatedId: v.optional(v.string()),
      isRead: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return [];

    const limit = args.limit ?? 50;

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", session.userId))
      .order("desc")
      .take(limit);

    return notifications.map((n) => ({
      _id: n._id,
      _creationTime: n._creationTime,
      type: n.type,
      title: n.title,
      message: n.message,
      relatedId: n.relatedId,
      isRead: n.isRead,
    }));
  },
});

// Get unread notification count
export const getUnreadCount = query({
  args: { sessionToken: v.string() },
  returns: v.number(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", session.userId).eq("isRead", false)
      )
      .collect();

    return unread.length;
  },
});

// Mark notification as read
export const markAsRead = mutation({
  args: {
    sessionToken: v.string(),
    notificationId: v.id("notifications"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== session.userId) return false;

    await ctx.db.patch(args.notificationId, { isRead: true });
    return true;
  },
});

// Mark all notifications as read
export const markAllAsRead = mutation({
  args: { sessionToken: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_and_isRead", (q) =>
        q.eq("userId", session.userId).eq("isRead", false)
      )
      .collect();

    for (const notification of unread) {
      await ctx.db.patch(notification._id, { isRead: true });
    }

    return true;
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: {
    sessionToken: v.string(),
    notificationId: v.id("notifications"),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) return false;

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== session.userId) return false;

    await ctx.db.delete(args.notificationId);
    return true;
  },
});

