"use client";

/**
 * Landing Page Component
 *
 * Displayed to unauthenticated users on the homepage.
 * Features a bold hero section with animated elements.
 */

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Moon, Sparkles, Sun, Users, Zap, Shield } from "lucide-react";
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
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Logo size="md" asLink={false} />
          <div className="flex items-center gap-4">
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
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="gap-2">
                Get Started
                <ArrowRight className="h-4 w-4" />
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
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium">AI-Powered Interviews</span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
            >
              <span className="block">Hire smarter.</span>
              <span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Interview faster.
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              SyncHire uses AI to conduct preliminary interviews, evaluate
              candidates, and surface the best matches — so you can focus on
              what matters.
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

          {/* Hero visual */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-4xl">
              {/* Glow effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-indigo-500/30 dark:from-cyan-500/20 dark:via-blue-500/20 dark:to-indigo-500/20 blur-2xl rounded-3xl" />

              {/* Main visual container */}
              <div className="relative rounded-2xl p-8 border shadow-xl bg-white/80 border-border/50 shadow-black/5 dark:bg-white/5 dark:border-white/10 dark:shadow-black/20 backdrop-blur-xl">
                <div className="grid grid-cols-3 gap-4">
                  {/* Left panel - Job card */}
                  <div className="col-span-1 space-y-4">
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
                      <div className="h-3 w-20 bg-foreground/20 rounded mb-3" />
                      <div className="h-2 w-full bg-foreground/10 rounded mb-2" />
                      <div className="h-2 w-3/4 bg-foreground/10 rounded" />
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-4 border border-border/50">
                      <div className="h-3 w-16 bg-foreground/20 rounded mb-3" />
                      <div className="h-2 w-full bg-foreground/10 rounded mb-2" />
                      <div className="h-2 w-2/3 bg-foreground/10 rounded" />
                    </div>
                  </div>

                  {/* Center panel - Video call */}
                  <div className="col-span-2 bg-secondary/30 rounded-xl p-4 border border-border/50 relative overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-indigo-500/10 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 mx-auto mb-3 flex items-center justify-center">
                          <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          AI Interview in Progress
                        </div>
                      </div>
                    </div>
                    {/* Small candidate video */}
                    <div className="absolute bottom-6 right-6 w-24 h-18 bg-secondary rounded-lg border border-border/50" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
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
                title: "AI Interviews",
                description:
                  "Our AI conducts natural, conversational interviews 24/7, asking tailored questions based on the role.",
                gradient: "from-cyan-500 to-blue-500",
              },
              {
                icon: Zap,
                title: "Instant Matching",
                description:
                  "Upload a job description and we'll automatically match and rank candidates from your talent pool.",
                gradient: "from-blue-500 to-indigo-500",
              },
              {
                icon: Shield,
                title: "Fair & Consistent",
                description:
                  "Every candidate gets the same quality interview experience, reducing bias and improving outcomes.",
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
                Ready to transform your hiring?
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Join companies using SyncHire to find and hire top talent
                faster.
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
