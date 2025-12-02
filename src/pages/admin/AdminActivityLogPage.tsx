import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";
import {
  History,
  Search,
  Undo2,
  Shield,
  Ban,
  Heart,
  UserCheck,
  UserX,
  AlertTriangle,
  FileWarning,
  Scale,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type ActionType = 
  | "report_resolved"
  | "report_dismissed"
  | "dispute_resolved"
  | "dispute_dismissed"
  | "fraud_resolved"
  | "fraud_dismissed"
  | "fraud_investigating"
  | "user_suspended"
  | "user_pardoned"
  | "user_activated"
  | "user_deactivated";

type AdminAction = {
  _id: Id<"adminActions">;
  _creationTime: number;
  adminId: Id<"users">;
  adminName: string;
  actionType: ActionType;
  targetUserId?: Id<"users">;
  targetUserName?: string;
  relatedId?: string;
  details: string;
  suspendDays?: number;
  isUndone: boolean;
  undoneAt?: number;
  undoneBy?: Id<"users">;
  undoneByName?: string;
  canUndo: boolean;
};

const actionTypeConfig: Record<ActionType, { label: string; icon: React.ReactNode; color: string }> = {
  report_resolved: { 
    label: "Report Resolved", 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: "bg-green-500/10 text-green-600 border-green-500/20" 
  },
  report_dismissed: { 
    label: "Report Dismissed", 
    icon: <XCircle className="h-4 w-4" />, 
    color: "bg-slate-500/10 text-slate-600 border-slate-500/20" 
  },
  dispute_resolved: { 
    label: "Dispute Resolved", 
    icon: <Scale className="h-4 w-4" />, 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20" 
  },
  dispute_dismissed: { 
    label: "Dispute Dismissed", 
    icon: <XCircle className="h-4 w-4" />, 
    color: "bg-slate-500/10 text-slate-600 border-slate-500/20" 
  },
  fraud_resolved: { 
    label: "Fraud Alert Resolved", 
    icon: <FileWarning className="h-4 w-4" />, 
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20" 
  },
  fraud_dismissed: { 
    label: "Fraud Alert Dismissed", 
    icon: <XCircle className="h-4 w-4" />, 
    color: "bg-slate-500/10 text-slate-600 border-slate-500/20" 
  },
  fraud_investigating: { 
    label: "Fraud Investigation", 
    icon: <Eye className="h-4 w-4" />, 
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20" 
  },
  user_suspended: { 
    label: "User Suspended", 
    icon: <Ban className="h-4 w-4" />, 
    color: "bg-red-500/10 text-red-600 border-red-500/20" 
  },
  user_pardoned: { 
    label: "User Pardoned", 
    icon: <Heart className="h-4 w-4" />, 
    color: "bg-pink-500/10 text-pink-600 border-pink-500/20" 
  },
  user_activated: { 
    label: "User Activated", 
    icon: <UserCheck className="h-4 w-4" />, 
    color: "bg-green-500/10 text-green-600 border-green-500/20" 
  },
  user_deactivated: { 
    label: "User Deactivated", 
    icon: <UserX className="h-4 w-4" />, 
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20" 
  },
};

export function AdminActivityLogPage() {
  const { sessionToken } = useAuthStore();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showUndone, setShowUndone] = useState(true);
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(null);
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);

  // Always fetch all actions (including undone) to leverage Convex's realtime sync
  // Filter showUndone on the client side to avoid refetching on toggle
  const actions = useQuery(api.admin.getAdminActions, {
    sessionToken: sessionToken ?? "",
    limit: 200,
    showUndone: true, // Always include undone actions, filter client-side
  });

  const undoAction = useMutation(api.admin.undoAdminAction);

  const filteredActions = actions?.filter((action) => {
    const matchesSearch = 
      action.adminName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (action.targetUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesType = filterType === "all" || action.actionType === filterType;
    
    // Filter undone actions on client side to leverage realtime sync
    const matchesUndoneFilter = showUndone || !action.isUndone;
    
    return matchesSearch && matchesType && matchesUndoneFilter;
  });

  const handleUndo = async () => {
    if (!selectedAction || !sessionToken) return;
    
    setIsUndoing(true);
    try {
      const result = await undoAction({
        sessionToken,
        actionId: selectedAction._id,
      });

      if (result.success) {
        toast({
          title: "Action Undone",
          description: "The action has been successfully reversed.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error ?? "Failed to undo action.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsUndoing(false);
      setUndoDialogOpen(false);
      setSelectedAction(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(timestamp);
  };

  // Stats
  const stats = {
    total: actions?.length ?? 0,
    suspensions: actions?.filter(a => a.actionType === "user_suspended" && !a.isUndone).length ?? 0,
    pardons: actions?.filter(a => a.actionType === "user_pardoned" && !a.isUndone).length ?? 0,
    undone: actions?.filter(a => a.isUndone).length ?? 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <History className="h-8 w-8" />
          Admin Activity Log
        </h1>
        <p className="text-muted-foreground">Track and manage all administrative actions</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Suspensions</CardTitle>
            <Ban className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.suspensions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pardons Issued</CardTitle>
            <Heart className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">{stats.pardons}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Actions Undone</CardTitle>
            <Undo2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.undone}</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>View all admin moderation actions with undo capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by admin, user, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="user_suspended">Suspensions</SelectItem>
                  <SelectItem value="user_pardoned">Pardons</SelectItem>
                  <SelectItem value="user_activated">Activations</SelectItem>
                  <SelectItem value="user_deactivated">Deactivations</SelectItem>
                  <SelectItem value="report_resolved">Reports Resolved</SelectItem>
                  <SelectItem value="report_dismissed">Reports Dismissed</SelectItem>
                  <SelectItem value="dispute_resolved">Disputes Resolved</SelectItem>
                  <SelectItem value="dispute_dismissed">Disputes Dismissed</SelectItem>
                  <SelectItem value="fraud_resolved">Fraud Resolved</SelectItem>
                  <SelectItem value="fraud_dismissed">Fraud Dismissed</SelectItem>
                  <SelectItem value="fraud_investigating">Fraud Investigating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="show-undone"
                checked={showUndone}
                onCheckedChange={setShowUndone}
              />
              <Label htmlFor="show-undone" className="text-sm">Show undone actions</Label>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target User</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActions && filteredActions.length > 0 ? (
                  filteredActions.map((action) => {
                    const config = actionTypeConfig[action.actionType];
                    return (
                      <TableRow 
                        key={action._id} 
                        className={action.isUndone ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {formatRelativeTime(action._creationTime)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(action._creationTime)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">{action.adminName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={config.color}>
                            {config.icon}
                            <span className="ml-1">{config.label}</span>
                          </Badge>
                          {action.suspendDays && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({action.suspendDays} days)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {action.targetUserName ? (
                            <span className="font-medium">{action.targetUserName}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="text-sm text-muted-foreground truncate" title={action.details}>
                            {action.details}
                          </p>
                        </TableCell>
                        <TableCell>
                          {action.isUndone ? (
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 w-fit">
                                <Undo2 className="mr-1 h-3 w-3" />
                                Undone
                              </Badge>
                              {action.undoneByName && (
                                <span className="text-xs text-muted-foreground">
                                  by {action.undoneByName}
                                </span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {action.canUndo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedAction(action);
                                setUndoDialogOpen(true);
                              }}
                            >
                              <Undo2 className="mr-1 h-3 w-3" />
                              Undo
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery || filterType !== "all" 
                        ? "No actions found matching your filters" 
                        : "No admin actions recorded yet"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Undo Confirmation Dialog */}
      <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Undo Action
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to undo this action? This will reverse the effect.
            </DialogDescription>
          </DialogHeader>

          {selectedAction && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Action:</span>
                  <Badge variant="outline" className={actionTypeConfig[selectedAction.actionType].color}>
                    {actionTypeConfig[selectedAction.actionType].icon}
                    <span className="ml-1">{actionTypeConfig[selectedAction.actionType].label}</span>
                  </Badge>
                </div>
                {selectedAction.targetUserName && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Target User:</span>
                    <span className="font-medium">{selectedAction.targetUserName}</span>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">Details:</span>
                  <p className="text-sm mt-1">{selectedAction.details}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Performed {formatRelativeTime(selectedAction._creationTime)} by {selectedAction.adminName}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {selectedAction.actionType === "user_suspended" && (
                    <>This will lift the user's suspension and allow them to use the platform normally again.</>
                  )}
                  {selectedAction.actionType === "user_pardoned" && (
                    <>This action cannot be fully reversed. Please manually suspend the user again if needed.</>
                  )}
                  {selectedAction.actionType === "user_activated" && (
                    <>This will deactivate the user's account and log them out.</>
                  )}
                  {selectedAction.actionType === "user_deactivated" && (
                    <>This will reactivate the user's account.</>
                  )}
                  {(selectedAction.actionType === "report_resolved" || selectedAction.actionType === "report_dismissed") && (
                    <>This will reopen the report and set it back to pending status for review.</>
                  )}
                  {(selectedAction.actionType === "dispute_resolved" || selectedAction.actionType === "dispute_dismissed") && (
                    <>This will reopen the dispute and set it back to open status for review.</>
                  )}
                  {(selectedAction.actionType === "fraud_resolved" || selectedAction.actionType === "fraud_dismissed" || selectedAction.actionType === "fraud_investigating") && (
                    <>This will reopen the fraud alert and set it back to pending status for review.</>
                  )}
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setUndoDialogOpen(false)} disabled={isUndoing}>
              Cancel
            </Button>
            <Button onClick={handleUndo} disabled={isUndoing}>
              {isUndoing ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Undoing...
                </>
              ) : (
                <>
                  <Undo2 className="mr-2 h-4 w-4" />
                  Confirm Undo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

