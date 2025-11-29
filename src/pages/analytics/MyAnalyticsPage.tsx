import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, CreditCard, Award, Users, BarChart3 } from "lucide-react";

export function MyAnalyticsPage() {
  const { sessionToken } = useAuthStore();

  const analytics = useQuery(api.analytics.getMyAnalytics, { sessionToken: sessionToken ?? "" });
  const requestInsights = useQuery(api.analytics.getRequestInsights, { sessionToken: sessionToken ?? "" });
  const comparison = useQuery(api.analytics.getCommunityComparison, { sessionToken: sessionToken ?? "" });
  const serviceHistory = useQuery(api.analytics.getServiceHistory, { sessionToken: sessionToken ?? "" });

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

        {/* Community Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Community Comparison
            </CardTitle>
            <CardDescription>How you compare to the community average</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

