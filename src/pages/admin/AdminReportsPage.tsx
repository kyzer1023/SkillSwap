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
  AlertTriangle,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type ReportType = {
  _id: Id<"reports">;
  _creationTime: number;
  reporterId: Id<"users">;
  reporterName: string;
  reportType: "request" | "feedback" | "user" | "transaction";
  targetId: string;
  reason: string;
  status: string;
};

export function AdminReportsPage() {
  const { sessionToken } = useAuthStore();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<ReportType | null>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const reports = useQuery(api.admin.getPendingReports, {
    sessionToken: sessionToken ?? "",
  });
  const resolveReport = useMutation(api.admin.resolveReport);

  const handleResolve = async (
    reportId: string,
    action: "resolve" | "dismiss"
  ) => {
    if (!sessionToken) return;
    setProcessingId(reportId);

    try {
      const success = await resolveReport({
        sessionToken,
        reportId: reportId as Id<"reports">,
        action,
        adminNotes: adminNotes.trim() || undefined,
      });

      if (success) {
        toast({
          title: action === "resolve" ? "Report resolved" : "Report dismissed",
          description: "The report has been processed.",
        });
        setViewingReport(null);
        setAdminNotes("");
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

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "request":
        return <FileText className="h-5 w-5" />;
      case "feedback":
        return <MessageSquare className="h-5 w-5" />;
      case "user":
        return <User className="h-5 w-5" />;
      case "transaction":
        return <AlertTriangle className="h-5 w-5" />;
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
      transaction: "outline",
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

  // Stats
  const reportStats = {
    total: reports?.length ?? 0,
    requests: reports?.filter((r) => r.reportType === "request").length ?? 0,
    feedback: reports?.filter((r) => r.reportType === "feedback").length ?? 0,
    users: reports?.filter((r) => r.reportType === "user").length ?? 0,
    transactions:
      reports?.filter((r) => r.reportType === "transaction").length ?? 0,
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">
              {reportStats.transactions}
            </div>
            <p className="text-xs text-muted-foreground">Transactions</p>
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
                        Target ID: {report.targetId}
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
                      onClick={() => handleResolve(report._id, "resolve")}
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
      <Dialog open={!!viewingReport} onOpenChange={() => setViewingReport(null)}>
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
              <span className="text-sm text-muted-foreground">Target ID:</span>
              <p className="font-mono text-sm bg-muted p-2 rounded">
                {viewingReport?.targetId}
              </p>
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
                if (viewingReport) handleResolve(viewingReport._id, "resolve");
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
    </div>
  );
}
