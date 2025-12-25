import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, CheckCircle, Play, Star, AlertTriangle, Flag, Award, XCircle, MessageSquare } from "lucide-react";
import { useState } from "react";

export function TransactionDetailPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessionToken } = useAuthStore();

  const [isStarting, setIsStarting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isRatingDialogOpen, setIsRatingDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [endorseSkill, setEndorseSkill] = useState(false);

  // Dispute state
  const [isDisputeDialogOpen, setIsDisputeDialogOpen] = useState(false);
  const [disputeDescription, setDisputeDescription] = useState("");
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);

  // Report request state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Counter offer state
  const [isCounterOfferDialogOpen, setIsCounterOfferDialogOpen] = useState(false);
  const [counterOfferCredits, setCounterOfferCredits] = useState<number>(0);
  const [counterOfferMessage, setCounterOfferMessage] = useState("");
  const [isSubmittingCounterOffer, setIsSubmittingCounterOffer] = useState(false);

  const transaction = useQuery(api.transactions.getTransactionById, {
    sessionToken: sessionToken ?? "",
    transactionId: transactionId as Id<"transactions">,
  });

  const canRate = useQuery(
    api.ratings.canRateTransaction,
    transaction?.status === "completed"
      ? { sessionToken: sessionToken ?? "", transactionId: transactionId as Id<"transactions"> }
      : "skip"
  );

  // Get provider skills for endorsement
  const providerSkills = useQuery(
    api.skills.getUserSkills,
    transaction?.providerId
      ? { userId: transaction.providerId }
      : "skip"
  );

  const startTransaction = useMutation(api.transactions.startTransaction);
  const confirmCompletion = useMutation(api.transactions.confirmCompletion);
  const cancelTransaction = useMutation(api.transactions.cancelTransaction);
  const rejectTransaction = useMutation(api.transactions.rejectTransaction);
  const submitRating = useMutation(api.ratings.submitRating);
  const openDispute = useMutation(api.transactions.openDispute);
  const providerCounterOffer = useMutation(api.transactions.providerCounterOffer);
  const reportRequestFromTransaction = useMutation(api.transactions.reportRequestFromTransaction);
  const endorseSkillMutation = useMutation(api.skills.endorseSkill);

  const handleStart = async () => {
    if (!sessionToken || !transactionId) return;
    setIsStarting(true);

    try {
      const result = await startTransaction({
        sessionToken,
        transactionId: transactionId as Id<"transactions">,
      });

      if (result.success) {
        toast({ title: "Transaction started!", description: "You can now begin providing the service." });
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to start transaction." });
    } finally {
      setIsStarting(false);
    }
  };

  const handleConfirm = async () => {
    if (!sessionToken || !transactionId) return;
    setIsConfirming(true);

    try {
      const result = await confirmCompletion({
        sessionToken,
        transactionId: transactionId as Id<"transactions">,
      });

      if (result.success) {
        if (result.completed) {
          toast({ title: "Transaction completed!", description: "Don't forget to leave feedback." });
        } else {
          toast({ title: "Confirmed!", description: "Waiting for the other party to confirm." });
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to confirm." });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!sessionToken || !transactionId) return;
    setIsCancelling(true);

    try {
      const result = await cancelTransaction({
        sessionToken,
        transactionId: transactionId as Id<"transactions">,
      });

      if (result.success) {
        toast({ title: "Transaction cancelled", description: "The transaction has been cancelled." });
        navigate("/transactions");
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to cancel transaction." });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReject = async () => {
    if (!sessionToken || !transactionId) return;
    setIsRejecting(true);

    try {
      const result = await rejectTransaction({
        sessionToken,
        transactionId: transactionId as Id<"transactions">,
      });

      if (result.success) {
        toast({ title: "Request declined", description: "You have declined this request. The requester will be notified." });
        navigate("/transactions");
      } else {
        toast({ variant: "destructive", title: "Error", description: result.error });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Failed to decline request." });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!sessionToken || !transaction?.requestId || !reportReason.trim()) return;
    setIsSubmittingReport(true);

    try {
      const result = await reportRequestFromTransaction({
        sessionToken,
        transactionId: transactionId as Id<"transactions">,
        reason: reportReason.trim(),
      });

      if (result.success) {
        toast({
          title: "Report submitted",
          description: "Your report has been submitted for admin review. The transaction is paused until resolved.",
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

  const handleSubmitCounterOffer = async () => {
    if (!sessionToken || !transactionId || counterOfferCredits <= 0) return;
    setIsSubmittingCounterOffer(true);

    try {
      const result = await providerCounterOffer({
        sessionToken,
        transactionId: transactionId as Id<"transactions">,
        proposedCredits: counterOfferCredits,
        message: counterOfferMessage.trim() || undefined,
      });

      if (result.success) {
        toast({
          title: "Counter offer sent",
          description: "Your counter offer has been sent to the requester.",
        });
        setIsCounterOfferDialogOpen(false);
        setCounterOfferCredits(0);
        setCounterOfferMessage("");
        navigate("/transactions");
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
        description: "Failed to send counter offer.",
      });
    } finally {
      setIsSubmittingCounterOffer(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!sessionToken || !transactionId || selectedRating === 0) return;
    setIsSubmittingRating(true);

    try {
      const result = await submitRating({
        sessionToken,
        transactionId: transactionId as Id<"transactions">,
        rating: selectedRating,
        comment: ratingComment.trim() || undefined,
      });

      if (result.success) {
        // If requester and wants to endorse the skill
        if (endorseSkill && transaction?.myRole === "requester" && transaction.skillReceived) {
          const relevantSkill = providerSkills?.find(
            s => s.name.toLowerCase() === transaction.skillReceived?.toLowerCase()
          );
          if (relevantSkill) {
            await endorseSkillMutation({
              sessionToken,
              skillId: relevantSkill._id,
              transactionId: transactionId as Id<"transactions">,
            });
          }
        }

        toast({
          title: "Rating submitted!",
          description: endorseSkill ? "Thank you for your feedback and endorsement." : "Thank you for your feedback.",
        });
        setIsRatingDialogOpen(false);
        setSelectedRating(0);
        setRatingComment("");
        setEndorseSkill(false);
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
        description: "Failed to submit rating.",
      });
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleSubmitDispute = async () => {
    if (!sessionToken || !transactionId || !disputeDescription.trim()) return;
    setIsSubmittingDispute(true);

    try {
      const result = await openDispute({
        sessionToken,
        transactionId: transactionId as Id<"transactions">,
        description: disputeDescription.trim(),
      });

      if (result.success) {
        toast({
          title: "Dispute submitted",
          description: "Your dispute has been submitted for admin review.",
        });
        setIsDisputeDialogOpen(false);
        setDisputeDescription("");
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
        description: "Failed to submit dispute.",
      });
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  if (!transaction) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isProvider = transaction.myRole === "provider";
  const isRequester = transaction.myRole === "requester";
  // Dispute only available once work has started (in_progress)
  const canDispute = transaction.status === "in_progress";
  // Report request available only for provider when pending (before work starts)
  const canReportRequest = transaction.status === "pending" && isProvider;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Transaction Details</h1>
          <Badge 
            className="capitalize mt-1"
            variant={
              transaction.status === "completed" ? "default" :
              transaction.status === "disputed" ? "destructive" :
              transaction.status === "cancelled" || transaction.status === "reversed" ? "outline" :
              "secondary"
            }
          >
            {transaction.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{transaction.requestTitle}</CardTitle>
          <CardDescription>{transaction.requestDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Requester</p>
              <Link to={`/users/${transaction.requesterId}`} className="font-medium hover:underline">
                {transaction.requesterName}
              </Link>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Provider</p>
              <Link to={`/users/${transaction.providerId}`} className="font-medium hover:underline">
                {transaction.providerName}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Exchange</p>
            <Badge variant={transaction.transactionType === "credit" ? "default" : "secondary"}>
              {transaction.transactionType === "credit"
                ? `${transaction.creditAmount} credits`
                : `Skill: ${transaction.skillOffered} ↔ ${transaction.skillReceived}`}
            </Badge>
          </div>

          {transaction.status === "in_progress" && (
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-sm font-medium mb-2">Completion Status</p>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  {transaction.requesterConfirmed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="text-sm">Requester</span>
                </div>
                <div className="flex items-center gap-2">
                  {transaction.providerConfirmed ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2" />
                  )}
                  <span className="text-sm">Provider</span>
                </div>
              </div>
            </div>
          )}

          {transaction.status === "disputed" && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm font-medium">This transaction is under dispute</p>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                An administrator will review this case and contact both parties.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Provider actions when pending */}
          {transaction.status === "pending" && isProvider && (
            <>
              <Button onClick={handleStart} disabled={isStarting} className="w-full gap-2">
                {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Accept & Start Working
              </Button>
              
              {/* Counter Offer Dialog */}
              <Dialog open={isCounterOfferDialogOpen} onOpenChange={setIsCounterOfferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Counter Offer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      Make a Counter Offer
                    </DialogTitle>
                    <DialogDescription>
                      Propose different terms for this service request. The requester will be notified of your offer.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div>
                      <Label htmlFor="counter-credits">Your proposed credits *</Label>
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          id="counter-credits"
                          type="number"
                          min={1}
                          placeholder="Enter credit amount"
                          value={counterOfferCredits || ""}
                          onChange={(e) => setCounterOfferCredits(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-sm text-muted-foreground">credits</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current offer: {transaction.creditAmount} credits
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="counter-message">Message (optional)</Label>
                      <Textarea
                        id="counter-message"
                        placeholder="Explain why you're proposing different terms..."
                        value={counterOfferMessage}
                        onChange={(e) => setCounterOfferMessage(e.target.value)}
                        rows={3}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCounterOfferDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitCounterOffer}
                      disabled={counterOfferCredits <= 0 || isSubmittingCounterOffer}
                    >
                      {isSubmittingCounterOffer && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Send Counter Offer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleReject}
                disabled={isRejecting}
              >
                {isRejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Decline Request
              </Button>
            </>
          )}

          {/* Requester actions when pending */}
          {transaction.status === "pending" && isRequester && (
            <Button 
              variant="outline" 
              className="w-full gap-2"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Cancel Transaction
            </Button>
          )}

          {/* Report Request - Available when pending (before work starts) - Provider only */}
          {canReportRequest && (
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2">
                  <Flag className="h-4 w-4" />
                  Report Request
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Report Request
                  </DialogTitle>
                  <DialogDescription>
                    If you believe this request violates our guidelines, please describe the issue below.
                    The transaction will be <strong>paused</strong> until an administrator reviews your report.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="report-reason">Reason for report *</Label>
                  <Textarea
                    id="report-reason"
                    placeholder="Please explain why you're reporting this request..."
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Be specific about the issue. Include any relevant details that might help the admin review.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleSubmitReport}
                    disabled={!reportReason.trim() || isSubmittingReport}
                  >
                    {isSubmittingReport && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Submit Report
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* In Progress actions */}
          {transaction.status === "in_progress" && (
            <Button
              onClick={handleConfirm}
              disabled={isConfirming || (isRequester ? transaction.requesterConfirmed : transaction.providerConfirmed)}
              className="w-full gap-2"
            >
              {isConfirming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {(isRequester ? transaction.requesterConfirmed : transaction.providerConfirmed)
                ? "Already Confirmed"
                : "Confirm Completion"}
            </Button>
          )}

          {/* Open Dispute - Only available when in_progress */}
          {canDispute && (
            <Dialog open={isDisputeDialogOpen} onOpenChange={setIsDisputeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2">
                  <Flag className="h-4 w-4" />
                  Open Dispute
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Open a Dispute
                  </DialogTitle>
                  <DialogDescription>
                    If you're having issues with this transaction, describe the problem below. 
                    An administrator will review your case.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="dispute-description">Describe the issue *</Label>
                  <Textarea
                    id="dispute-description"
                    placeholder="Please explain what went wrong..."
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Be specific about the problem. Include any relevant details that might help resolve the dispute.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDisputeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleSubmitDispute}
                    disabled={!disputeDescription.trim() || isSubmittingDispute}
                  >
                    {isSubmittingDispute && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Submit Dispute
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          {/* Rating - After completion */}
          {transaction.status === "completed" && (
            <Dialog open={isRatingDialogOpen} onOpenChange={setIsRatingDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Star className={`h-4 w-4 ${canRate?.canRate === false ? "fill-amber-400 text-amber-400" : ""}`} />
                  {canRate?.canRate === false ? "Update Feedback" : "Leave Feedback"}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Rate this transaction</DialogTitle>
                  <DialogDescription>
                    How was your experience with{" "}
                    {isRequester ? transaction.providerName : transaction.requesterName}?
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="flex flex-col items-center gap-2">
                    <Label>Your Rating</Label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          className="p-1 transition-transform hover:scale-110"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setSelectedRating(star)}
                        >
                          <Star
                            className={`h-8 w-8 ${
                              star <= (hoverRating || selectedRating)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {selectedRating > 0
                        ? ["", "Poor", "Fair", "Good", "Very Good", "Excellent"][selectedRating]
                        : "Click to rate"}
                    </span>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="comment">Comment (optional)</Label>
                    <Textarea
                      id="comment"
                      placeholder="Share your experience..."
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Skill Endorsement - Only for requesters */}
                  {isRequester && transaction.skillReceived && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg bg-muted">
                      <Checkbox
                        id="endorse"
                        checked={endorseSkill}
                        onCheckedChange={(checked) => setEndorseSkill(checked === true)}
                      />
                      <div className="flex-1">
                        <Label htmlFor="endorse" className="flex items-center gap-2 cursor-pointer">
                          <Award className="h-4 w-4 text-amber-500" />
                          Endorse "{transaction.skillReceived}" skill
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          This helps others know the provider is skilled
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsRatingDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitRating}
                    disabled={selectedRating === 0 || isSubmittingRating}
                  >
                    {isSubmittingRating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Submit Rating
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
