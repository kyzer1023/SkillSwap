import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Scale } from "lucide-react";

export function PrivacyPolicyPage() {
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
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <CardDescription>Last updated: January 11, 2026</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6 text-muted-foreground">
            <section>
              <h3 className="font-semibold text-foreground mb-2">1. Information We Collect</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account:</strong> Name, email, password (encrypted)</li>
                <li><strong>Profile:</strong> Bio, skills, profile picture</li>
                <li><strong>Activity:</strong> Transactions, messages, ratings</li>
                <li><strong>Technical:</strong> Device info, usage data, cookies</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">2. How We Use Your Data</h3>
              <ul className="list-disc pl-5 space-y-1">
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
              <ul className="list-disc pl-5 space-y-1">
                <li>Access and download your data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and data</li>
                <li>Opt-out of marketing emails</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">6. Cookies</h3>
              <p>We use essential cookies to keep you logged in and preference cookies to remember your settings.</p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">7. Contact</h3>
              <p>Questions? Email us at <span className="text-primary">privacy@skillswap.com</span></p>
            </section>
          </CardContent>
        </Card>

        {/* Related Links */}
        <div className="mt-6 flex justify-center gap-4">
          <Link to="/terms-and-conditions">
            <Button variant="outline">
              <Scale className="h-4 w-4 mr-2" />
              Terms and Conditions
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
