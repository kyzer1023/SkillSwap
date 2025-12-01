import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Users, FileText, CreditCard, AlertTriangle, TrendingUp, Award, UserCheck, Briefcase, Star, ArrowRightLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";

export function AdminDashboardPage() {
  const { sessionToken } = useAuthStore();
  const [selectedModule, setSelectedModule] = useState<string>("overview");

  const overview = useQuery(api.admin.getSystemOverview, { sessionToken: sessionToken ?? "" });
  const moduleAnalytics = useQuery(api.admin.getModuleAnalytics, { sessionToken: sessionToken ?? "" });
  const activityTrends = useQuery(api.admin.getActivityTrends, { sessionToken: sessionToken ?? "", days: 14 });
  const topSkills = useQuery(api.admin.getTopSkills, { sessionToken: sessionToken ?? "", limit: 5 });
  const fraudAlerts = useQuery(api.admin.getFraudAlerts, { sessionToken: sessionToken ?? "" });

  // Prepare chart data for request status
  const requestStatusData = moduleAnalytics ? [
    { name: "Open", value: moduleAnalytics.requests.byStatus.open, color: "#0d9488" },
    { name: "Matched", value: moduleAnalytics.requests.byStatus.matched, color: "#0891b2" },
    { name: "In Progress", value: moduleAnalytics.requests.byStatus.inProgress, color: "#6366f1" },
    { name: "Completed", value: moduleAnalytics.requests.byStatus.completed, color: "#22c55e" },
    { name: "Cancelled", value: moduleAnalytics.requests.byStatus.cancelled, color: "#ef4444" },
  ].filter(d => d.value > 0) : [];

  // Prepare chart data for transactions
  const transactionTypeData = moduleAnalytics ? [
    { name: "Credit-Based", value: moduleAnalytics.transactions.creditBased, color: "#0d9488" },
    { name: "Skill Swap", value: moduleAnalytics.transactions.skillSwap, color: "#6366f1" },
  ].filter(d => d.value > 0) : [];

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
      {((overview?.pendingReports ?? 0) > 0 || (overview?.pendingDisputes ?? 0) > 0 || (fraudAlerts?.length ?? 0) > 0) && (
        <Card className="border-amber-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <h3 className="font-semibold">Attention Required</h3>
                <p className="text-sm text-muted-foreground">
                  {overview?.pendingReports ?? 0} pending reports, {overview?.pendingDisputes ?? 0} pending disputes
                  {(fraudAlerts?.length ?? 0) > 0 && `, ${fraudAlerts?.length} fraud alerts`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Tabs */}
      <Tabs value={selectedModule} onValueChange={setSelectedModule} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
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
                      <Legend />
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
                      <Legend />
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

          {/* Module Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedModule("profiles")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Profiles Module</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{moduleAnalytics?.profiles.totalProfiles ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {moduleAnalytics?.profiles.profilesWithSkills ?? 0} with skills, {moduleAnalytics?.profiles.profilesWithPortfolio ?? 0} with portfolio
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedModule("requests")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Requests Module</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{moduleAnalytics?.requests.totalRequests ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {moduleAnalytics?.requests.byStatus.open ?? 0} open, {moduleAnalytics?.requests.byStatus.completed ?? 0} completed
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedModule("transactions")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Transactions Module</CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{moduleAnalytics?.transactions.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {moduleAnalytics?.transactions.completionRate ?? 0}% completion rate
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedModule("ratings")}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm">Ratings Module</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{moduleAnalytics?.ratings.totalRatings ?? 0}</p>
                <p className="text-xs text-muted-foreground">
                  {moduleAnalytics?.ratings.avgRating ?? 0} avg rating
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profiles Tab */}
        <TabsContent value="profiles" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Profile Statistics
                </CardTitle>
                <CardDescription>User profile completion and engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Profiles</span>
                    <span className="font-bold">{moduleAnalytics?.profiles.totalProfiles ?? 0}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Profiles with Skills</span>
                    <span>{moduleAnalytics?.profiles.profilesWithSkills ?? 0}</span>
                  </div>
                  <Progress 
                    value={moduleAnalytics?.profiles.totalProfiles 
                      ? ((moduleAnalytics.profiles.profilesWithSkills / moduleAnalytics.profiles.totalProfiles) * 100) 
                      : 0} 
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Profiles with Portfolio</span>
                    <span>{moduleAnalytics?.profiles.profilesWithPortfolio ?? 0}</span>
                  </div>
                  <Progress 
                    value={moduleAnalytics?.profiles.totalProfiles 
                      ? ((moduleAnalytics.profiles.profilesWithPortfolio / moduleAnalytics.profiles.totalProfiles) * 100) 
                      : 0} 
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Average Skills per User</span>
                    <span className="font-bold">{moduleAnalytics?.profiles.avgSkillsPerUser ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profile Completion Overview</CardTitle>
                <CardDescription>Distribution of profile completeness</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span>Complete Profiles</span>
                    </div>
                    <span className="font-bold">
                      {Math.min(moduleAnalytics?.profiles.profilesWithSkills ?? 0, moduleAnalytics?.profiles.profilesWithPortfolio ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                      <span>Partial Profiles</span>
                    </div>
                    <span className="font-bold">
                      {Math.max(0, (moduleAnalytics?.profiles.profilesWithSkills ?? 0) - (moduleAnalytics?.profiles.profilesWithPortfolio ?? 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span>Basic Profiles</span>
                    </div>
                    <span className="font-bold">
                      {Math.max(0, (moduleAnalytics?.profiles.totalProfiles ?? 0) - (moduleAnalytics?.profiles.profilesWithSkills ?? 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Request Status Breakdown
                </CardTitle>
                <CardDescription>Current status of all service requests</CardDescription>
              </CardHeader>
              <CardContent>
                {requestStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={requestStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="none"
                        style={{ outline: "none" }}
                      >
                        {requestStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" style={{ outline: "none" }} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        formatter={(value) => {
                          const item = requestStatusData.find(d => d.name === value);
                          const total = requestStatusData.reduce((sum, d) => sum + d.value, 0);
                          const percent = item && total > 0 ? Math.round((item.value / total) * 100) : 0;
                          return `${value} (${percent}%)`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    No requests data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Statistics</CardTitle>
                <CardDescription>Detailed request metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{moduleAnalytics?.requests.byStatus.open ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-600">{moduleAnalytics?.requests.byStatus.matched ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Matched</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-purple-600">{moduleAnalytics?.requests.byStatus.inProgress ?? 0}</p>
                    <p className="text-xs text-muted-foreground">In Progress</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-teal-600">{moduleAnalytics?.requests.byStatus.completed ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Requests</span>
                    <span className="font-bold">{moduleAnalytics?.requests.totalRequests ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Cancelled Requests</span>
                    <span className="text-red-600">{moduleAnalytics?.requests.byStatus.cancelled ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span className="font-bold text-green-600">
                      {moduleAnalytics?.requests.totalRequests 
                        ? Math.round((moduleAnalytics.requests.byStatus.completed / moduleAnalytics.requests.totalRequests) * 100) 
                        : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5" />
                  Transaction Types
                </CardTitle>
                <CardDescription>Credit-based vs Skill swap transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {transactionTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <Pie
                        data={transactionTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="none"
                        style={{ outline: "none" }}
                      >
                        {transactionTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" style={{ outline: "none" }} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center"
                        formatter={(value) => {
                          const item = transactionTypeData.find(d => d.name === value);
                          const total = transactionTypeData.reduce((sum, d) => sum + d.value, 0);
                          const percent = item && total > 0 ? Math.round((item.value / total) * 100) : 0;
                          return `${value} (${percent}%)`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    No transaction data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Transaction Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold">{moduleAnalytics?.transactions.total ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Total Transactions</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{moduleAnalytics?.transactions.completionRate ?? 0}%</p>
                    <p className="text-xs text-muted-foreground">Completion Rate</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Credit-Based Transactions</span>
                    <span className="font-bold">{moduleAnalytics?.transactions.creditBased ?? 0}</span>
                  </div>
                  <Progress 
                    value={moduleAnalytics?.transactions.total 
                      ? ((moduleAnalytics.transactions.creditBased / moduleAnalytics.transactions.total) * 100) 
                      : 0} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Skill Swap Transactions</span>
                    <span className="font-bold">{moduleAnalytics?.transactions.skillSwap ?? 0}</span>
                  </div>
                  <Progress 
                    value={moduleAnalytics?.transactions.total 
                      ? ((moduleAnalytics.transactions.skillSwap / moduleAnalytics.transactions.total) * 100) 
                      : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ratings Tab */}
        <TabsContent value="ratings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Rating Overview
                </CardTitle>
                <CardDescription>Platform-wide rating statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-6 bg-muted rounded-lg">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
                    <span className="text-4xl font-bold">{moduleAnalytics?.ratings.avgRating ?? 0}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Average Platform Rating</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Total Ratings</span>
                    <span className="font-bold">{moduleAnalytics?.ratings.totalRatings ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Reported Ratings</span>
                    <span className="text-red-600">{moduleAnalytics?.ratings.reportedRatings ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Clean Ratings</span>
                    <span className="text-green-600">
                      {(moduleAnalytics?.ratings.totalRatings ?? 0) - (moduleAnalytics?.ratings.reportedRatings ?? 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rating Health</CardTitle>
                <CardDescription>Quality indicators for the rating system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Clean Rating Percentage</span>
                    <span className="font-bold">
                      {moduleAnalytics?.ratings.totalRatings 
                        ? Math.round(((moduleAnalytics.ratings.totalRatings - moduleAnalytics.ratings.reportedRatings) / moduleAnalytics.ratings.totalRatings) * 100) 
                        : 100}%
                    </span>
                  </div>
                  <Progress 
                    value={moduleAnalytics?.ratings.totalRatings 
                      ? ((moduleAnalytics.ratings.totalRatings - moduleAnalytics.ratings.reportedRatings) / moduleAnalytics.ratings.totalRatings) * 100 
                      : 100} 
                    className="h-3"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {(moduleAnalytics?.ratings.totalRatings ?? 0) - (moduleAnalytics?.ratings.reportedRatings ?? 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Clean Ratings</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{moduleAnalytics?.ratings.reportedRatings ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Reported Ratings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
