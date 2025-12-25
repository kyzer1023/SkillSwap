import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  Edit,
  ExternalLink,
  Award,
  Briefcase,
  MessageSquare,
  Flag,
  Loader2,
} from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

type RatingType = {
  _id: Id<"ratings">;
  _creationTime: number;
  rating: number;
  comment?: string;
  raterName: string;
  response?: string;
};

export function ProfilePage() {
  const { sessionToken, userId } = useAuthStore();
  const { toast } = useToast();

  const currentUser = useQuery(api.users.getCurrentUser, {
    sessionToken: sessionToken ?? undefined,
  });

  const profilePictureUrl = useQuery(api.users.getProfilePictureUrl, {
    storageId: currentUser?.profilePicture,
  });

  const skills = useQuery(api.skills.getUserSkills, {
    userId: userId!,
  });

  const portfolio = useQuery(api.portfolio.getUserPortfolio, {
    userId: userId!,
  });

  const externalLinks = useQuery(api.externalLinks.getUserLinks, {
    userId: userId!,
  });

  const serviceListings = useQuery(api.serviceListings.getUserListings, {
    userId: userId!,
  });

  const reputation = useQuery(api.ratings.getReputationSummary, {
    userId: userId!,
  });

  const ratings = useQuery(api.ratings.getUserRatings, {
    userId: userId!,
  });

  const respondToRating = useMutation(api.ratings.respondToRating);
  const reportRating = useMutation(api.ratings.reportRating);

  // Response dialog state
  const [respondingTo, setRespondingTo] = useState<RatingType | null>(null);
  const [responseText, setResponseText] = useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Report dialog state
  const [reportingRating, setReportingRating] = useState<RatingType | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const handleRespond = async () => {
    if (!sessionToken || !respondingTo || !responseText.trim()) return;
    setIsSubmittingResponse(true);

    try {
      const result = await respondToRating({
        sessionToken,
        ratingId: respondingTo._id,
        response: responseText.trim(),
      });

      if (result.success) {
        toast({
          title: "Response submitted",
          description: "Your response has been added to the review.",
        });
        setRespondingTo(null);
        setResponseText("");
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
        description: "Failed to submit response.",
      });
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleReport = async () => {
    if (!sessionToken || !reportingRating || !reportReason.trim()) return;
    setIsSubmittingReport(true);

    try {
      const result = await reportRating({
        sessionToken,
        ratingId: reportingRating._id,
        reason: reportReason.trim(),
      });

      if (result.success) {
        toast({
          title: "Report submitted",
          description: "Your report has been submitted for review.",
        });
        setReportingRating(null);
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

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Link to="/profile/edit">
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </Link>
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
                    {currentUser.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{currentUser.name}</h2>
                  <p className="text-muted-foreground">{currentUser.email}</p>
                  {currentUser.bio && (
                    <p className="mt-2 text-sm">{currentUser.bio}</p>
                  )}
                  {!currentUser.bio && (
                    <p className="mt-2 text-sm text-muted-foreground italic">
                      No bio added yet.{" "}
                      <Link to="/profile/edit" className="text-primary hover:underline">
                        Add one
                      </Link>
                    </p>
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
              <CardDescription>
                Skills you've added to your profile
              </CardDescription>
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
                  No skills added yet.{" "}
                  <Link to="/profile/edit" className="text-primary hover:underline">
                    Add your first skill
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Service Listings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Service Listings
              </CardTitle>
              <CardDescription>Services you offer to the community</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceListings && serviceListings.length > 0 ? (
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
                  No service listings yet.{" "}
                  <Link to="/services/my" className="text-primary hover:underline">
                    Create one
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>

          {/* Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
              <CardDescription>Showcase your work</CardDescription>
            </CardHeader>
            <CardContent>
              {portfolio && portfolio.length > 0 ? (
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
              ) : (
                <p className="text-muted-foreground text-sm">
                  No portfolio items yet.{" "}
                  <Link to="/profile/edit" className="text-primary hover:underline">
                    Add your work
                  </Link>
                </p>
              )}
            </CardContent>
          </Card>
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
                  <span className="font-medium">
                    {reputation?.providerRating ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({reputation?.totalProviderRatings ?? 0})
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">As Requester</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-medium">
                    {reputation?.requesterRating ?? 0}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({reputation?.totalRequesterRatings ?? 0})
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Completed as Provider
                </span>
                <span className="font-medium">
                  {reputation?.completedAsProvider ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Completed as Requester
                </span>
                <span className="font-medium">
                  {reputation?.completedAsRequester ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Feedbacks</CardTitle>
            </CardHeader>
            <CardContent>
              {ratings && ratings.length > 0 ? (
                <div className="space-y-4">
                  {ratings.slice(0, 5).map((rating) => (
                    <div key={rating._id} className="space-y-2 p-3 rounded-lg bg-muted/50">
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
                      
                      {/* Response if exists */}
                      {rating.response && (
                        <div className="mt-2 pl-3 border-l-2 border-primary/30">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">Your response:</span> {rating.response}
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 pt-1">
                        {!rating.response && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => {
                              setRespondingTo(rating);
                              setResponseText("");
                            }}
                          >
                            <MessageSquare className="h-3 w-3" />
                            Respond
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                          onClick={() => {
                            setReportingRating(rating);
                            setReportReason("");
                          }}
                        >
                          <Flag className="h-3 w-3" />
                          Report
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No reviews yet. Complete some exchanges to get rated!
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Respond to Review Dialog */}
      <Dialog open={!!respondingTo} onOpenChange={() => setRespondingTo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Feedback</DialogTitle>
            <DialogDescription>
              Write a response to {respondingTo?.raterName}'s feedback. This will be visible to everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Show original review */}
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{respondingTo?.raterName}</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < (respondingTo?.rating ?? 0)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {respondingTo?.comment && (
                <p className="text-sm text-muted-foreground">"{respondingTo.comment}"</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="response">Your Response</Label>
              <Textarea
                id="response"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Write your response..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondingTo(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRespond}
              disabled={!responseText.trim() || isSubmittingResponse}
            >
              {isSubmittingResponse && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Review Dialog */}
      <Dialog open={!!reportingRating} onOpenChange={() => setReportingRating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Report Review
            </DialogTitle>
            <DialogDescription>
              Report this review if it violates our community guidelines (spam, harassment, false information, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Show review being reported */}
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{reportingRating?.raterName}</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3 w-3 ${
                        i < (reportingRating?.rating ?? 0)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {reportingRating?.comment && (
                <p className="text-sm text-muted-foreground">"{reportingRating.comment}"</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for Report *</Label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Explain why you're reporting this review..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportingRating(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReport}
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
