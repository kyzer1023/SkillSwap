import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gift, Scale, Shield } from "lucide-react";

// Terms and Conditions Content Component
function TermsContent() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <section>
        <h3 className="font-semibold text-foreground mb-2">1. Acceptance</h3>
        <p>By creating an account, you agree to these Terms and Conditions governing your use of SkillSwap.</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">2. Eligibility</h3>
        <p>You must be at least 18 years old and provide accurate information during registration.</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">3. Credit System</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>New users receive 100 welcome credits</li>
          <li>Earn credits by providing services</li>
          <li>Spend credits to receive services</li>
          <li>Credits have no cash value and are non-transferable</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">4. User Conduct</h3>
        <p>You agree to provide services honestly, communicate respectfully, and complete transactions in good faith.</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">5. Prohibited Activities</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Creating multiple accounts or false identities</li>
          <li>Fraudulent transactions or credit manipulation</li>
          <li>Harassment or abuse of other users</li>
          <li>Offering illegal services</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">6. Disputes</h3>
        <p>Disputes between users should first be resolved directly. If unsuccessful, submit a dispute through our resolution system.</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">7. Termination</h3>
        <p>We may suspend or terminate accounts for Terms violations. Credits are forfeited upon termination.</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">8. Liability</h3>
        <p>SkillSwap connects users but does not guarantee service quality. Users engage at their own risk.</p>
      </section>

      <p className="text-xs text-muted-foreground pt-2 border-t">Last updated: January 11, 2026</p>
    </div>
  );
}

// Privacy Policy Content Component
function PrivacyContent() {
  return (
    <div className="space-y-4 text-sm text-muted-foreground">
      <section>
        <h3 className="font-semibold text-foreground mb-2">1. Information We Collect</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Account:</strong> Name, email, password (encrypted)</li>
          <li><strong>Profile:</strong> Bio, skills, profile picture</li>
          <li><strong>Activity:</strong> Transactions, messages, ratings</li>
          <li><strong>Technical:</strong> Device info, usage data, cookies</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">2. How We Use Your Data</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Operate and improve the platform</li>
          <li>Process transactions and communications</li>
          <li>Ensure safety and prevent fraud</li>
          <li>Send service notifications</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">3. Information Sharing</h3>
        <p>We share information with other users (public profiles), service providers, and when required by law. We never sell your personal data.</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">4. Data Security</h3>
        <p>We use encryption, secure connections, and access controls to protect your information.</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">5. Your Rights</h3>
        <ul className="list-disc pl-4 space-y-1">
          <li>Access and download your data</li>
          <li>Correct inaccurate information</li>
          <li>Delete your account and data</li>
          <li>Opt-out of marketing emails</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">6. Contact</h3>
        <p>Questions? Email us at privacy@skillswap.com</p>
      </section>

      <p className="text-xs text-muted-foreground pt-2 border-t">Last updated: January 11, 2026</p>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const register = useMutation(api.auth.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToTerms) {
      toast({
        variant: "destructive",
        title: "Terms and Conditions Required",
        description: "Please agree to the Terms and Conditions and Privacy Policy to continue.",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({ email, password, name });

      if (result.success) {
        setAuth(result.token, result.userId, "user");
        toast({
          title: "Welcome to SkillSwap!",
          description: "Your account has been created. You've received 100 welcome credits!",
        });
        navigate("/dashboard");
      } else {
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: result.error,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>
            Join SkillSwap and start exchanging skills
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Welcome bonus banner */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Gift className="h-5 w-5 text-primary" />
              <p className="text-sm">
                <span className="font-medium">Welcome bonus:</span> Get 100 free credits when you sign up!
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Terms and Conditions Checkbox */}
            <div className="flex items-start space-x-3 pt-2">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <Label
                htmlFor="terms"
                className="text-sm font-normal leading-relaxed cursor-pointer"
              >
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-primary underline-offset-4 hover:underline font-medium"
                >
                  Terms and Conditions
                </button>{" "}
                and{" "}
                <button
                  type="button"
                  onClick={() => setShowPrivacy(true)}
                  className="text-primary underline-offset-4 hover:underline font-medium"
                >
                  Privacy Policy
                </button>
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Terms and Conditions Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Terms and Conditions
            </DialogTitle>
            <DialogDescription>
              Please read our terms of service
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            <TermsContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Privacy Policy
            </DialogTitle>
            <DialogDescription>
              How we handle your data
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[50vh] pr-4">
            <PrivacyContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
