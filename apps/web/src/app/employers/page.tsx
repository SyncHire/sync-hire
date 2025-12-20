"use client";

/**
 * Employers Landing Page
 *
 * Public marketing page for potential employers.
 * Shows value proposition and CTA to create organization.
 */

import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { organization, useSession } from "@/lib/auth-client";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Screening",
    description:
      "Our AI conducts initial interviews, saving you hours of screening time per candidate.",
  },
  {
    icon: Users,
    title: "Smart Candidate Matching",
    description:
      "Automatically match job requirements with candidate CVs to find the best fits.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description:
      "Candidates can interview anytime, anywhere. No scheduling conflicts.",
  },
  {
    icon: BarChart3,
    title: "Data-Driven Insights",
    description:
      "Get detailed analytics and AI evaluations to make informed hiring decisions.",
  },
];

const benefits = [
  "Reduce time-to-hire by up to 70%",
  "Screen more candidates without more effort",
  "Consistent, unbiased initial interviews",
  "Detailed transcripts and AI analysis",
  "Seamless integration with your workflow",
];

export default function EmployersPage() {
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();

  const { data: orgs, isLoading: orgsLoading } = useQuery({
    queryKey: ["organizations", "list"],
    queryFn: async () => {
      const result = await organization.list();
      return result.data || [];
    },
    enabled: !!session,
  });

  const isLoading = sessionPending || (!!session && orgsLoading);
  const hasOrganization = orgs && orgs.length > 0;

  function handleCTA() {
    if (!session) {
      router.push("/signup?callbackUrl=/create-organization");
    } else if (hasOrganization) {
      router.push("/hr/jobs");
    } else {
      router.push("/create-organization");
    }
  }

  function getCTAText() {
    if (!session) {
      return "Get Started Free";
    }
    if (hasOrganization) {
      return "Go to Dashboard";
    }
    return "Create Organization";
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-4">
            {session ? (
              <Link href="/candidate/jobs">
                <Button variant="ghost">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Hire Smarter with
            <span className="bg-gradient-to-r from-primary/80 via-primary to-primary/80 bg-clip-text text-transparent">
              {" "}
              AI-Powered
            </span>{" "}
            Interviews
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Screen candidates 10x faster with AI interviews. Post a job, let our
            AI conduct initial screenings, and focus your time on the best
            matches.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleCTA} disabled={isLoading}>
              {isLoading ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <>
                  {getCTAText()}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Link href="/candidate/jobs">
              <Button size="lg" variant="outline">
                I&apos;m Looking for a Job
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything You Need to Hire Efficiently
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-card p-6 rounded-xl border shadow-sm"
              >
                <feature.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg">Post Your Job</h3>
                <p className="text-muted-foreground">
                  Upload your job description or create one from scratch. Our AI
                  extracts requirements and generates screening questions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg">AI Matches Candidates</h3>
                <p className="text-muted-foreground">
                  Our AI analyzes uploaded CVs and matches them to your job
                  requirements, ranking candidates by fit.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  Automated AI Interviews
                </h3>
                <p className="text-muted-foreground">
                  Candidates complete AI-powered video interviews at their
                  convenience. No scheduling required.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-lg">Review & Decide</h3>
                <p className="text-muted-foreground">
                  Review AI-generated summaries, transcripts, and scores. Focus
                  your time on the most promising candidates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Why Choose SyncHire?</h2>
              <ul className="space-y-4">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card p-8 rounded-xl border shadow-sm text-center">
              <h3 className="text-2xl font-bold mb-2">
                Ready to Transform Your Hiring?
              </h3>
              <p className="text-muted-foreground mb-6">
                Join companies using AI to find the best talent faster.
              </p>
              <Button size="lg" onClick={handleCTA} disabled={isLoading}>
                {isLoading ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <>
                    {getCTAText()}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} SyncHire. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
