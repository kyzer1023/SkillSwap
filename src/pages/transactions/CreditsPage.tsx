import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreditCard, TrendingUp, TrendingDown, Clock } from "lucide-react";

export function CreditsPage() {
  const { sessionToken } = useAuthStore();

  const creditInfo = useQuery(api.transactions.getCreditInfo, {
    sessionToken: sessionToken ?? "",
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "earned":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "spent":
      case "reserved":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "released":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Credits</h1>
        <p className="text-muted-foreground">Manage your community credits</p>
      </div>

      {/* Balance Card */}
      <Card className="gradient-primary text-white">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <CreditCard className="h-8 w-8" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Current Balance</p>
              <p className="text-4xl font-bold">{creditInfo?.balance ?? 0}</p>
              <p className="text-white/60 text-sm">credits</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Your credit activity</CardDescription>
        </CardHeader>
        <CardContent>
          {creditInfo?.history && creditInfo.history.length > 0 ? (
            <div className="space-y-4">
              {creditInfo.history.map((entry) => (
                <div
                  key={entry._id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {getTypeIcon(entry.type)}
                    <div>
                      <p className="font-medium text-sm">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry._creationTime)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${
                        entry.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: {entry.balanceAfter}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transaction history yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

