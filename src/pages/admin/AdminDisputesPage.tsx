import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Check, X, Loader2 } from "lucide-react";
import { useState } from "react";

export function AdminDisputesPage() {
  const { sessionToken } = useAuthStore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const disputes = useQuery(api.admin.getPendingDisputes, { sessionToken: sessionToken ?? "" });
  const resolveDispute = useMutation(api.admin.resolveDispute);

  const handleResolve = async (disputeId: string, action: "complete" | "dismiss") => {
    if (!sessionToken) return;
    setProcessingId(disputeId);

    try {
      const result = await resolveDispute({
        sessionToken,
        disputeId: disputeId as any,
        action,
        resolution: `Admin ${action}d the transaction`,
      });

      if (result.success) {
        toast({
          title: "Dispute resolved",
          description: `The dispute has been ${action === "dismiss" ? "dismissed" : "resolved"}.`,
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to resolve dispute." });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Disputes</h1>
        <p className="text-muted-foreground">Review and resolve transaction disputes</p>
      </div>

      {disputes && disputes.length > 0 ? (
        <div className="space-y-4">
          {disputes.map((dispute) => (
            <Card key={dispute._id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive">Dispute</Badge>
                        <span className="text-sm text-muted-foreground">
                          by {dispute.reporterName}
                        </span>
                      </div>
                      <p className="font-medium">{dispute.description}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Transaction ID: {dispute.transactionId}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(dispute._id, "dismiss")}
                      disabled={processingId === dispute._id}
                      className="gap-1"
                    >
                      {processingId === dispute._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Dismiss
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(dispute._id, "complete")}
                      disabled={processingId === dispute._id}
                      className="gap-1"
                    >
                      {processingId === dispute._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Complete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No pending disputes</h3>
            <p className="text-muted-foreground">All disputes have been resolved</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

