import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Id } from "../../convex/_generated/dataModel";

interface AuthState {
  sessionToken: string | null;
  userId: Id<"users"> | null;
  role: "user" | "admin" | null;
  setAuth: (token: string, userId: Id<"users">, role: "user" | "admin") => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      sessionToken: null,
      userId: null,
      role: null,
      setAuth: (token, userId, role) =>
        set({ sessionToken: token, userId, role }),
      clearAuth: () => set({ sessionToken: null, userId: null, role: null }),
      isAuthenticated: () => get().sessionToken !== null,
      isAdmin: () => get().role === "admin",
    }),
    {
      name: "skillswap-auth",
    }
  )
);

