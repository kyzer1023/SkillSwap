import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Shield,
  FileText,
  LogOut,
  AlertTriangle,
  BarChart3,
  Users,
  Menu,
  X,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionToken, clearAuth } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser, {
    sessionToken: sessionToken ?? undefined,
  });

  const profilePictureUrl = useQuery(api.users.getProfilePictureUrl, {
    storageId: currentUser?.profilePicture,
  });

  const overview = useQuery(api.admin.getSystemOverview, {
    sessionToken: sessionToken ?? "",
  });

  const fraudAlerts = useQuery(api.admin.getFraudAlerts, {
    sessionToken: sessionToken ?? "",
  });

  const logout = useMutation(api.auth.logout);

  const handleLogout = async () => {
    if (sessionToken) {
      await logout({ sessionToken });
    }
    clearAuth();
    navigate("/");
  };

  const adminNavItems = [
    { path: "/admin", label: "Dashboard", icon: BarChart3 },
    { path: "/admin/users", label: "Users", icon: Users },
    { path: "/admin/reports", label: "Reports", icon: FileText },
    { path: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
    { path: "/admin/fraud-alerts", label: "Fraud Alerts", icon: ShieldAlert },
  ];

  const pendingFraudAlerts = fraudAlerts?.length ?? 0;
  const pendingItems = (overview?.pendingReports ?? 0) + (overview?.pendingDisputes ?? 0) + pendingFraudAlerts;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/admin" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="hidden font-semibold sm:inline-block">
              SkillSwap Admin
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {adminNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {item.path === "/admin/reports" && (overview?.pendingReports ?? 0) > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {overview?.pendingReports}
                    </Badge>
                  )}
                  {item.path === "/admin/disputes" && (overview?.pendingDisputes ?? 0) > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {overview?.pendingDisputes}
                    </Badge>
                  )}
                  {item.path === "/admin/fraud-alerts" && pendingFraudAlerts > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                      {pendingFraudAlerts}
                    </Badge>
                  )}
                </Button>
              </Link>
            ))}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Pending Items Badge */}
            {pendingItems > 0 && (
              <Badge variant="destructive" className="cursor-default">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {pendingItems} pending
              </Badge>
            )}

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profilePictureUrl ?? undefined} />
                    <AvatarFallback className="bg-amber-600 text-white">
                      {currentUser?.name?.charAt(0).toUpperCase() ?? "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {currentUser?.name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {currentUser?.email}
                    </p>
                    <Badge variant="outline" className="w-fit mt-1">
                      <Shield className="mr-1 h-3 w-3" />
                      Administrator
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t bg-background p-4">
            <div className="flex flex-col gap-2">
              {adminNavItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={
                      location.pathname === item.path ? "secondary" : "ghost"
                    }
                    className="w-full justify-start gap-2"
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {item.path === "/admin/reports" && (overview?.pendingReports ?? 0) > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {overview?.pendingReports}
                      </Badge>
                    )}
                    {item.path === "/admin/disputes" && (overview?.pendingDisputes ?? 0) > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {overview?.pendingDisputes}
                      </Badge>
                    )}
                    {item.path === "/admin/fraud-alerts" && pendingFraudAlerts > 0 && (
                      <Badge variant="destructive" className="ml-auto">
                        {pendingFraudAlerts}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="container py-6 flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0 max-h-32">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            <Shield className="inline h-4 w-4 mr-1" />
            SkillSwap Administration Panel
          </p>
          <p className="text-center text-sm text-muted-foreground md:text-right">
            SkillSwap Network &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

