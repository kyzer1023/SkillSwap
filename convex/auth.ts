import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Simple hash function for prototype (in production, use bcrypt on server)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// Generate session token
function generateToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Register new user
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      token: v.string(),
      userId: v.id("users"),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (existingUser) {
      return { success: false as const, error: "Email already registered" };
    }

    // Create user
    const passwordHash = simpleHash(args.password);
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      passwordHash,
      name: args.name,
      credits: 100, // Starting credits for new users
      role: "user",
      isActive: true,
    });

    // Add initial credit history
    await ctx.db.insert("creditHistory", {
      userId,
      amount: 100,
      type: "initial",
      description: "Welcome bonus credits",
      balanceAfter: 100,
    });

    // Create session
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId,
      token,
      expiresAt,
    });

    return { success: true as const, token, userId };
  },
});

// Login
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      token: v.string(),
      userId: v.id("users"),
      role: v.union(v.literal("user"), v.literal("admin")),
    }),
    v.object({
      success: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (!user) {
      return { success: false as const, error: "Invalid email or password" };
    }

    if (!user.isActive) {
      return { success: false as const, error: "Account is deactivated" };
    }

    const passwordHash = simpleHash(args.password);
    if (user.passwordHash !== passwordHash) {
      return { success: false as const, error: "Invalid email or password" };
    }

    // Create new session
    const token = generateToken();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt,
    });

    return { success: true as const, token, userId: user._id, role: user.role };
  },
});

// Logout
export const logout = mutation({
  args: { sessionToken: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return true;
  },
});

// Validate session
export const validateSession = query({
  args: { sessionToken: v.string() },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      userId: v.id("users"),
      role: v.union(v.literal("user"), v.literal("admin")),
    }),
    v.object({
      valid: v.literal(false),
    })
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.sessionToken))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      return { valid: false as const };
    }

    const user = await ctx.db.get(session.userId);
    if (!user || !user.isActive) {
      return { valid: false as const };
    }

    return { valid: true as const, userId: user._id, role: user.role };
  },
});

// Change password
export const changePassword = mutation({
  args: {
    sessionToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
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

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return { success: false as const, error: "User not found" };
    }

    const currentHash = simpleHash(args.currentPassword);
    if (user.passwordHash !== currentHash) {
      return { success: false as const, error: "Current password is incorrect" };
    }

    const newHash = simpleHash(args.newPassword);
    await ctx.db.patch(user._id, { passwordHash: newHash });

    return { success: true as const };
  },
});

// Promote user to admin - ONLY works when there are no admins yet (bootstrap)
export const promoteToAdmin = mutation({
  args: {
    email: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({ success: v.literal(false), error: v.string() })
  ),
  handler: async (ctx, args) => {
    // Check if there are any existing admins
    const existingAdmins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    if (existingAdmins.length > 0) {
      return { success: false as const, error: "Admin already exists. Use Convex Dashboard to manage admins." };
    }

    // Find the user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (!user) {
      return { success: false as const, error: "User not found" };
    }

    // Promote to admin
    await ctx.db.patch(user._id, { role: "admin" });

    return { success: true as const };
  },
});
