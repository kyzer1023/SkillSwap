import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Loader2, Briefcase, Pencil, ToggleLeft, ToggleRight } from "lucide-react";

type ServiceListing = {
  _id: Id<"serviceListings">;
  _creationTime: number;
  title: string;
  description: string;
  skillRequired: string;
  exchangeMode: "credit" | "skill_swap" | "both";
  creditAmount?: number;
  isActive: boolean;
};

export function MyServicesPage() {
  const { sessionToken, userId } = useAuthStore();
  const { toast } = useToast();

  const listings = useQuery(api.serviceListings.getUserListings, userId ? { userId } : "skip");
  const skills = useQuery(api.skills.getUserSkills, userId ? { userId } : "skip");

  const createListing = useMutation(api.serviceListings.createListing);
  const updateListing = useMutation(api.serviceListings.updateListing);
  const deleteListing = useMutation(api.serviceListings.deleteListing);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillRequired, setSkillRequired] = useState("");
  const [exchangeMode, setExchangeMode] = useState<"credit" | "skill_swap" | "both">("credit");
  const [creditAmount, setCreditAmount] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<ServiceListing | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExchangeMode, setEditExchangeMode] = useState<"credit" | "skill_swap" | "both">("credit");
  const [editCreditAmount, setEditCreditAmount] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingListingId, setDeletingListingId] = useState<Id<"serviceListings"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCreate = async () => {
    if (!sessionToken || !title || !description || !skillRequired) return;
    setIsCreating(true);

    try {
      const result = await createListing({
        sessionToken,
        title,
        description,
        skillRequired,
        exchangeMode,
        creditAmount: exchangeMode !== "skill_swap" ? parseInt(creditAmount) || undefined : undefined,
      });

      if (result.success) {
        setTitle("");
        setDescription("");
        setSkillRequired("");
        setCreditAmount("");
        toast({ title: "Service created!", description: "Your service listing is now live." });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to create service." });
    } finally {
      setIsCreating(false);
    }
  };

  const openEditDialog = (listing: ServiceListing) => {
    setEditingListing(listing);
    setEditTitle(listing.title);
    setEditDescription(listing.description);
    setEditExchangeMode(listing.exchangeMode);
    setEditCreditAmount(listing.creditAmount?.toString() || "");
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!sessionToken || !editingListing) return;
    setIsUpdating(true);

    try {
      const success = await updateListing({
        sessionToken,
        listingId: editingListing._id,
        title: editTitle,
        description: editDescription,
        exchangeMode: editExchangeMode,
        creditAmount: editExchangeMode !== "skill_swap" ? parseInt(editCreditAmount) || undefined : undefined,
      });

      if (success) {
        setEditDialogOpen(false);
        setEditingListing(null);
        toast({ title: "Updated!", description: "Your service listing has been updated." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to update service." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update service." });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleActive = async (listing: ServiceListing) => {
    if (!sessionToken) return;

    try {
      const success = await updateListing({
        sessionToken,
        listingId: listing._id,
        isActive: !listing.isActive,
      });

      if (success) {
        toast({
          title: listing.isActive ? "Deactivated" : "Activated",
          description: listing.isActive
            ? "Your service is now hidden from listings."
            : "Your service is now visible to others.",
        });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const openDeleteDialog = (listingId: Id<"serviceListings">) => {
    setDeletingListingId(listingId);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!sessionToken || !deletingListingId) return;
    setIsDeleting(true);

    try {
      const success = await deleteListing({ sessionToken, listingId: deletingListingId });
      if (success) {
        setDeleteDialogOpen(false);
        setDeletingListingId(null);
        toast({ title: "Deleted", description: "Service listing removed." });
      } else {
        toast({ variant: "destructive", title: "Error", description: "Failed to delete." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete." });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">My Services</h1>
        <p className="text-muted-foreground">Manage your service offerings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Service</CardTitle>
            <CardDescription>Add a service you can offer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Python Tutoring" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your service..." />
            </div>
            <div className="space-y-2">
              <Label>Skill</Label>
              <Select value={skillRequired} onValueChange={setSkillRequired}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a skill" />
                </SelectTrigger>
                <SelectContent>
                  {skills?.map((skill) => (
                    <SelectItem key={skill._id} value={skill.name}>{skill.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Exchange Mode</Label>
              <Select value={exchangeMode} onValueChange={(v) => setExchangeMode(v as typeof exchangeMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credits Only</SelectItem>
                  <SelectItem value="skill_swap">Skill Swap Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exchangeMode !== "skill_swap" && (
              <div className="space-y-2">
                <Label>Credit Amount</Label>
                <Input type="number" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="50" />
              </div>
            )}
            <Button onClick={handleCreate} disabled={isCreating} className="w-full gap-2">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Service
            </Button>
          </CardContent>
        </Card>

        {/* Listings */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Services</h2>
          {listings && listings.length > 0 ? (
            listings.map((listing) => (
              <Card key={listing._id} className={!listing.isActive ? "opacity-60" : ""}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium">{listing.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline">{listing.skillRequired}</Badge>
                        <Badge variant={listing.isActive ? "default" : "secondary"}>
                          {listing.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {listing.exchangeMode === "credit" && listing.creditAmount && (
                          <Badge variant="outline">{listing.creditAmount} credits</Badge>
                        )}
                        {listing.exchangeMode === "skill_swap" && (
                          <Badge variant="outline">Skill Swap</Badge>
                        )}
                        {listing.exchangeMode === "both" && (
                          <Badge variant="outline">Credits or Swap</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(listing)}
                        title={listing.isActive ? "Deactivate" : "Activate"}
                      >
                        {listing.isActive ? (
                          <ToggleRight className="h-4 w-4 text-primary" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(listing)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(listing._id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No services yet. Create your first one!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
            <DialogDescription>Update your service listing details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g., Python Tutoring"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe your service..."
              />
            </div>
            <div className="space-y-2">
              <Label>Exchange Mode</Label>
              <Select value={editExchangeMode} onValueChange={(v) => setEditExchangeMode(v as typeof editExchangeMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Credits Only</SelectItem>
                  <SelectItem value="skill_swap">Skill Swap Only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editExchangeMode !== "skill_swap" && (
              <div className="space-y-2">
                <Label>Credit Amount</Label>
                <Input
                  type="number"
                  value={editCreditAmount}
                  onChange={(e) => setEditCreditAmount(e.target.value)}
                  placeholder="50"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this service listing? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
