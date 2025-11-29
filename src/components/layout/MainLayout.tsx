import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
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
  Home,
  Search,
  FileText,
  CreditCard,
  User,
  Settings,
  LogOut,
  Bell,
  BarChart3,
  Briefcase,
  Shield,
  Menu,
  X,
  Check,
  CheckCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionToken, clearAuth, isAdmin } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentUser = useQuery(api.users.getCurrentUser, {
    sessionToken: sessionToken ?? undefined,
  });

  const unreadCount = useQuery(api.notifications.getUnreadCount, {
    sessionToken: sessionToken ?? "",
  });

  const profilePictureUrl = useQuery(api.users.getProfilePictureUrl, {
    storageId: currentUser?.profilePicture,
  });

  const notifications = useQuery(api.notifications.getMyNotifications, {
    sessionToken: sessionToken ?? "",
    limit: 10,
  });

  const logout = useMutation(api.auth.logout);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const handleMarkAsRead = async (notificationId: Id<"notifications">) => {
    if (!sessionToken) return;
    await markAsRead({ sessionToken, notificationId });
  };

  const handleMarkAllAsRead = async () => {
    if (!sessionToken) return;
    await markAllAsRead({ sessionToken });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "match_found":
        return "🎯";
      case "match_accepted":
        return "✅";
      case "match_rejected":
        return "❌";
      case "transaction_started":
        return "🚀";
      case "transaction_completed":
        return "🎉";
      case "rating_received":
        return "⭐";
      case "dispute_opened":
        return "⚠️";
      case "dispute_resolved":
        return "✔️";
      case "credit_received":
        return "💰";
      case "negotiation_received":
        return "🔄";
      default:
        return "📢";
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      await logout({ sessionToken });
    }
    clearAuth();
    navigate("/");
  };

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/requests", label: "Browse Requests", icon: Search },
    { path: "/requests/my", label: "My Requests", icon: FileText },
    { path: "/services", label: "Services", icon: Briefcase },
    { path: "/transactions", label: "Transactions", icon: CreditCard },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
  ];

  const adminNavItems = [
    { path: "/admin", label: "Admin Dashboard", icon: Shield },
    { path: "/admin/reports", label: "Reports", icon: FileText },
    { path: "/admin/disputes", label: "Disputes", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <span className="hidden font-semibold sm:inline-block">
              SkillSwap
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={location.pathname === item.path ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            {isAdmin() && (
              <>
                <div className="mx-2 h-6 w-px bg-border" />
                {adminNavItems.map((item) => (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={
                        location.pathname === item.path ? "secondary" : "ghost"
                      }
                      size="sm"
                      className="gap-2"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Credits Badge */}
            <Link to="/credits">
              <Badge variant="secondary" className="cursor-pointer">
                <CreditCard className="mr-1 h-3 w-3" />
                {currentUser?.credits ?? 0} credits
              </Badge>
            </Link>

            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount && unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 text-xs"
                      onClick={handleMarkAllAsRead}
                    >
                      <CheckCheck className="mr-1 h-3 w-3" />
                      Mark all read
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <ScrollArea className="h-[300px]">
                  {notifications && notifications.length > 0 ? (
                    notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification._id}
                        className={cn(
                          "flex flex-col items-start gap-1 p-3 cursor-pointer",
                          !notification.isRead && "bg-muted/50"
                        )}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead(notification._id);
                          }
                          if (notification.relatedId) {
                            const type = notification.type;
                            if (type === "match_found") {
                              navigate(`/requests/my`);
                            } else if (
                              type === "transaction_started" ||
                              type === "transaction_completed"
                            ) {
                              navigate(`/transactions/${notification.relatedId}`);
                            } else if (type === "rating_received") {
                              navigate("/profile");
                            } else if (type === "negotiation_received") {
                              navigate(`/requests/${notification.relatedId}`);
                            } else {
                              navigate("/transactions");
                            }
                          }
                        }}
                      >
                        <div className="flex items-start gap-2 w-full">
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {new Date(notification._creationTime).toLocaleDateString()}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification._id);
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No notifications yet
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profilePictureUrl ?? undefined} />
                    <AvatarFallback>
                      {currentUser?.name?.charAt(0).toUpperCase() ?? "U"}
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
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/profile/edit")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
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
              {navItems.map((item) => (
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
                  </Button>
                </Link>
              ))}
              {isAdmin() && (
                <>
                  <div className="my-2 h-px bg-border" />
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
                      </Button>
                    </Link>
                  ))}
                </>
              )}
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
            Built for{" "}
            <span className="font-medium text-foreground">SDG 10: Reduced Inequalities</span>
          </p>
          <p className="text-center text-sm text-muted-foreground md:text-right">
            SkillSwap Network &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

