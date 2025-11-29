import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CheckCircle, AlertCircle, XCircle, ArrowRight } from "lucide-react";

export function TransactionsPage() {
  const { sessionToken } = useAuthStore();

  const transactions = useQuery(api.transactions.getMyTransactions, {
    sessionToken: sessionToken ?? "",
  });

  const pending = transactions?.filter((t) => t.status === "pending") ?? [];
  const inProgress = transactions?.filter((t) => t.status === "in_progress") ?? [];
  const completed = transactions?.filter((t) => t.status === "completed") ?? [];
  const other = transactions?.filter(
    (t) => !["pending", "in_progress", "completed"].includes(t.status)
  ) ?? [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-amber-500" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const TransactionCard = ({ tx }: { tx: NonNullable<typeof transactions>[0] }) => (
    <Link to={`/transactions/${tx._id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(tx.status)}
              <div>
                <h3 className="font-medium">{tx.requestTitle}</h3>
                <p className="text-sm text-muted-foreground">
                  {tx.myRole === "requester" ? "Provider" : "Requester"}: {tx.otherPartyName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={tx.transactionType === "credit" ? "default" : "secondary"}>
                {tx.transactionType === "credit"
                  ? `${tx.creditAmount} credits`
                  : "Skill Swap"}
              </Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">Manage your skill exchanges</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          {other.length > 0 && (
            <TabsTrigger value="other">Other ({other.length})</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pending.length > 0 ? (
            pending.map((tx) => <TransactionCard key={tx._id} tx={tx} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No pending transactions
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="in_progress" className="space-y-4">
          {inProgress.length > 0 ? (
            inProgress.map((tx) => <TransactionCard key={tx._id} tx={tx} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No transactions in progress
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completed.length > 0 ? (
            completed.map((tx) => <TransactionCard key={tx._id} tx={tx} />)
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No completed transactions
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {other.length > 0 && (
          <TabsContent value="other" className="space-y-4">
            {other.map((tx) => <TransactionCard key={tx._id} tx={tx} />)}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

