import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";

// Auth Pages
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";

// Main Pages
import { HomePage } from "@/pages/HomePage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/profile/ProfilePage";
import { EditProfilePage } from "@/pages/profile/EditProfilePage";
import { ViewProfilePage } from "@/pages/profile/ViewProfilePage";

// Request Pages
import { BrowseRequestsPage } from "@/pages/requests/BrowseRequestsPage";
import { CreateRequestPage } from "@/pages/requests/CreateRequestPage";
import { MyRequestsPage } from "@/pages/requests/MyRequestsPage";
import { RequestDetailPage } from "@/pages/requests/RequestDetailPage";

// Transaction Pages
import { TransactionsPage } from "@/pages/transactions/TransactionsPage";
import { TransactionDetailPage } from "@/pages/transactions/TransactionDetailPage";
import { CreditsPage } from "@/pages/transactions/CreditsPage";

// Service Listings
import { ServiceListingsPage } from "@/pages/services/ServiceListingsPage";
import { MyServicesPage } from "@/pages/services/MyServicesPage";

// Analytics
import { MyAnalyticsPage } from "@/pages/analytics/MyAnalyticsPage";

// Admin Pages
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminReportsPage } from "@/pages/admin/AdminReportsPage";
import { AdminDisputesPage } from "@/pages/admin/AdminDisputesPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminFraudAlertsPage } from "@/pages/admin/AdminFraudAlertsPage";
import { AdminActivityLogPage } from "@/pages/admin/AdminActivityLogPage";

// Legal Pages
import { TermsAndConditionsPage } from "@/pages/legal/TermsAndConditionsPage";
import { PrivacyPolicyPage } from "@/pages/legal/PrivacyPolicyPage";

// User-only Route Component (excludes admins from user features)
function UserRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const isAdmin = useAuthStore((state) => state.isAdmin());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Admins cannot access user features - redirect to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

// Admin-only Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const isAdmin = useAuthStore((state) => state.isAdmin());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* User-only Routes (regular users, NOT admins) */}
      <Route
        element={
          <UserRoute>
            <MainLayout />
          </UserRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Profile Routes */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/edit" element={<EditProfilePage />} />
        <Route path="/users/:userId" element={<ViewProfilePage />} />

        {/* Request Routes */}
        <Route path="/requests" element={<BrowseRequestsPage />} />
        <Route path="/requests/new" element={<CreateRequestPage />} />
        <Route path="/requests/my" element={<MyRequestsPage />} />
        <Route path="/requests/:requestId" element={<RequestDetailPage />} />

        {/* Transaction Routes */}
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/:transactionId" element={<TransactionDetailPage />} />
        <Route path="/credits" element={<CreditsPage />} />

        {/* Service Listings */}
        <Route path="/services" element={<ServiceListingsPage />} />
        <Route path="/services/my" element={<MyServicesPage />} />

        {/* Analytics */}
        <Route path="/analytics" element={<MyAnalyticsPage />} />
      </Route>

      {/* Admin-only Routes (with dedicated AdminLayout) */}
      <Route
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/reports" element={<AdminReportsPage />} />
        <Route path="/admin/disputes" element={<AdminDisputesPage />} />
        <Route path="/admin/fraud-alerts" element={<AdminFraudAlertsPage />} />
        <Route path="/admin/activity-log" element={<AdminActivityLogPage />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
