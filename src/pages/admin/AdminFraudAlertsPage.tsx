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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  Ban,
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

const SUSPENSION_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
] as const;

export function AdminFraudAlertsPage() {
  const { sessionToken } = useAuthStore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingAlert, setViewingAlert] = useState<FraudAlertType | null>(null);
  
  // Two-step flow
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false);
  const [suspendDays, setSuspendDays] = useState<"1" | "3" | "7" | "14" | "30">("7");
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);

  const alerts = useQuery(api.admin.getFraudAlerts, {
    sessionToken: sessionToken ?? "",
  });
  const resolveFraudAlert = useMutation(api.admin.resolveFraudAlert);

  const handleResolve = async (
    alertId: string,
    action: "resolve" | "dismiss" | "investigate",
    withSuspension: boolean = false
  ) => {
    if (!sessionToken) return;
    setProcessingId(alertId);

    try {
      const success = await resolveFraudAlert({
        sessionToken,
        alertId: alertId as Id<"fraudAlerts">,
        action,
        suspendDays: withSuspension ? parseInt(suspendDays) as 1 | 3 | 7 | 14 | 30 : undefined,
      });

      if (success) {
        const actionText = action === "resolve" ? "resolved" : action === "dismiss" ? "dismissed" : "marked for investigation";
        const suspensionText = withSuspension 
          ? ` User suspended for ${suspendDays} day(s).` 
          : "";
        toast({
          title: `Alert ${actionText}`,
          description: `The fraud alert has been processed.${suspensionText}`,
        });
        setViewingAlert(null);
        setShowSuspensionDialog(false);
        setSuspendDays("7");
        setPendingAlertId(null);
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

  const handleResolveClick = (alertId: string) => {
    setPendingAlertId(alertId);
    setShowSuspensionDialog(true);
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
                      onClick={() => {
                        setViewingAlert(alert);
                        handleResolveClick(alert._id);
                      }}
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
      <Dialog open={!!viewingAlert && !showSuspensionDialog} onOpenChange={() => setViewingAlert(null)}>
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
                if (viewingAlert) handleResolveClick(viewingAlert._id);
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

      {/* Suspension Confirmation Dialog */}
      <Dialog open={showSuspensionDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSuspensionDialog(false);
          setPendingAlertId(null);
          setSuspendDays("7");
        }
      }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Apply Suspension?
            </DialogTitle>
            <DialogDescription>
              Would you like to suspend the user as part of this resolution?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              User: <span className="font-medium text-foreground">{viewingAlert?.userName}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="suspend-days">Suspension Duration</Label>
              <Select
                value={suspendDays}
                onValueChange={(value) => setSuspendDays(value as "1" | "3" | "7" | "14" | "30")}
              >
                <SelectTrigger id="suspend-days" className="w-full">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {SUSPENSION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                User will be unable to create requests or accept matches during suspension.
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (pendingAlertId) handleResolve(pendingAlertId, "resolve", false);
              }}
              disabled={!!processingId}
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Resolve Without Suspension
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingAlertId) handleResolve(pendingAlertId, "resolve", true);
              }}
              disabled={!!processingId}
            >
              {processingId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Resolve & Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
