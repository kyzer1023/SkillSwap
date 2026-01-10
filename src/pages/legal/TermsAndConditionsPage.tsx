import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale, Shield } from "lucide-react";

export function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader className="text-center border-b">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Scale className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Terms and Conditions</CardTitle>
            <CardDescription>Last updated: January 11, 2026</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-muted-foreground">
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
              <ul className="list-disc pl-5 space-y-1">
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
              <ul className="list-disc pl-5 space-y-1">
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

            <section>
              <h3 className="font-semibold text-foreground mb-2">9. Contact</h3>
              <p>Questions? Email us at <span className="text-primary">legal@skillswap.com</span></p>
            </section>
          </CardContent>
        </Card>

        {/* Related Links */}
        <div className="mt-6 flex justify-center gap-4">
          <Link to="/privacy-policy">
            <Button variant="outline">
              <Shield className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
          </Link>
          <Link to="/register">
            <Button>Create Account</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
