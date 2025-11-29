import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, FileText, CreditCard, AlertTriangle, TrendingUp, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export function AdminDashboardPage() {
  const { sessionToken } = useAuthStore();

  const overview = useQuery(api.admin.getSystemOverview, { sessionToken: sessionToken ?? "" });
  const moduleAnalytics = useQuery(api.admin.getModuleAnalytics, { sessionToken: sessionToken ?? "" });
  const activityTrends = useQuery(api.admin.getActivityTrends, { sessionToken: sessionToken ?? "", days: 14 });
  const topSkills = useQuery(api.admin.getTopSkills, { sessionToken: sessionToken ?? "", limit: 5 });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and analytics</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalUsers ?? 0}</div>
            <p className="text-xs text-muted-foreground">{overview?.activeUsers ?? 0} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.openRequests ?? 0}</div>
            <p className="text-xs text-muted-foreground">{overview?.totalRequests ?? 0} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Exchanges</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.completedExchanges ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credits in Circulation</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.totalCreditsInCirculation ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(overview?.pendingReports ?? 0) > 0 || (overview?.pendingDisputes ?? 0) > 0 ? (
        <Card className="border-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <h3 className="font-semibold">Attention Required</h3>
                <p className="text-sm text-muted-foreground">
                  {overview?.pendingReports ?? 0} pending reports, {overview?.pendingDisputes ?? 0} pending disputes
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Trends</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {activityTrends && activityTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="requests" stroke="#0d9488" name="Requests" />
                  <Line type="monotone" dataKey="transactions" stroke="#0891b2" name="Transactions" />
                  <Line type="monotone" dataKey="newUsers" stroke="#6366f1" name="New Users" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Skills
            </CardTitle>
            <CardDescription>Most popular skills on the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {topSkills && topSkills.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topSkills} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="skill" type="category" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="providers" fill="#0d9488" name="Providers" />
                  <Bar dataKey="requests" fill="#0891b2" name="Requests" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profiles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{moduleAnalytics?.profiles.totalProfiles ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {moduleAnalytics?.profiles.profilesWithSkills ?? 0} with skills
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{moduleAnalytics?.requests.totalRequests ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {moduleAnalytics?.requests.byStatus.completed ?? 0} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{moduleAnalytics?.transactions.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {moduleAnalytics?.transactions.completionRate ?? 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{moduleAnalytics?.ratings.totalRatings ?? 0}</p>
            <p className="text-xs text-muted-foreground">
              {moduleAnalytics?.ratings.avgRating ?? 0} avg rating
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

