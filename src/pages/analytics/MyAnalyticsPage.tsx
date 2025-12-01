import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Star, TrendingUp, CreditCard, Award, Users, BarChart3, Calendar, Filter } from "lucide-react";

type TimeRange = "7days" | "30days" | "90days" | "all";

export function MyAnalyticsPage() {
  const { sessionToken } = useAuthStore();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [skillCategory, setSkillCategory] = useState<string>("all");

  const analytics = useQuery(api.analytics.getMyAnalytics, { sessionToken: sessionToken ?? "" });
  const requestInsights = useQuery(api.analytics.getRequestInsights, { sessionToken: sessionToken ?? "" });
  const skillCategories = useQuery(api.analytics.getSkillCategories, { sessionToken: sessionToken ?? "" });
  const comparison = useQuery(api.analytics.getCommunityComparison, { 
    sessionToken: sessionToken ?? "",
    timeRange: timeRange,
    skillCategory: skillCategory === "all" ? undefined : skillCategory,
  });
  const serviceHistory = useQuery(api.analytics.getServiceHistory, { sessionToken: sessionToken ?? "" });

  const timeRangeLabels: Record<TimeRange, string> = {
    "7days": "Last 7 Days",
    "30days": "Last 30 Days",
    "90days": "Last 90 Days",
    "all": "All Time",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">My Analytics</h1>
        <p className="text-muted-foreground">Track your activity and performance</p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed Exchanges</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.completedExchanges ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Credits Earned</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+{analytics?.creditsEarned ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Provider Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-1">
              {analytics?.providerRating ?? 0}
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Endorsements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.endorsementsReceived ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Request Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Request Activity</CardTitle>
            <CardDescription>Your service request statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Requests</span>
              <span className="font-medium">{requestInsights?.totalRequests ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-medium text-green-600">{requestInsights?.completedRequests ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Open</span>
              <span className="font-medium">{requestInsights?.openRequests ?? 0}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completion Rate</span>
                <span>{requestInsights?.completionRate ?? 0}%</span>
              </div>
              <Progress value={requestInsights?.completionRate ?? 0} />
            </div>
          </CardContent>
        </Card>

        {/* Community Comparison with Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community Comparison
            </CardTitle>
            <CardDescription>How you compare to the community average</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Time Range
                </Label>
                <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  Skill Category
                </Label>
                <Select value={skillCategory} onValueChange={setSkillCategory}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Skills</SelectItem>
                    {skillCategories?.map((skill) => (
                      <SelectItem key={skill} value={skill}>
                        {skill}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(timeRange !== "all" || skillCategory !== "all") && (
              <div className="text-xs text-muted-foreground">
                Showing: {timeRangeLabels[timeRange]}
                {skillCategory !== "all" && ` • ${skillCategory}`}
              </div>
            )}

            {/* Comparison Stats */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Exchanges</span>
                <span>You: {comparison?.user.completedExchanges ?? 0} | Avg: {comparison?.community.avgCompletedExchanges ?? 0}</span>
              </div>
              <Progress value={Math.min(((comparison?.user.completedExchanges ?? 0) / Math.max(comparison?.community.avgCompletedExchanges ?? 1, 1)) * 100, 100)} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Rating</span>
                <span>You: {comparison?.user.avgRating ?? 0} | Avg: {comparison?.community.avgRating ?? 0}</span>
              </div>
              <Progress value={((comparison?.user.avgRating ?? 0) / 5) * 100} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Skills</span>
                <span>You: {comparison?.user.skillsCount ?? 0} | Avg: {comparison?.community.avgSkillsCount ?? 0}</span>
              </div>
              <Progress value={Math.min(((comparison?.user.skillsCount ?? 0) / Math.max(comparison?.community.avgSkillsCount ?? 1, 1)) * 100, 100)} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Credits Earned</span>
                <span>You: {comparison?.user.creditsEarned ?? 0} | Avg: {comparison?.community.avgCreditsEarned ?? 0}</span>
              </div>
              <Progress value={Math.min(((comparison?.user.creditsEarned ?? 0) / Math.max(comparison?.community.avgCreditsEarned ?? 1, 1)) * 100, 100)} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Service History
          </CardTitle>
          <CardDescription>Your completed services</CardDescription>
        </CardHeader>
        <CardContent>
          {serviceHistory && serviceHistory.length > 0 ? (
            <div className="space-y-4">
              {serviceHistory.slice(0, 10).map((service) => (
                <div key={service._id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{service.requestTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.role === "provider" ? "Provided" : "Received"}: {service.skillUsed}
                    </p>
                  </div>
                  {service.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>{service.rating}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No service history yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
