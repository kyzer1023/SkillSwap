import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, CreditCard, Repeat } from "lucide-react";

export function CreateRequestPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessionToken } = useAuthStore();

  const currentUser = useQuery(api.users.getCurrentUser, {
    sessionToken: sessionToken ?? undefined,
  });

  const createRequest = useMutation(api.requests.createRequest);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skillNeeded, setSkillNeeded] = useState("");
  const [exchangeMode, setExchangeMode] = useState<"credit" | "skill_swap">("credit");
  const [creditAmount, setCreditAmount] = useState("");
  const [skillOffered, setSkillOffered] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionToken) return;

    // Validation
    if (!title.trim() || !description.trim() || !skillNeeded.trim()) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill in all required fields.",
      });
      return;
    }

    if (exchangeMode === "credit") {
      const amount = parseInt(creditAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          variant: "destructive",
          title: "Invalid amount",
          description: "Please enter a valid credit amount.",
        });
        return;
      }
      if (currentUser && amount > currentUser.credits) {
        toast({
          variant: "destructive",
          title: "Insufficient credits",
          description: `You only have ${currentUser.credits} credits available.`,
        });
        return;
      }
    }

    if (exchangeMode === "skill_swap" && !skillOffered.trim()) {
      toast({
        variant: "destructive",
        title: "Missing skill",
        description: "Please enter the skill you're offering in exchange.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createRequest({
        sessionToken,
        title: title.trim(),
        description: description.trim(),
        skillNeeded: skillNeeded.trim(),
        exchangeMode,
        creditAmount: exchangeMode === "credit" ? parseInt(creditAmount) : undefined,
        skillOffered: exchangeMode === "skill_swap" ? skillOffered.trim() : undefined,
      });

      if (result.success) {
        toast({
          title: "Request created!",
          description: "Your service request has been posted.",
        });
        navigate(`/requests/${result.requestId}`);
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
        description: "Failed to create request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Request</h1>
          <p className="text-muted-foreground">
            Post a service request to find skilled providers
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Describe what service you need
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Need help with Python project"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what you need in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="skillNeeded">Skill Needed *</Label>
              <Input
                id="skillNeeded"
                placeholder="e.g., Python, Web Design, Guitar"
                value={skillNeeded}
                onChange={(e) => setSkillNeeded(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Exchange Mode *</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setExchangeMode("credit")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    exchangeMode === "credit"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  disabled={isLoading}
                >
                  <CreditCard className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Credits</div>
                  <div className="text-xs text-muted-foreground">
                    Pay with community credits
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setExchangeMode("skill_swap")}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    exchangeMode === "skill_swap"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  disabled={isLoading}
                >
                  <Repeat className="h-6 w-6 mx-auto mb-2" />
                  <div className="font-medium">Skill Swap</div>
                  <div className="text-xs text-muted-foreground">
                    Exchange skills directly
                  </div>
                </button>
              </div>
            </div>

            {exchangeMode === "credit" && (
              <div className="space-y-2">
                <Label htmlFor="creditAmount">Credit Amount *</Label>
                <div className="relative">
                  <Input
                    id="creditAmount"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    disabled={isLoading}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    credits
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your balance: {currentUser?.credits ?? 0} credits
                </p>
              </div>
            )}

            {exchangeMode === "skill_swap" && (
              <div className="space-y-2">
                <Label htmlFor="skillOffered">Skill You're Offering *</Label>
                <Input
                  id="skillOffered"
                  placeholder="e.g., JavaScript, Photography"
                  value={skillOffered}
                  onChange={(e) => setSkillOffered(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  What skill will you provide in exchange?
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

