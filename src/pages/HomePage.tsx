import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AnimateIn, AnimateChildren } from "@/components/ui/animate-in";
import { ClipPathText, ClipPathGradientText } from "@/components/ui/clip-path-text";
import {
  ArrowRight,
  Repeat,
  Users,
  Award,
  TrendingUp,
  Shield,
  Sparkles,
} from "lucide-react";

export function HomePage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-soft" />
      </div>

      {/* Header */}
      <header className="container flex h-16 items-center justify-between">
        <AnimateIn animation="slide-in-left" duration={0.5}>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <span className="font-semibold text-lg">SkillSwap</span>
          </div>
        </AnimateIn>
        <AnimateIn animation="slide-in-right" duration={0.5}>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link to="/register">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </AnimateIn>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <AnimateIn animation="blur-in" duration={0.6} delay={0.1}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Supporting SDG 10: Reduced Inequalities
              </div>
            </AnimateIn>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              <ClipPathText text="Exchange Skills, " delay={0.2} letterDelay={0.025} />
              <ClipPathGradientText text="Build Community" delay={0.6} letterDelay={0.03} />
            </h1>
            <AnimateIn animation="fade-in" duration={0.7} delay={0.9}>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                SkillSwap Network enables you to trade your expertise for services
                you need. No money required — just your skills and community
                credits.
              </p>
            </AnimateIn>
            <AnimateChildren
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
              animation="slide-in-up"
              baseDelay={1.1}
              staggerDelay={0.15}
            >
              <Link to="/register">
                <Button size="lg" className="gap-2">
                  Start Swapping
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline">
                  I have an account
                </Button>
              </Link>
            </AnimateChildren>
          </div>
        </section>

        {/* Features Section */}
        <section className="container py-20 border-t">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              <ClipPathText text="How It Works" delay={0} letterDelay={0.04} />
            </h2>
            <AnimateIn animation="fade-in" delay={0.3}>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                SkillSwap makes it easy to exchange services without traditional
                currency barriers.
              </p>
            </AnimateIn>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Create Your Profile",
                description:
                  "Showcase your skills, build a portfolio, and let others know what you can offer.",
              },
              {
                icon: Repeat,
                title: "Exchange Skills",
                description:
                  "Find someone who needs your skills and trade directly, or use community credits.",
              },
              {
                icon: Award,
                title: "Build Reputation",
                description:
                  "Earn ratings and endorsements to establish trust within the community.",
              },
            ].map((feature, index) => (
              <AnimateIn
                key={feature.title}
                animation="blur-in"
                delay={0.1 + index * 0.15}
                duration={0.6}
              >
                <div className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow h-full">
                  <div className="h-12 w-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </section>

        {/* Exchange Modes Section */}
        <section className="container py-20 border-t overflow-hidden">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimateIn animation="slide-in-left" duration={0.7}>
              <div>
                <h2 className="text-3xl font-bold mb-4">
                  <ClipPathText text="Two Ways to Exchange" delay={0} letterDelay={0.035} />
                </h2>
                <AnimateIn animation="fade-in" delay={0.4}>
                  <p className="text-muted-foreground mb-6">
                    Choose the exchange method that works best for you.
                  </p>
                </AnimateIn>
                <AnimateChildren
                  className="space-y-4"
                  animation="slide-in-left"
                  baseDelay={0.5}
                  staggerDelay={0.2}
                >
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Repeat className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Direct Skill Swap</h3>
                      <p className="text-sm text-muted-foreground">
                        Trade your skills directly with another user. You teach
                        Python, they teach guitar.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 p-4 rounded-lg border bg-card">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Credit-Based Exchange</h3>
                      <p className="text-sm text-muted-foreground">
                        Earn credits by providing services, spend them to receive
                        services from others.
                      </p>
                    </div>
                  </div>
                </AnimateChildren>
              </div>
            </AnimateIn>
            <AnimateIn animation="slide-in-right" duration={0.7} delay={0.2}>
              <div className="relative">
                <div className="aspect-square rounded-2xl gradient-primary opacity-20 absolute inset-0" />
                <div className="relative p-8">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Active Users", value: "500+" },
                      { label: "Skills Listed", value: "200+" },
                      { label: "Exchanges", value: "1,000+" },
                      { label: "Credits Exchanged", value: "50,000+" },
                    ].map((stat, index) => (
                      <AnimateIn
                        key={stat.label}
                        animation="scale-in"
                        delay={0.4 + index * 0.1}
                        duration={0.5}
                      >
                        <div className="p-4 rounded-lg bg-card border text-center">
                          <div className="text-2xl font-bold gradient-text">
                            {stat.value}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {stat.label}
                          </div>
                        </div>
                      </AnimateIn>
                    ))}
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container py-20 border-t">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              <ClipPathText text="Ready to Join the Community?" delay={0} letterDelay={0.03} />
            </h2>
            <AnimateIn animation="blur-in" delay={0.5}>
              <p className="text-muted-foreground mb-8">
                Sign up today and receive 100 free credits to get started.
              </p>
            </AnimateIn>
            <AnimateIn animation="slide-in-up" delay={0.7}>
              <Link to="/register">
                <Button size="lg" className="gap-2">
                  Create Free Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </AnimateIn>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <AnimateIn animation="fade-in" delay={0.2}>
          <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Built for SDG 10: Reduced Inequalities
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              SkillSwap Network &copy; {new Date().getFullYear()} | Team SkillSync
            </p>
          </div>
        </AnimateIn>
      </footer>
    </div>
  );
}
