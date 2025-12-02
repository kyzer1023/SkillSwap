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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Flag,
  Check,
  X,
  Loader2,
  Eye,
  User,
  MessageSquare,
  FileText,
  Ban,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type ReportType = {
  _id: Id<"reports">;
  _creationTime: number;
  reporterId: Id<"users">;
  reporterName: string;
  reportType: "request" | "feedback" | "user";
  targetId: string;
  targetName: string;
  reason: string;
  status: string;
};

const SUSPENSION_OPTIONS = [
  { value: "1", label: "1 day" },
  { value: "3", label: "3 days" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
] as const;

export function AdminReportsPage() {
  const { sessionToken } = useAuthStore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportType | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  
  // Two-step flow: review dialog -> suspension confirmation dialog
  const [showSuspensionDialog, setShowSuspensionDialog] = useState(false);
  const [suspendDays, setSuspendDays] = useState<"1" | "3" | "7" | "14" | "30">("7");
  const [pendingReportId, setPendingReportId] = useState<string | null>(null);

  const reports = useQuery(api.admin.getPendingReports, {
    sessionToken: sessionToken ?? "",
  });
  const resolveReport = useMutation(api.admin.resolveReport);

  const handleResolve = async (
    reportId: string,
    action: "resolve" | "dismiss",
    withSuspension: boolean = false
  ) => {
    if (!sessionToken) return;
    setProcessingId(reportId);

    try {
      const success = await resolveReport({
        sessionToken,
        reportId: reportId as Id<"reports">,
        action,
        adminNotes: adminNotes.trim() || undefined,
        suspendDays: withSuspension ? parseInt(suspendDays) as 1 | 3 | 7 | 14 | 30 : undefined,
      });

      if (success) {
        const suspensionText = withSuspension 
          ? ` User suspended for ${suspendDays} day(s).` 
          : "";
        toast({
          title: action === "resolve" ? "Report resolved" : "Report dismissed",
          description: `The report has been processed.${suspensionText}`,
        });
        setViewingReport(null);
        setShowSuspensionDialog(false);
        setAdminNotes("");
        setSuspendDays("7");
        setPendingReportId(null);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to process report.",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleResolveClick = (reportId: string) => {
    // Store the report ID and show suspension confirmation dialog
    setPendingReportId(reportId);
    setShowSuspensionDialog(true);
  };

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "request":
        return <FileText className="h-5 w-5" />;
      case "feedback":
        return <MessageSquare className="h-5 w-5" />;
      case "user":
        return <User className="h-5 w-5" />;
      default:
        return <Flag className="h-5 w-5" />;
    }
  };

  const getReportTypeBadge = (type: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      request: "default",
      feedback: "secondary",
      user: "destructive",
    };
    return (
      <Badge variant={variants[type] || "default"} className="capitalize">
        {type}
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

  const reportStats = {
    total: reports?.length ?? 0,
    requests: reports?.filter((r) => r.reportType === "request").length ?? 0,
    feedback: reports?.filter((r) => r.reportType === "feedback").length ?? 0,
    users: reports?.filter((r) => r.reportType === "user").length ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">
          Review and manage reported content
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{reportStats.total}</div>
            <p className="text-xs text-muted-foreground">Total Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {reportStats.requests}
            </div>
            <p className="text-xs text-muted-foreground">Requests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {reportStats.feedback}
            </div>
            <p className="text-xs text-muted-foreground">Feedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {reportStats.users}
            </div>
            <p className="text-xs text-muted-foreground">Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports List */}
      {reports && reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report._id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        report.reportType === "user"
                          ? "bg-red-100 text-red-600"
                          : report.reportType === "feedback"
                          ? "bg-purple-100 text-purple-600"
                          : report.reportType === "request"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {getReportTypeIcon(report.reportType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {getReportTypeBadge(report.reportType)}
                        <span className="text-sm text-muted-foreground">
                          Reported by {report.reporterName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          • {formatDate(report._creationTime)}
                        </span>
                      </div>
                      <p className="font-medium line-clamp-2">{report.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Target: {report.targetName}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewingReport(report);
                        setAdminNotes("");
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResolve(report._id, "dismiss")}
                      disabled={processingId === report._id}
                    >
                      {processingId === report._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setViewingReport(report);
                        setAdminNotes("");
                        handleResolveClick(report._id);
                      }}
                      disabled={processingId === report._id}
                    >
                      {processingId === report._id ? (
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
            <Flag className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No pending reports</h3>
            <p className="text-muted-foreground">
              All reports have been processed
            </p>
          </CardContent>
        </Card>
      )}

      {/* Review Dialog */}
      <Dialog open={!!viewingReport && !showSuspensionDialog} onOpenChange={() => {
        setViewingReport(null);
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Review Report
            </DialogTitle>
            <DialogDescription>
              Review the details and take appropriate action
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              {viewingReport && getReportTypeBadge(viewingReport.reportType)}
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Reporter:</span>
              <p className="font-medium">{viewingReport?.reporterName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Target:</span>
              <p className="font-medium">{viewingReport?.targetName}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Reason:</span>
              <p className="p-3 bg-muted rounded-lg mt-1">
                {viewingReport?.reason}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
              <Textarea
                id="admin-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this resolution..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (viewingReport) handleResolve(viewingReport._id, "dismiss");
              }}
              disabled={processingId === viewingReport?._id}
            >
              {processingId === viewingReport?._id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Dismiss
            </Button>
            <Button
              onClick={() => {
                if (viewingReport) handleResolveClick(viewingReport._id);
              }}
              disabled={processingId === viewingReport?._id}
            >
              {processingId === viewingReport?._id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Resolve & Take Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspension Confirmation Dialog */}
      <Dialog open={showSuspensionDialog} onOpenChange={(open) => {
        if (!open) {
          setShowSuspensionDialog(false);
          setPendingReportId(null);
          setSuspendDays("7");
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
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
              Target: <span className="font-medium text-foreground">{viewingReport?.targetName}</span>
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
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (pendingReportId) handleResolve(pendingReportId, "resolve", false);
              }}
              disabled={!!processingId}
              className="w-full sm:w-auto"
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
                if (pendingReportId) handleResolve(pendingReportId, "resolve", true);
              }}
              disabled={!!processingId}
              className="w-full sm:w-auto"
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
