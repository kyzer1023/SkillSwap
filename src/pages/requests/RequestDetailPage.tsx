import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  ArrowLeft,
  CreditCard,
  Repeat,
  Star,
  Check,
  X,
  Loader2,
  MessageSquare,
  ArrowRightLeft,
  Flag,
  AlertTriangle,
} from "lucide-react";

export function RequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessionToken, userId } = useAuthStore();

  const [isAccepting, setIsAccepting] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Negotiation state (for requester sending to provider from match list)
  const [negotiatingMatch, setNegotiatingMatch] = useState<{
    matchId: string;
    providerName: string;
    providerId: string;
  } | null>(null);
  const [negotiationMode, setNegotiationMode] = useState<"credit" | "skill_swap">("credit");
  const [negotiationCredits, setNegotiationCredits] = useState(10);
  const [negotiationSkillOffered, setNegotiationSkillOffered] = useState("");
  const [negotiationMessage, setNegotiationMessage] = useState("");
  const [isSubmittingNegotiation, setIsSubmittingNegotiation] = useState(false);

  // Counter-offer state (for responding to a received negotiation with a counter)
  const [counteringNegotiation, setCounteringNegotiation] = useState<{
    negotiationId: string;
    senderName: string;
    initiatorRole: "requester" | "provider";
    currentOffer: string;
  } | null>(null);

  // Report state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const request = useQuery(api.requests.getRequestById, {
    requestId: requestId as Id<"serviceRequests">,
  });

  const suggestedMatches = useQuery(
    api.requests.getSuggestedMatches,
    request?.requesterId === userId
      ? { sessionToken: sessionToken ?? "", requestId: requestId as Id<"serviceRequests"> }
      : "skip"
  );

  // Get pending negotiations for this request
  const negotiations = useQuery(
    api.requests.getNegotiationsForRequest,
    requestId ? { sessionToken: sessionToken ?? "", requestId: requestId as Id<"serviceRequests"> } : "skip"
  );

  const acceptMatch = useMutation(api.requests.acceptMatch);
  const rejectMatch = useMutation(api.requests.rejectMatch);
  const cancelRequest = useMutation(api.requests.cancelRequest);
  const sendNegotiation = useMutation(api.requests.sendNegotiation);
  const respondToNegotiation = useMutation(api.requests.respondToNegotiation);
  const sendProviderCounterOffer = useMutation(api.requests.sendProviderCounterOffer);
  const sendRequesterCounterOffer = useMutation(api.requests.sendRequesterCounterOffer);
  const reportRequest = useMutation(api.requests.reportRequest);
  const refreshMatches = useMutation(api.requests.refreshMatchesForRequest);

  const isOwner = request?.requesterId === userId;
  const hasRefreshedRef = useRef(false);

  // Refresh matches when owner views their open request
  useEffect(() => {
    if (
      isOwner &&
      request?.status === "open" &&
      sessionToken &&
      requestId &&
      !hasRefreshedRef.current
    ) {
      hasRefreshedRef.current = true;
      refreshMatches({
        sessionToken,
        requestId: requestId as Id<"serviceRequests">,
      }).then((result) => {
        if (result.success && result.newMatchesCount > 0) {
          toast({
            title: "New matches found!",
            description: `${result.newMatchesCount} new potential provider${result.newMatchesCount > 1 ? "s" : ""} found for your request.`,
          });
        }
      }).catch(() => {
        // Silently fail - this is a background refresh
      });
    }
  }, [isOwner, request?.status, sessionToken, requestId, refreshMatches, toast]);

  const handleAcceptMatch = async (matchId: string) => {
    if (!sessionToken) return;
    setIsAccepting(matchId);

    try {
      const result = await acceptMatch({
        sessionToken,
        matchId: matchId as Id<"suggestedMatches">,
      });

      if (result.success) {
        toast({
          title: "Match accepted!",
          description: "A transaction has been created. The provider will be notified.",
        });
        navigate(`/transactions/${result.transactionId}`);
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
        description: "Failed to accept match.",
      });
    } finally {
      setIsAccepting(null);
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    if (!sessionToken) return;
    setIsRejecting(matchId);

    try {
      await rejectMatch({
        sessionToken,
        matchId: matchId as Id<"suggestedMatches">,
      });
      toast({
        title: "Match rejected",
        description: "Looking for other matches...",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject match.",
      });
    } finally {
      setIsRejecting(null);
    }
  };

  const handleCancelRequest = async () => {
    if (!sessionToken || !requestId) return;
    setIsCancelling(true);

    try {
      const result = await cancelRequest({
        sessionToken,
        requestId: requestId as Id<"serviceRequests">,
      });

      if (result) {
        toast({
          title: "Request cancelled",
          description: "Your request has been cancelled.",
        });
        navigate("/requests/my");
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
      setIsCancelling(false);
    }
  };

  const handleSendNegotiation = async () => {
    if (!sessionToken || !negotiatingMatch) return;
    setIsSubmittingNegotiation(true);

    try {
      const result = await sendNegotiation({
        sessionToken,
        matchId: negotiatingMatch.matchId as Id<"suggestedMatches">,
        proposedExchangeMode: negotiationMode,
        proposedCredits: negotiationMode === "credit" ? negotiationCredits : undefined,
        proposedSkillOffered: negotiationMode === "skill_swap" ? negotiationSkillOffered : undefined,
        message: negotiationMessage.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: "Counter-offer sent!",
          description: `Your proposal has been sent to ${negotiatingMatch.providerName}.`,
        });
        setNegotiatingMatch(null);
        setNegotiationMessage("");
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
        description: "Failed to send counter-offer.",
      });
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };

  const handleRespondToNegotiation = async (negotiationId: string, accept: boolean) => {
    if (!sessionToken) return;

    try {
      const result = await respondToNegotiation({
        sessionToken,
        negotiationId: negotiationId as Id<"negotiations">,
        accept,
      });

      if (result.success) {
        if (accept && result.transactionId) {
          toast({
            title: "Negotiation accepted!",
            description: "A transaction has been created.",
          });
          navigate(`/transactions/${result.transactionId}`);
        } else {
          toast({
            title: accept ? "Accepted" : "Declined",
            description: accept ? "The counter-offer has been accepted." : "The counter-offer has been declined.",
          });
        }
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
        description: "Failed to respond to negotiation.",
      });
    }
  };

  const handleSendCounterOffer = async () => {
    if (!sessionToken || !counteringNegotiation) return;
    setIsSubmittingNegotiation(true);

    try {
      // Use the appropriate mutation based on who is sending the counter-offer
      const mutation = counteringNegotiation.initiatorRole === "requester" 
        ? sendProviderCounterOffer 
        : sendRequesterCounterOffer;

      const result = await mutation({
        sessionToken,
        negotiationId: counteringNegotiation.negotiationId as Id<"negotiations">,
        proposedExchangeMode: negotiationMode,
        proposedCredits: negotiationMode === "credit" ? negotiationCredits : undefined,
        proposedSkillOffered: negotiationMode === "skill_swap" ? negotiationSkillOffered : undefined,
        message: negotiationMessage.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: "Counter-offer sent!",
          description: `Your counter-proposal has been sent to ${counteringNegotiation.senderName}.`,
        });
        setCounteringNegotiation(null);
        setNegotiationMessage("");
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
        description: "Failed to send counter-offer.",
      });
    } finally {
      setIsSubmittingNegotiation(false);
    }
  };

  const handleReportRequest = async () => {
    if (!sessionToken || !requestId || !reportReason.trim()) return;
    setIsSubmittingReport(true);

    try {
      const result = await reportRequest({
        sessionToken,
        requestId: requestId as Id<"serviceRequests">,
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

  if (!request) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const pendingNegotiations = negotiations?.filter(n => n.status === "pending") ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{request.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant={
                request.status === "open"
                  ? "default"
                  : request.status === "completed"
                  ? "outline"
                  : "secondary"
              }
              className="capitalize"
            >
              {request.status.replace("_", " ")}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Posted {formatDate(request._creationTime)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  Description
                </h4>
                <p>{request.description}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Skill Needed
                  </h4>
                  <Badge variant="outline" className="capitalize">
                    {request.skillNeeded}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    Exchange Mode
                  </h4>
                  {request.exchangeMode === "credit" ? (
                    <Badge className="gap-1">
                      <CreditCard className="h-3 w-3" />
                      {request.creditAmount} credits
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Repeat className="h-3 w-3" />
                      Skill: {request.skillOffered}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Negotiations - shown to whoever is the recipient */}
          {pendingNegotiations.length > 0 && (
            <Card className="border-amber-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="h-5 w-5 text-amber-500" />
                  Pending Counter-Offers
                </CardTitle>
                <CardDescription>
                  You have counter-offers waiting for your response
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingNegotiations.map((negotiation) => (
                  <div
                    key={negotiation._id}
                    className="p-4 rounded-lg border bg-muted/50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {negotiation.senderName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            to={`/users/${negotiation.senderId}`}
                            className="font-medium hover:underline"
                          >
                            {negotiation.senderName}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Counter-offer from {negotiation.initiatorRole === "requester" ? "requester" : "provider"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {negotiation.proposedExchangeMode === "credit"
                          ? `${negotiation.proposedCredits} credits`
                          : `Swap: ${negotiation.proposedSkillOffered}`}
                      </Badge>
                    </div>
                    {negotiation.message && (
                      <p className="text-sm text-muted-foreground mb-3 italic">
                        "{negotiation.message}"
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRespondToNegotiation(negotiation._id, false)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const currentOffer = negotiation.proposedExchangeMode === "credit"
                            ? `${negotiation.proposedCredits} credits`
                            : `Skill swap: ${negotiation.proposedSkillOffered}`;
                          setCounteringNegotiation({
                            negotiationId: negotiation._id,
                            senderName: negotiation.senderName,
                            initiatorRole: negotiation.initiatorRole,
                            currentOffer,
                          });
                          setNegotiationMode(negotiation.proposedExchangeMode);
                          setNegotiationCredits(negotiation.proposedCredits ?? 10);
                          setNegotiationSkillOffered(negotiation.proposedSkillOffered ?? "");
                          setNegotiationMessage("");
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Counter
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRespondToNegotiation(negotiation._id, true)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept Offer
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Suggested Matches (for owner) */}
          {isOwner && request.status === "open" && (
            <Card>
              <CardHeader>
                <CardTitle>Suggested Matches</CardTitle>
                <CardDescription>
                  Providers that match your skill requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suggestedMatches && suggestedMatches.length > 0 ? (
                  <div className="space-y-4">
                    {suggestedMatches.map((match) => (
                      <div
                        key={match._id}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarFallback>
                              {match.providerName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <Link
                              to={`/users/${match.providerId}`}
                              className="font-medium hover:underline"
                            >
                              {match.providerName}
                            </Link>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Badge variant="outline" className="capitalize text-xs">
                                {match.skillLevel}
                              </Badge>
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {match.providerRating.toFixed(1)}
                              </span>
                              {match.endorsements > 0 && (
                                <span>+{match.endorsements} endorsements</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectMatch(match._id)}
                            disabled={isRejecting === match._id}
                          >
                            {isRejecting === match._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNegotiatingMatch({
                                matchId: match._id,
                                providerName: match.providerName,
                                providerId: match.providerId,
                              });
                              setNegotiationMode(request.exchangeMode);
                              setNegotiationCredits(request.creditAmount ?? 10);
                              setNegotiationSkillOffered(request.skillOffered ?? "");
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Counter
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAcceptMatch(match._id)}
                            disabled={isAccepting === match._id}
                          >
                            {isAccepting === match._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-1" />
                                Accept
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No matches found yet.</p>
                    <p className="text-sm mt-1">
                      We'll notify you when providers with matching skills are found.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Matched Provider */}
          {request.matchedProviderId && (
            <Card>
              <CardHeader>
                <CardTitle>Matched Provider</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {request.matchedProviderName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Link
                      to={`/users/${request.matchedProviderId}`}
                      className="font-medium text-lg hover:underline"
                    >
                      {request.matchedProviderName}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      Your request has been matched with this provider
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requester Info */}
          <Card>
            <CardHeader>
              <CardTitle>Posted By</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarFallback>
                    {request.requesterName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Link
                    to={`/users/${request.requesterId}`}
                    className="font-medium hover:underline"
                  >
                    {request.requesterName}
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isOwner && request.status === "open" && (
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleCancelRequest}
                  disabled={isCancelling}
                >
                  {isCancelling && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Cancel Request
                </Button>
              </CardContent>
            </Card>
          )}

          {!isOwner && request.status === "open" && (
            <Card>
              <CardHeader>
                <CardTitle>Interested?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  If you have the required skill, you may be matched to this request automatically.
                </p>
                <Link to="/profile/edit">
                  <Button variant="outline" className="w-full">
                    Update Your Skills
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Report Request - only for non-owners */}
          {!isOwner && sessionToken && (
            <Card>
              <CardHeader>
                <CardTitle>Report</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:text-destructive"
                  onClick={() => setIsReportDialogOpen(true)}
                >
                  <Flag className="h-4 w-4 mr-2" />
                  Report This Request
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Negotiation Dialog */}
      <Dialog open={!!negotiatingMatch} onOpenChange={() => setNegotiatingMatch(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Send Counter-Offer
            </DialogTitle>
            <DialogDescription>
              Propose different terms to {negotiatingMatch?.providerName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Current offer:</p>
              <p className="font-medium">
                {request.exchangeMode === "credit"
                  ? `${request.creditAmount} credits`
                  : `Skill swap: ${request.skillOffered}`}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Proposed Exchange Mode</Label>
              <Select
                value={negotiationMode}
                onValueChange={(v) => setNegotiationMode(v as "credit" | "skill_swap")}
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

            {negotiationMode === "credit" ? (
              <div className="space-y-2">
                <Label htmlFor="neg-credits">Proposed Credits</Label>
                <Input
                  id="neg-credits"
                  type="number"
                  min={1}
                  value={negotiationCredits}
                  onChange={(e) => setNegotiationCredits(parseInt(e.target.value) || 1)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="neg-skill">Skill to Offer</Label>
                <Input
                  id="neg-skill"
                  value={negotiationSkillOffered}
                  onChange={(e) => setNegotiationSkillOffered(e.target.value)}
                  placeholder="What skill can you offer instead?"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="neg-message">Message (optional)</Label>
              <Textarea
                id="neg-message"
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                placeholder="Explain your counter-offer..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegotiatingMatch(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendNegotiation}
              disabled={isSubmittingNegotiation || (negotiationMode === "skill_swap" && !negotiationSkillOffered.trim())}
            >
              {isSubmittingNegotiation && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Counter-Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Counter-Offer Response Dialog (for responding with a counter to received negotiation) */}
      <Dialog open={!!counteringNegotiation} onOpenChange={() => setCounteringNegotiation(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Send Counter-Offer
            </DialogTitle>
            <DialogDescription>
              Propose different terms back to {counteringNegotiation?.senderName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">Their offer:</p>
              <p className="font-medium">{counteringNegotiation?.currentOffer}</p>
            </div>

            <div className="space-y-2">
              <Label>Your Proposed Exchange Mode</Label>
              <Select
                value={negotiationMode}
                onValueChange={(v) => setNegotiationMode(v as "credit" | "skill_swap")}
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

            {negotiationMode === "credit" ? (
              <div className="space-y-2">
                <Label htmlFor="counter-credits">Proposed Credits</Label>
                <Input
                  id="counter-credits"
                  type="number"
                  min={1}
                  value={negotiationCredits}
                  onChange={(e) => setNegotiationCredits(parseInt(e.target.value) || 1)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="counter-skill">Skill to Offer</Label>
                <Input
                  id="counter-skill"
                  value={negotiationSkillOffered}
                  onChange={(e) => setNegotiationSkillOffered(e.target.value)}
                  placeholder="What skill can you offer instead?"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="counter-message">Message (optional)</Label>
              <Textarea
                id="counter-message"
                value={negotiationMessage}
                onChange={(e) => setNegotiationMessage(e.target.value)}
                placeholder="Explain your counter-offer..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCounteringNegotiation(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendCounterOffer}
              disabled={isSubmittingNegotiation || (negotiationMode === "skill_swap" && !negotiationSkillOffered.trim())}
            >
              {isSubmittingNegotiation && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Send Counter-Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Request Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Report Request
            </DialogTitle>
            <DialogDescription>
              Report this request if it violates community guidelines, is spam, or contains inappropriate content.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{request.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-reason">Reason for Report *</Label>
              <Textarea
                id="report-reason"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Explain why you're reporting this request..."
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
              onClick={handleReportRequest}
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
