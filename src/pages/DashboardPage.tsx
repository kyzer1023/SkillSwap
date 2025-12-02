import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CreditCard,
  FileText,
  TrendingUp,
  Star,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Ban,
} from "lucide-react";

export function DashboardPage() {
  const { sessionToken } = useAuthStore();

  const currentUser = useQuery(api.users.getCurrentUser, {
    sessionToken: sessionToken ?? undefined,
  });

  const myRequests = useQuery(api.requests.getMyRequests, {
    sessionToken: sessionToken ?? "",
  });

  const myTransactions = useQuery(api.transactions.getMyTransactions, {
    sessionToken: sessionToken ?? "",
  });

  const myAnalytics = useQuery(api.analytics.getMyAnalytics, {
    sessionToken: sessionToken ?? "",
  });

  const recentRequests = useQuery(api.requests.getOpenRequests, { limit: 5 });

  const activeRequests = myRequests?.filter(
    (r) => r.status === "open" || r.status === "matched" || r.status === "in_progress"
  );

  const pendingTransactions = myTransactions?.filter(
    (t) => t.status === "pending" || t.status === "in_progress"
  );

  // Check if user is currently suspended
  const isSuspended = currentUser?.suspendedUntil && currentUser.suspendedUntil > Date.now();
  const suspensionEndDate = currentUser?.suspendedUntil 
    ? new Date(currentUser.suspendedUntil).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Suspension Banner */}
      {isSuspended && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <Ban className="h-5 w-5" />
          <AlertTitle className="font-semibold">Account Suspended</AlertTitle>
          <AlertDescription className="mt-2">
            <p>Your account is currently suspended until <strong>{suspensionEndDate}</strong>.</p>
            <p className="mt-1">During this time, you cannot create service requests or accept matches.</p>
            {currentUser?.suspensionReason && (
              <p className="mt-2 text-sm opacity-80">Reason: {currentUser.suspensionReason}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {currentUser?.name?.split(" ")[0]}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your SkillSwap account.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/requests/new">
            <Button className="gap-2" disabled={isSuspended}>
              <Plus className="h-4 w-4" />
              New Request
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUser?.credits ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {myAnalytics?.creditsEarned ?? 0} earned total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRequests?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {myRequests?.length ?? 0} total requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Exchanges</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {myAnalytics?.completedExchanges ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {pendingTransactions?.length ?? 0} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {myAnalytics?.providerRating ?? 0}
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground">
              {myAnalytics?.totalRatingsReceived ?? 0} reviews received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Transactions</CardTitle>
            <CardDescription>
              Transactions that need your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTransactions && pendingTransactions.length > 0 ? (
              <div className="space-y-4">
                {pendingTransactions.slice(0, 5).map((tx) => (
                  <Link
                    key={tx._id}
                    to={`/transactions/${tx._id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {tx.status === "pending" ? (
                        <Clock className="h-5 w-5 text-amber-500" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{tx.requestTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          with {tx.otherPartyName}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={tx.status === "pending" ? "secondary" : "default"}
                    >
                      {tx.status === "pending" ? "Awaiting" : "In Progress"}
                    </Badge>
                  </Link>
                ))}
                <Link to="/transactions">
                  <Button variant="outline" className="w-full gap-2">
                    View All Transactions
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending transactions</p>
                <Link to="/requests">
                  <Button variant="link" className="mt-2">
                    Browse requests
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Community Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Requests</CardTitle>
            <CardDescription>
              Latest service requests from the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentRequests && recentRequests.length > 0 ? (
              <div className="space-y-4">
                {recentRequests.map((request) => (
                  <Link
                    key={request._id}
                    to={`/requests/${request._id}`}
                    className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {request.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          by {request.requesterName}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {request.skillNeeded}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge
                        variant={
                          request.exchangeMode === "credit"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {request.exchangeMode === "credit"
                          ? `${request.creditAmount} credits`
                          : "Skill Swap"}
                      </Badge>
                    </div>
                  </Link>
                ))}
                <Link to="/requests">
                  <Button variant="outline" className="w-full gap-2">
                    Browse All Requests
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No requests yet</p>
                <Link to="/requests/new">
                  <Button variant="link" className="mt-2">
                    Create the first one
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/profile/edit">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <span className="text-lg">👤</span>
                <span>Complete Profile</span>
              </Button>
            </Link>
            <Link to="/requests/new">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <span className="text-lg">📝</span>
                <span>Post a Request</span>
              </Button>
            </Link>
            <Link to="/services">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <span className="text-lg">🔍</span>
                <span>Find Services</span>
              </Button>
            </Link>
            <Link to="/analytics">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <span className="text-lg">📊</span>
                <span>View Analytics</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

