import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Clock, CheckCircle, XCircle, Users, Edit, Loader2, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type RequestType = {
  _id: Id<"serviceRequests">;
  _creationTime: number;
  title: string;
  description: string;
  skillNeeded: string;
  exchangeMode: "credit" | "skill_swap";
  creditAmount?: number;
  skillOffered?: string;
  status: string;
  matchedProviderId?: Id<"users">;
  matchedProviderName?: string;
};

export function MyRequestsPage() {
  const { sessionToken } = useAuthStore();
  const { toast } = useToast();

  const myRequests = useQuery(api.requests.getMyRequests, {
    sessionToken: sessionToken ?? "",
  });

  const updateRequest = useMutation(api.requests.updateRequest);
  const cancelRequest = useMutation(api.requests.cancelRequest);

  // Edit dialog state
  const [editingRequest, setEditingRequest] = useState<RequestType | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSkillNeeded, setEditSkillNeeded] = useState("");
  const [editExchangeMode, setEditExchangeMode] = useState<"credit" | "skill_swap">("credit");
  const [editCreditAmount, setEditCreditAmount] = useState(10);
  const [editSkillOffered, setEditSkillOffered] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deletingRequest, setDeletingRequest] = useState<RequestType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openEditDialog = (request: RequestType) => {
    setEditingRequest(request);
    setEditTitle(request.title);
    setEditDescription(request.description);
    setEditSkillNeeded(request.skillNeeded);
    setEditExchangeMode(request.exchangeMode);
    setEditCreditAmount(request.creditAmount ?? 10);
    setEditSkillOffered(request.skillOffered ?? "");
  };

  const handleUpdateRequest = async () => {
    if (!sessionToken || !editingRequest) return;

    // Client-side validation
    if (!editTitle.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Title is required.",
      });
      return;
    }

    if (!editDescription.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Description is required.",
      });
      return;
    }

    if (!editSkillNeeded.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Skill needed is required.",
      });
      return;
    }

    if (editExchangeMode === "credit" && (!editCreditAmount || editCreditAmount <= 0)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Credit amount must be greater than 0.",
      });
      return;
    }

    if (editExchangeMode === "skill_swap" && !editSkillOffered.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Skill to offer is required for skill swap.",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const result = await updateRequest({
        sessionToken,
        requestId: editingRequest._id,
        title: editTitle.trim() || undefined,
        description: editDescription.trim() || undefined,
        skillNeeded: editSkillNeeded.trim() || undefined,
        exchangeMode: editExchangeMode,
        creditAmount: editExchangeMode === "credit" ? editCreditAmount : undefined,
        skillOffered: editExchangeMode === "skill_swap" ? editSkillOffered.trim() : undefined,
      });

      if (result.success) {
        toast({
          title: "Request updated",
          description: "Your request has been updated successfully.",
        });
        setEditingRequest(null);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Update request error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update request. Please check your connection and try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!sessionToken || !deletingRequest) return;
    setIsDeleting(true);

    try {
      const result = await cancelRequest({
        sessionToken,
        requestId: deletingRequest._id,
      });

      if (result) {
        toast({
          title: "Request cancelled",
          description: "Your request has been cancelled.",
        });
        setDeletingRequest(null);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to cancel request. It may no longer be open.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel request.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "matched":
        return <Users className="h-4 w-4 text-amber-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-purple-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      matched: "secondary",
      in_progress: "secondary",
      completed: "outline",
      cancelled: "destructive",
    };
    return (
      <Badge variant={variants[status] || "default"} className="capitalize">
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const openRequests = myRequests?.filter((r) => r.status === "open") ?? [];
  const activeRequests = myRequests?.filter(
    (r) => r.status === "matched" || r.status === "in_progress"
  ) ?? [];
  const completedRequests = myRequests?.filter(
    (r) => r.status === "completed" || r.status === "cancelled"
  ) ?? [];

  const RequestCard = ({ request }: { request: RequestType }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <Link to={`/requests/${request._id}`} className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(request.status)}
              <h3 className="font-semibold truncate">{request.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {request.description}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{request.skillNeeded}</Badge>
              {request.exchangeMode === "credit" ? (
                <Badge>{request.creditAmount} credits</Badge>
              ) : (
                <Badge variant="secondary">
                  Swap: {request.skillOffered}
                </Badge>
              )}
            </div>
          </Link>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {getStatusBadge(request.status)}
            {request.matchedProviderName && (
              <span className="text-xs text-muted-foreground">
                with {request.matchedProviderName}
              </span>
            )}
            {/* Edit/Delete buttons for open requests */}
            {request.status === "open" && (
              <div className="flex gap-1 mt-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.preventDefault();
                    openEditDialog(request);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    setDeletingRequest(request);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Requests</h1>
          <p className="text-muted-foreground">
            Manage your service requests
          </p>
        </div>
        <Link to="/requests/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Request
          </Button>
        </Link>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open" className="gap-2">
            <Clock className="h-4 w-4" />
            Open ({openRequests.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Users className="h-4 w-4" />
            Active ({activeRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-4">
          {openRequests.length > 0 ? (
            openRequests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No open requests</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create a new request to find skilled providers
                </p>
                <Link to="/requests/new">
                  <Button>Create Request</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeRequests.length > 0 ? (
            activeRequests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No active requests</h3>
                <p className="text-muted-foreground text-center">
                  Requests that are matched or in progress will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedRequests.length > 0 ? (
            completedRequests.map((request) => (
              <RequestCard key={request._id} request={request} />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No completed requests</h3>
                <p className="text-muted-foreground text-center">
                  Your completed and cancelled requests will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Request Dialog */}
      <Dialog open={!!editingRequest} onOpenChange={() => setEditingRequest(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Request</DialogTitle>
            <DialogDescription>
              Update your service request details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="What do you need help with?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe what you need..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-skill">Skill Needed</Label>
              <Input
                id="edit-skill"
                value={editSkillNeeded}
                onChange={(e) => setEditSkillNeeded(e.target.value)}
                placeholder="e.g., Web Development"
              />
            </div>
            <div className="space-y-2">
              <Label>Exchange Mode</Label>
              <Select
                value={editExchangeMode}
                onValueChange={(v) => setEditExchangeMode(v as "credit" | "skill_swap")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Pay with Credits</SelectItem>
                  <SelectItem value="skill_swap">Skill Swap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editExchangeMode === "credit" ? (
              <div className="space-y-2">
                <Label htmlFor="edit-credits">Credit Amount</Label>
                <Input
                  id="edit-credits"
                  type="number"
                  min={1}
                  value={editCreditAmount}
                  onChange={(e) => setEditCreditAmount(parseInt(e.target.value) || 1)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="edit-skill-offered">Skill to Offer</Label>
                <Input
                  id="edit-skill-offered"
                  value={editSkillOffered}
                  onChange={(e) => setEditSkillOffered(e.target.value)}
                  placeholder="What skill can you offer in exchange?"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRequest(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRequest} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingRequest} onOpenChange={() => setDeletingRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium">{deletingRequest?.title}</p>
            <p className="text-sm text-muted-foreground">{deletingRequest?.description}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingRequest(null)}>
              Keep Request
            </Button>
            <Button variant="destructive" onClick={handleCancelRequest} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cancel Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
