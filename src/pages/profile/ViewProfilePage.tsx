import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Star,
  ExternalLink,
  Award,
  Briefcase,
  ArrowLeft,
  MessageSquare,
  Flag,
  Loader2,
  AlertTriangle,
} from "lucide-react";

export function ViewProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { sessionToken, userId: currentUserId } = useAuthStore();
  const { toast } = useToast();

  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const user = useQuery(api.users.getUserById, {
    userId: userId as Id<"users">,
  });

  const profilePictureUrl = useQuery(api.users.getProfilePictureUrl, {
    storageId: user?.profilePicture,
  });

  const skills = useQuery(api.skills.getUserSkills, {
    userId: userId as Id<"users">,
  });

  const portfolio = useQuery(api.portfolio.getUserPortfolio, {
    userId: userId as Id<"users">,
  });

  const externalLinks = useQuery(api.externalLinks.getUserLinks, {
    userId: userId as Id<"users">,
  });

  const serviceListings = useQuery(api.serviceListings.getUserListings, {
    userId: userId as Id<"users">,
  });

  const ratings = useQuery(api.ratings.getUserRatings, {
    userId: userId as Id<"users">,
  });

  const reportUser = useMutation(api.users.reportUser);

  const handleReportUser = async () => {
    if (!sessionToken || !userId || !reportReason.trim()) return;
    setIsSubmittingReport(true);

    try {
      const result = await reportUser({
        sessionToken,
        userId: userId as Id<"users">,
        reason: reportReason.trim(),
      });

      if (result.success) {
        toast({
          title: "Report submitted",
          description: "Your report has been submitted for admin review.",
        });
        setIsReportDialogOpen(false);
        setReportReason("");
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit report.",
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const isOwnProfile = currentUserId === userId;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/requests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">User Profile</h1>
        </div>
        {/* Report button - only show if not own profile */}
        {!isOwnProfile && sessionToken && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setIsReportDialogOpen(true)}
          >
            <Flag className="h-4 w-4 mr-2" />
            Report User
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profilePictureUrl ?? undefined} />
                  <AvatarFallback className="text-2xl">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{user.name}</h2>
                    {user.role === "admin" && (
                      <Badge variant="default">Admin</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>{user.providerRating}</span>
                      <span>({user.totalProviderRatings} reviews)</span>
                    </div>
                  </div>
                  {user.bio && (
                    <p className="mt-3 text-sm">{user.bio}</p>
                  )}
                </div>
              </div>

              {/* External Links */}
              {externalLinks && externalLinks.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {externalLinks.map((link) => (
                    <a
                      key={link._id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {link.platform}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              {skills && skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill._id}
                      variant="secondary"
                      className="px-3 py-1"
                    >
                      <span className="capitalize">{skill.name}</span>
                      <span className="ml-2 text-xs opacity-70 capitalize">
                        ({skill.level})
                      </span>
                      {skill.endorsements > 0 && (
                        <span className="ml-1 text-xs text-primary">
                          +{skill.endorsements}
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No skills listed yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Service Listings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Services Offered
              </CardTitle>
            </CardHeader>
            <CardContent>
              {serviceListings && serviceListings.filter(l => l.isActive).length > 0 ? (
                <div className="space-y-4">
                  {serviceListings.filter(l => l.isActive).map((listing) => (
                    <div
                      key={listing._id}
                      className="p-4 rounded-lg border"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium">{listing.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {listing.description}
                          </p>
                        </div>
                        <Badge>
                          {listing.exchangeMode === "credit"
                            ? `${listing.creditAmount} credits`
                            : listing.exchangeMode === "skill_swap"
                            ? "Skill Swap"
                            : "Both"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  No services listed yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Portfolio */}
          {portfolio && portfolio.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {portfolio.map((item) => (
                    <div
                      key={item._id}
                      className="aspect-square rounded-lg border overflow-hidden bg-muted"
                    >
                      {item.fileType === "image" && item.fileUrl ? (
                        <img
                          src={item.fileUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl">📄</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Reputation Card */}
          <Card>
            <CardHeader>
              <CardTitle>Reputation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">As Provider</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{user.providerRating}</span>
                  <span className="text-xs text-muted-foreground">
                    ({user.totalProviderRatings})
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">As Requester</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{user.requesterRating}</span>
                  <span className="text-xs text-muted-foreground">
                    ({user.totalRequesterRatings})
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ratings && ratings.length > 0 ? (
                <div className="space-y-4">
                  {ratings.slice(0, 5).map((rating) => (
                    <div key={rating._id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {rating.raterName}
                        </span>
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < rating.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {rating.comment && (
                        <p className="text-xs text-muted-foreground">
                          "{rating.comment}"
                        </p>
                      )}
                      {rating.response && (
                        <p className="text-xs text-primary mt-1 pl-2 border-l-2">
                          Response: "{rating.response}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviews yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Report User Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Report User
            </DialogTitle>
            <DialogDescription>
              Report this user if they are violating community guidelines, engaging in spam, harassment, or fraudulent activity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar>
                <AvatarImage src={profilePictureUrl ?? undefined} />
                <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">User being reported</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for Report *</Label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Explain why you're reporting this user..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Be specific. Include details about the violation and any relevant context.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReportUser}
              disabled={!reportReason.trim() || isSubmittingReport}
            >
              {isSubmittingReport && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
