import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert,
  Check,
  X,
  Loader2,
  Eye,
  Search,
  AlertTriangle,
  TrendingUp,
  Users,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type FraudAlertType = {
  _id: Id<"fraudAlerts">;
  _creationTime: number;
  userId: Id<"users">;
  userName: string;
  alertType: "unusual_volume" | "repeated_transfers" | "suspicious_pattern";
  description: string;
  severity: "low" | "medium" | "high";
  status: "pending" | "investigating" | "resolved" | "dismissed";
};

export function AdminFraudAlertsPage() {
  const { sessionToken } = useAuthStore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingAlert, setViewingAlert] = useState<FraudAlertType | null>(null);

  const alerts = useQuery(api.admin.getFraudAlerts, {
    sessionToken: sessionToken ?? "",
  });
  const resolveFraudAlert = useMutation(api.admin.resolveFraudAlert);

  const handleResolve = async (
    alertId: string,
    action: "resolve" | "dismiss" | "investigate"
  ) => {
    if (!sessionToken) return;
    setProcessingId(alertId);

    try {
      const success = await resolveFraudAlert({
        sessionToken,
        alertId: alertId as Id<"fraudAlerts">,
        action,
      });

      if (success) {
        const actionText = action === "resolve" ? "resolved" : action === "dismiss" ? "dismissed" : "marked for investigation";
        toast({
          title: `Alert ${actionText}`,
          description: "The fraud alert has been processed.",
        });
        setViewingAlert(null);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process fraud alert.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "unusual_volume":
        return <TrendingUp className="h-5 w-5" />;
      case "repeated_transfers":
        return <Users className="h-5 w-5" />;
      case "suspicious_pattern":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <ShieldAlert className="h-5 w-5" />;
    }
  };

  const getAlertTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      unusual_volume: "Unusual Volume",
      repeated_transfers: "Repeated Transfers",
      suspicious_pattern: "Suspicious Pattern",
    };
    return (
      <Badge variant="outline" className="capitalize">
        {labels[type] || type}
      </Badge>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
    };
    return (
      <Badge variant={variants[severity] || "default"} className="capitalize">
        {severity}
      </Badge>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Stats
  const alertStats = {
    total: alerts?.length ?? 0,
    high: alerts?.filter((a) => a.severity === "high").length ?? 0,
    medium: alerts?.filter((a) => a.severity === "medium").length ?? 0,
    low: alerts?.filter((a) => a.severity === "low").length ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Fraud Alerts</h1>
        <p className="text-muted-foreground">
          Monitor and investigate suspicious credit activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{alertStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {alertStats.high}
            </div>
            <p className="text-xs text-muted-foreground">High Severity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">
              {alertStats.medium}
            </div>
            <p className="text-xs text-muted-foreground">Medium Severity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {alertStats.low}
            </div>
            <p className="text-xs text-muted-foreground">Low Severity</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      {alerts && alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert._id} className={`hover:shadow-md transition-shadow ${
              alert.severity === "high" ? "border-red-500" : 
              alert.severity === "medium" ? "border-amber-500" : ""
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        alert.severity === "high"
                          ? "bg-red-100 text-red-600"
                          : alert.severity === "medium"
                          ? "bg-amber-100 text-amber-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {getAlertTypeIcon(alert.alertType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getAlertTypeBadge(alert.alertType)}
                        {getSeverityBadge(alert.severity)}
                        <span className="text-sm text-muted-foreground">
                          User: {alert.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {formatDate(alert._creationTime)}
                        </span>
                      </div>
                      <p className="font-medium line-clamp-2">{alert.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingAlert(alert)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolve(alert._id, "dismiss")}
                      disabled={processingId === alert._id}
                    >
                      {processingId === alert._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleResolve(alert._id, "resolve")}
                      disabled={processingId === alert._id}
                    >
                      {processingId === alert._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Resolve
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
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No pending fraud alerts</h3>
            <p className="text-muted-foreground">
              The system is monitoring for suspicious activity
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={!!viewingAlert} onOpenChange={() => setViewingAlert(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Review Fraud Alert
            </DialogTitle>
            <DialogDescription>
              Review the details and take appropriate action
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              {viewingAlert && getAlertTypeBadge(viewingAlert.alertType)}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Severity:</span>
              {viewingAlert && getSeverityBadge(viewingAlert.severity)}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">User:</span>
              <p className="font-medium">{viewingAlert?.userName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Description:</span>
              <p className="p-3 bg-muted rounded-lg mt-1">
                {viewingAlert?.description}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Detected:</span>
              <p className="font-medium">
                {viewingAlert && formatDate(viewingAlert._creationTime)}
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (viewingAlert) handleResolve(viewingAlert._id, "investigate");
              }}
              disabled={processingId === viewingAlert?._id}
            >
              {processingId === viewingAlert?._id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Investigate
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (viewingAlert) handleResolve(viewingAlert._id, "dismiss");
              }}
              disabled={processingId === viewingAlert?._id}
            >
              {processingId === viewingAlert?._id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Dismiss
            </Button>
            <Button
              onClick={() => {
                if (viewingAlert) handleResolve(viewingAlert._id, "resolve");
              }}
              disabled={processingId === viewingAlert?._id}
            >
              {processingId === viewingAlert?._id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

