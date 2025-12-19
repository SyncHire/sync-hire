"use client";

/**
 * Landing Page Component
 *
 * Displayed to unauthenticated users on the homepage.
 * Features a bold hero section with animated elements.
 */

import Link from "next/link";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Moon,
  Sparkles,
  Sun,
  Users,
  Zap,
  Shield,
  FileText,
  Video,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-pattern opacity-30 dark:opacity-30" />
        {/* Light mode: softer, more visible gradients */}
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-cyan-400/30 via-blue-400/20 to-transparent dark:from-cyan-500/20 dark:via-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-gradient-to-tl from-indigo-400/30 via-purple-400/20 to-transparent dark:from-indigo-500/20 dark:via-purple-500/10 blur-3xl" />
        {/* Light mode accent blobs */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-gradient-to-br from-pink-300/20 to-orange-300/20 dark:from-pink-500/10 dark:to-orange-500/10 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-gradient-to-tr from-emerald-300/20 to-cyan-300/20 dark:from-emerald-500/10 dark:to-cyan-500/10 blur-3xl rounded-full" />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo size="md" asLink={false} />
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              Open Beta
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
            )}
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-1 sm:gap-2">
                Get Started
                <ArrowRight className="hidden sm:inline h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                Try Free During Beta
              </span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="block">AI interviews every candidate.</span>
              <span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                You review the best.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              Stop spending hours on screening calls. SyncHire conducts
              AI-powered video interviews 24/7, scores candidates automatically,
              and surfaces your top matches.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/signup">
                <Button size="lg" className="gap-2 px-8">
                  Start Hiring
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="px-8">
                  Find a Job
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Hero visual - Product Screenshot */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-5xl">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-indigo-500/30 dark:from-cyan-500/20 dark:via-blue-500/20 dark:to-indigo-500/20 blur-2xl rounded-3xl" />

              {/* Product screenshot */}
              <div className="relative rounded-2xl overflow-hidden border shadow-2xl border-border/50 shadow-black/10 dark:shadow-black/30">
                <Image
                  src="/screenshots/hr-applicants-scoring.png"
                  alt="SyncHire AI-powered candidate scoring dashboard"
                  width={1200}
                  height={675}
                  className="w-full h-auto"
                  priority
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 border-t border-border/40">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From job posting to hiring decision in three simple steps
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                icon: FileText,
                title: "Post Your Job",
                description:
                  "Describe the role and requirements. Our AI automatically generates tailored interview questions.",
                image: "/screenshots/hr-interview-questions.png",
              },
              {
                step: 2,
                icon: Video,
                title: "AI Interviews Candidates",
                description:
                  "Candidates complete video interviews on their schedule. Real-time transcription and analysis.",
                image: "/screenshots/interview-results.png",
              },
              {
                step: 3,
                icon: BarChart3,
                title: "Review Top Matches",
                description:
                  "AI scores and ranks every candidate. You focus on reviewing only the best matches.",
                image: "/screenshots/candidate-job-matching.png",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative"
              >
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 border border-primary/20 mb-4">
                    <span className="text-lg font-bold text-primary">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {item.description}
                  </p>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-border/50 shadow-lg">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={400}
                    height={250}
                    className="w-full h-auto"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to hire better
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              From job posting to final interview, SyncHire streamlines your
              entire hiring workflow.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Sparkles,
                title: "24/7 AI Video Interviews",
                description:
                  "Candidates interview anytime with our AI. Live transcription, natural conversation, and no scheduling hassles.",
                gradient: "from-cyan-500 to-blue-500",
              },
              {
                icon: Zap,
                title: "Smart CV Matching",
                description:
                  "Upload CVs and get instant match scores from 70-95%. AI identifies skills, gaps, and role fit automatically.",
                gradient: "from-blue-500 to-indigo-500",
              },
              {
                icon: Shield,
                title: "Structured Scoring",
                description:
                  "Every candidate scored on technical skills, communication, and experience. Detailed feedback and rankings.",
                gradient: "from-indigo-500 to-purple-500",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                <div className="group relative h-full">
                  <div className="absolute -inset-px bg-gradient-to-b from-border to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative h-full bg-card rounded-2xl p-6 border border-border/50 hover:border-border transition-colors shadow-lg shadow-black/5 dark:shadow-black/10">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4`}
                    >
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Powered By Section */}
      <section className="py-12 px-6 border-t border-border/40">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className="text-sm text-muted-foreground mb-6">
              Powered by industry-leading technology
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="currentColor"
                >
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-medium">Google Gemini</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="currentColor"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                <span className="font-medium">Stream Video</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span className="font-medium">Deepgram STT</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* For Employers / For Candidates */}
      <section className="py-20 px-6 border-t border-border/40">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            {/* For Employers */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative group"
            >
              <div className="absolute -inset-px bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              <div className="relative bg-card rounded-2xl p-8 border border-border/50 h-full shadow-lg shadow-black/5 dark:shadow-black/10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">For Employers</h3>
                <p className="text-muted-foreground mb-6">
                  Post jobs, let AI screen candidates, and review detailed
                  interview summaries. Spend less time scheduling and more time
                  making great hires.
                </p>
                <ul className="space-y-2 mb-8">
                  {[
                    "AI-powered candidate matching",
                    "Automated interview scheduling",
                    "Detailed scoring & transcripts",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="gap-2">
                    Start Hiring
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* For Candidates */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative group"
            >
              <div className="absolute -inset-px bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
              <div className="relative bg-card rounded-2xl p-8 border border-border/50 h-full shadow-lg shadow-black/5 dark:shadow-black/10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mb-6">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">For Candidates</h3>
                <p className="text-muted-foreground mb-6">
                  Interview on your schedule with our AI interviewer. Get
                  matched to relevant roles and track your applications in one
                  place.
                </p>
                <ul className="space-y-2 mb-8">
                  {[
                    "Interview anytime, anywhere",
                    "Get matched to relevant jobs",
                    "Track application status",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button variant="outline" className="gap-2">
                    Find Jobs
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-indigo-500/30 dark:from-cyan-500/20 dark:via-blue-500/20 dark:to-indigo-500/20 blur-2xl rounded-3xl" />
            <div className="relative rounded-2xl p-12 text-center border shadow-xl bg-white/80 border-border/50 shadow-black/5 dark:bg-white/5 dark:border-white/10 dark:shadow-black/20 backdrop-blur-xl">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Join the Open Beta
              </h2>
              <p className="text-muted-foreground text-lg mb-2 max-w-xl mx-auto">
                Be among the first to experience AI-powered hiring.
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Free during beta. No credit card required.
              </p>
              <Link href="/signup">
                <Button size="lg" className="gap-2 px-8">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/40">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" asLink={false} />
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} SyncHire. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
