import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, X, Save, ArrowLeft, Upload, Image, FileText, Trash2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

export function EditProfilePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessionToken, userId } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = useQuery(api.users.getCurrentUser, {
    sessionToken: sessionToken ?? undefined,
  });

  const skills = useQuery(api.skills.getUserSkills, {
    userId: userId!,
  });

  const externalLinks = useQuery(api.externalLinks.getUserLinks, {
    userId: userId!,
  });

  const portfolio = useQuery(api.portfolio.getUserPortfolio, {
    userId: userId!,
  });

  const updateProfile = useMutation(api.users.updateProfile);
  const addSkill = useMutation(api.skills.addSkill);
  const deleteSkill = useMutation(api.skills.deleteSkill);
  const addLink = useMutation(api.externalLinks.addLink);
  const deleteLink = useMutation(api.externalLinks.deleteLink);
  const generateUploadUrl = useMutation(api.portfolio.generateUploadUrl);
  const addPortfolioItem = useMutation(api.portfolio.addPortfolioItem);
  const updatePortfolioItem = useMutation(api.portfolio.updatePortfolioItem);
  const deletePortfolioItem = useMutation(api.portfolio.deletePortfolioItem);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Skill form
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState<"beginner" | "intermediate" | "expert">("beginner");
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Link form
  const [newLinkPlatform, setNewLinkPlatform] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isAddingLink, setIsAddingLink] = useState(false);

  // Portfolio form
  const [isUploadingPortfolio, setIsUploadingPortfolio] = useState(false);
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioDescription, setPortfolioDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [editingPortfolioItem, setEditingPortfolioItem] = useState<{
    id: Id<"portfolioItems">;
    title: string;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setBio(currentUser.bio ?? "");
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!sessionToken) return;
    setIsLoading(true);

    try {
      await updateProfile({
        sessionToken,
        name: name || undefined,
        bio: bio || undefined,
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSkill = async () => {
    if (!sessionToken || !newSkillName.trim()) return;
    setIsAddingSkill(true);

    try {
      const result = await addSkill({
        sessionToken,
        name: newSkillName.trim(),
        level: newSkillLevel,
      });

      if (result.success) {
        setNewSkillName("");
        setNewSkillLevel("beginner");
        toast({
          title: "Skill added",
          description: `${newSkillName} has been added to your profile.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add skill.",
      });
    } finally {
      setIsAddingSkill(false);
    }
  };

  const handleDeleteSkill = async (skillId: string) => {
    if (!sessionToken) return;

    try {
      await deleteSkill({ sessionToken, skillId: skillId as Id<"skills"> });
      toast({
        title: "Skill removed",
        description: "The skill has been removed from your profile.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove skill.",
      });
    }
  };

  const handleAddLink = async () => {
    if (!sessionToken || !newLinkPlatform.trim() || !newLinkUrl.trim()) return;
    setIsAddingLink(true);

    try {
      const result = await addLink({
        sessionToken,
        platform: newLinkPlatform.trim(),
        url: newLinkUrl.trim(),
      });

      if (result.success) {
        setNewLinkPlatform("");
        setNewLinkUrl("");
        toast({
          title: "Link added",
          description: "External link has been added to your profile.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add link.",
      });
    } finally {
      setIsAddingLink(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!sessionToken) return;

    try {
      await deleteLink({ sessionToken, linkId: linkId as Id<"externalLinks"> });
      toast({
        title: "Link removed",
        description: "The link has been removed from your profile.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove link.",
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please select a file smaller than 5MB.",
        });
        return;
      }
      setSelectedFile(file);
      setShowPortfolioDialog(true);
    }
  };

  const handleUploadPortfolio = async () => {
    if (!sessionToken || !selectedFile || !portfolioTitle.trim()) return;
    setIsUploadingPortfolio(true);

    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl({ sessionToken });
      if (!uploadUrl) {
        throw new Error("Failed to get upload URL");
      }

      // Upload file
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await response.json();

      // Determine file type
      const fileType = selectedFile.type.startsWith("image/") ? "image" : "document";

      // Add portfolio item
      const result = await addPortfolioItem({
        sessionToken,
        title: portfolioTitle.trim(),
        description: portfolioDescription.trim() || undefined,
        fileId: storageId,
        fileType,
      });

      if (result.success) {
        toast({
          title: "Portfolio item added",
          description: "Your work has been added to your portfolio.",
        });
        setShowPortfolioDialog(false);
        setPortfolioTitle("");
        setPortfolioDescription("");
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to upload portfolio item.",
      });
    } finally {
      setIsUploadingPortfolio(false);
    }
  };

  const handleUpdatePortfolioItem = async () => {
    if (!sessionToken || !editingPortfolioItem) return;

    try {
      await updatePortfolioItem({
        sessionToken,
        itemId: editingPortfolioItem.id,
        title: editingPortfolioItem.title.trim() || undefined,
        description: editingPortfolioItem.description.trim() || undefined,
      });

      toast({
        title: "Portfolio item updated",
        description: "Your portfolio item has been updated.",
      });
      setEditingPortfolioItem(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update portfolio item.",
      });
    }
  };

  const handleDeletePortfolioItem = async (itemId: Id<"portfolioItems">) => {
    if (!sessionToken) return;

    try {
      await deletePortfolioItem({ sessionToken, itemId });
      toast({
        title: "Portfolio item deleted",
        description: "The item has been removed from your portfolio.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete portfolio item.",
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your profile information
          </p>
        </div>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Your public profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others about yourself..."
              rows={4}
            />
          </div>
          <Button onClick={handleSaveProfile} disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle>Skills</CardTitle>
          <CardDescription>
            Add skills to showcase your expertise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Skills */}
          {skills && skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <Badge
                  key={skill._id}
                  variant="secondary"
                  className="px-3 py-1 pr-1"
                >
                  <span className="capitalize">{skill.name}</span>
                  <span className="ml-2 text-xs opacity-70 capitalize">
                    ({skill.level})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => handleDeleteSkill(skill._id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add Skill Form */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Skill name (e.g., Python)"
              value={newSkillName}
              onChange={(e) => setNewSkillName(e.target.value)}
              className="flex-1"
            />
            <Select
              value={newSkillLevel}
              onValueChange={(v) => setNewSkillLevel(v as typeof newSkillLevel)}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddSkill}
              disabled={isAddingSkill || !newSkillName.trim()}
              className="gap-2"
            >
              {isAddingSkill ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
          <CardDescription>
            Showcase your work with images and documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Portfolio Items */}
          {portfolio && portfolio.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {portfolio.map((item) => (
                <div
                  key={item._id}
                  className="relative group aspect-square rounded-lg border overflow-hidden bg-muted"
                >
                  {item.fileType === "image" && item.fileUrl ? (
                    <img
                      src={item.fileUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-center text-muted-foreground truncate w-full">
                        {item.title}
                      </span>
                    </div>
                  )}
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <p className="text-white text-sm font-medium text-center px-2 truncate w-full">
                      {item.title}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingPortfolioItem({
                          id: item._id,
                          title: item.title,
                          description: item.description ?? "",
                        })}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeletePortfolioItem(item._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-2">
              Upload images or documents (max 5MB)
            </p>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Portfolio Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* External Links */}
      <Card>
        <CardHeader>
          <CardTitle>External Links</CardTitle>
          <CardDescription>
            Add links to your LinkedIn, GitHub, portfolio, etc.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Links */}
          {externalLinks && externalLinks.length > 0 && (
            <div className="space-y-2">
              {externalLinks.map((link) => (
                <div
                  key={link._id}
                  className="flex items-center justify-between p-2 rounded-lg border"
                >
                  <div>
                    <span className="font-medium">{link.platform}</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-sm text-primary hover:underline"
                    >
                      {link.url}
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDeleteLink(link._id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Link Form */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Platform (e.g., LinkedIn)"
              value={newLinkPlatform}
              onChange={(e) => setNewLinkPlatform(e.target.value)}
              className="sm:w-40"
            />
            <Input
              placeholder="URL (https://...)"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleAddLink}
              disabled={isAddingLink || !newLinkPlatform.trim() || !newLinkUrl.trim()}
              className="gap-2"
            >
              {isAddingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Upload Dialog */}
      <Dialog open={showPortfolioDialog} onOpenChange={setShowPortfolioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Portfolio Item</DialogTitle>
            <DialogDescription>
              Add details about your work
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                {selectedFile.type.startsWith("image/") ? (
                  <Image className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm truncate">{selectedFile.name}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="portfolio-title">Title *</Label>
              <Input
                id="portfolio-title"
                value={portfolioTitle}
                onChange={(e) => setPortfolioTitle(e.target.value)}
                placeholder="e.g., Website Design Project"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolio-description">Description (optional)</Label>
              <Textarea
                id="portfolio-description"
                value={portfolioDescription}
                onChange={(e) => setPortfolioDescription(e.target.value)}
                placeholder="Describe your work..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPortfolioDialog(false);
              setSelectedFile(null);
              setPortfolioTitle("");
              setPortfolioDescription("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleUploadPortfolio}
              disabled={isUploadingPortfolio || !portfolioTitle.trim()}
            >
              {isUploadingPortfolio && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Portfolio Item Dialog */}
      <Dialog open={!!editingPortfolioItem} onOpenChange={() => setEditingPortfolioItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Portfolio Item</DialogTitle>
            <DialogDescription>
              Update the details of your portfolio item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-portfolio-title">Title</Label>
              <Input
                id="edit-portfolio-title"
                value={editingPortfolioItem?.title ?? ""}
                onChange={(e) => setEditingPortfolioItem(prev => prev ? { ...prev, title: e.target.value } : null)}
                placeholder="e.g., Website Design Project"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-portfolio-description">Description</Label>
              <Textarea
                id="edit-portfolio-description"
                value={editingPortfolioItem?.description ?? ""}
                onChange={(e) => setEditingPortfolioItem(prev => prev ? { ...prev, description: e.target.value } : null)}
                placeholder="Describe your work..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPortfolioItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdatePortfolioItem}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
