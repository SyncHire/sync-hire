"use client";

import {
  ArrowLeft,
  BrainCircuit,
  Building2,
  Check,
  Clock,
  DollarSign,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useSaveJobQuestions, useGenerateJobQuestions, useUpdateJobSettings, useMatchCandidates, useJob } from "@/lib/hooks/use-job-questions";
import type { Job } from "@/lib/mock-data";

interface Question {
  id: string;
  text: string;
  type: "text" | "video" | "code";
  duration: number;
}

export default function HRJDDetail() {
  const params = useParams();
  const jobId = params?.id as string | undefined;

  // Track previous status for toast notification
  const [prevStatus, setPrevStatus] = useState<string | undefined>();

  // Fetch job with react-query, poll while scanning
  const { data: job, isLoading } = useJob(jobId, { pollWhileScanning: true });

  const [questions, setQuestions] = useState<Question[]>([]);

  // Question management state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newQuestion, setNewQuestion] = useState<{ text: string; type: "text" | "video" | "code"; duration: number }>({ text: "", type: "text", duration: 2 });

  // AI Matching settings state - derived from job data
  const [aiMatchingEnabled, setAiMatchingEnabled] = useState(true);

  // React Query mutations
  const saveQuestionsMutation = useSaveJobQuestions();
  const generateQuestionsMutation = useGenerateJobQuestions();
  const updateSettingsMutation = useUpdateJobSettings();
  const matchCandidatesMutation = useMatchCandidates();

  // Sync local state with job data
  useEffect(() => {
    if (job) {
      if (job.questions) {
        setQuestions(job.questions);
      }
      setAiMatchingEnabled(job.aiMatchingEnabled ?? true);

      // Show toast when scanning completes
      if (prevStatus === "scanning" && job.aiMatchingStatus === "complete") {
        toast.success(`Scanning complete! Found ${job.applicantsCount || 0} matching candidates.`, { duration: 4000 });
      }
      setPrevStatus(job.aiMatchingStatus);
    }
  }, [job, prevStatus]);

  // Add a new question
  const handleAddQuestion = () => {
    if (!newQuestion.text.trim()) {
      toast.error("Please enter a question");
      return;
    }
    const question: Question = {
      id: `q-${Date.now()}`,
      text: newQuestion.text.trim(),
      type: newQuestion.type,
      duration: newQuestion.duration,
    };
    setQuestions((prev) => [...prev, question]);
    setNewQuestion({ text: "", type: "text", duration: 2 });
    setIsAddModalOpen(false);
    setHasUnsavedChanges(true);
    toast.success("Question added - remember to save!");
  };

  // Update an existing question
  const handleUpdateQuestion = () => {
    if (!editingQuestion || !editingQuestion.text.trim()) {
      toast.error("Please enter a question");
      return;
    }
    setQuestions((prev) =>
      prev.map((q) => (q.id === editingQuestion.id ? editingQuestion : q))
    );
    setEditingQuestion(null);
    setHasUnsavedChanges(true);
    toast.success("Question updated - remember to save!");
  };

  // Delete a question
  const handleDeleteQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setHasUnsavedChanges(true);
  };

  // Generate AI questions
  const handleGenerateQuestions = () => {
    if (!job) return;
    generateQuestionsMutation.mutate(
      {
        jobId: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
      },
      {
        onSuccess: (result) => {
          const aiQuestions: Question[] = (result.data?.questions || []).map(
            (q: { content: string; reason?: string }, i: number) => ({
              id: `ai-${Date.now()}-${i}`,
              text: q.content,
              type: "text" as const,
              duration: 2,
            })
          );
          setQuestions((prev) => [...prev, ...aiQuestions]);
          setHasUnsavedChanges(true);
          toast.success(`Generated ${aiQuestions.length} questions - remember to save!`);
        },
      }
    );
  };

  // Save questions to job
  const handleSaveQuestions = () => {
    if (!job) return;
    saveQuestionsMutation.mutate(
      { jobId: job.id, questions },
      {
        onSuccess: () => {
          setHasUnsavedChanges(false);
        },
      }
    );
  };

  // Toggle AI Matching and trigger candidate matching
  const handleToggleAiMatching = (enabled: boolean) => {
    if (!job) return;
    setAiMatchingEnabled(enabled);

    updateSettingsMutation.mutate(
      { jobId: job.id, aiMatchingEnabled: enabled },
      {
        onSuccess: () => {
          if (enabled) {
            toast.success("AI Matching enabled - scanning for candidates...");
            matchCandidatesMutation.mutate({ jobId: job.id });
          } else {
            toast.success("AI Matching disabled");
          }
        },
        onError: () => {
          setAiMatchingEnabled(!enabled); // Revert on error
        },
      }
    );
  };

  // Rescan for candidates
  const handleRescanCandidates = () => {
    if (!job) return;
    matchCandidatesMutation.mutate({ jobId: job.id });
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 px-4 py-8">
        <Link href="/hr/jobs">
          <Button
            variant="ghost"
            className="pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-foreground w-fit -ml-3 h-auto py-0 gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Jobs
          </Button>
        </Link>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Job not found
          </h2>
          <p className="text-muted-foreground mb-4">
            The job you're looking for doesn't exist.
          </p>
          <Link href="/hr/jobs">
            <Button>Return to Jobs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-6 border-b border-border pb-8">
        <Link href="/hr/jobs">
          <Button
            variant="ghost"
            className="pl-0 hover:pl-2 transition-all text-muted-foreground hover:text-foreground w-fit -ml-3 h-auto py-0 gap-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Jobs
          </Button>
        </Link>

        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h1 className="text-3xl font-bold text-foreground tracking-tight">
                {job.title}
              </h1>
              <Badge
                variant="secondary"
                className="bg-green-500/10 text-green-500 border-green-500/20 font-normal px-2.5 py-0.5"
              >
                Active
              </Badge>
            </div>
            <p className="text-lg text-muted-foreground mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              {job.company}
            </p>
            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />{" "}
                {job.location}
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <DollarSign className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />{" "}
                {job.salary}
              </span>
              <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border">
                <Clock className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />{" "}
                {job.type}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-10 px-5 border-border bg-secondary/50 hover:bg-secondary"
            >
              Edit Job
            </Button>
            <Link href={`/hr/applicants/${job.id}`}>
              <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 border-0">
                {job.aiMatchingStatus === "scanning" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  `View Applicants (${job.applicantsCount || 0})`
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <div className="flex items-center justify-between mb-8">
          <TabsList className="h-11 bg-secondary/30 p-1 border border-border">
            <TabsTrigger value="details" className="text-sm h-9 px-6">
              Details
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-sm h-9 px-6">
              AI Interview
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-sm h-9 px-6">
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="details"
          className="space-y-8 animate-in fade-in duration-300"
        >
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-2 space-y-8">
              <div className="space-y-4 p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground">
                  About the Role
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {job.description}
                </p>
              </div>

              <div className="space-y-4 p-6 rounded-xl bg-card border border-border">
                <h3 className="text-lg font-semibold text-foreground">
                  Requirements
                </h3>
                <ul className="space-y-3">
                  {job.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <div className="h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      </div>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-500/10 via-transparent to-transparent border border-purple-500/20">
                <div className="flex items-center gap-2 text-purple-400 font-medium mb-4">
                  <BrainCircuit className="h-5 w-5" /> AI Insights
                </div>
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  Our AI predicts this role will take{" "}
                  <span className="text-foreground font-bold">14 days</span> to
                  fill. We recommend adding 2 more technical questions to
                  improve candidate filtering.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full text-xs"
                >
                  View Market Data
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent
          value="questions"
          className="space-y-6 animate-in fade-in duration-300"
        >
          <div className="flex justify-between items-center p-6 rounded-xl bg-secondary/20 border border-border">
            <div>
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                Interview Configuration
                <Badge
                  variant="outline"
                  className="text-[10px] border-blue-500/30 text-blue-400"
                >
                  AI POWERED
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Questions asked by the AI interviewer during the video session.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                size="sm"
                variant="outline"
                className="gap-2 border-blue-500/30 text-blue-500 hover:bg-blue-500/10"
                onClick={handleGenerateQuestions}
                disabled={generateQuestionsMutation.isPending}
              >
                {generateQuestionsMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {generateQuestionsMutation.isPending ? "Generating..." : "Generate with AI"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setIsAddModalOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" /> Add Question
              </Button>
              {hasUnsavedChanges && (
                <Button
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleSaveQuestions}
                  disabled={saveQuestionsMutation.isPending}
                >
                  {saveQuestionsMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {saveQuestionsMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <Sparkles className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">No interview questions yet</p>
              <div className="flex justify-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateQuestions}
                  disabled={generateQuestionsMutation.isPending}
                >
                  {generateQuestionsMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                  )}
                  {generateQuestionsMutation.isPending ? "Generating..." : "Generate with AI"}
                </Button>
                <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Add Manually
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, i) => (
                <div
                  key={q.id}
                  className="group flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center justify-center h-7 w-7 rounded-md bg-secondary text-sm font-medium text-muted-foreground border border-border group-hover:text-blue-500 group-hover:border-blue-500/30 transition-colors">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-relaxed">
                      {q.text}
                    </p>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1.5">
                      <Clock className="h-3 w-3" /> {q.duration} min
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingQuestion(q)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="settings"
          className="space-y-6 animate-in fade-in duration-300"
        >
          {/* AI Matching Settings */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-500" />
                  <h3 className="text-lg font-semibold text-foreground">
                    AI Candidate Matching
                  </h3>
                  {aiMatchingEnabled && (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                      ON
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground max-w-md">
                  Automatically find and match candidates from the CV pool. When enabled,
                  candidates with 80%+ match score will be auto-applied and receive personalized
                  interview questions.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {matchCandidatesMutation.isPending && (
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </span>
                )}
                <Switch
                  checked={aiMatchingEnabled}
                  onCheckedChange={handleToggleAiMatching}
                  disabled={updateSettingsMutation.isPending || matchCandidatesMutation.isPending}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
            </div>

            {aiMatchingEnabled && (
              <div className="mt-6 pt-6 border-t border-border">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground">Match Threshold</p>
                    <p className="text-2xl font-bold text-foreground">80%</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground">Matched Candidates</p>
                    <p className="text-2xl font-bold text-foreground">{job.applicantsCount}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-xs text-muted-foreground">Questions Ready</p>
                    <p className="text-2xl font-bold text-foreground">{job.applicantsCount}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="mt-4 gap-2"
                  onClick={handleRescanCandidates}
                  disabled={matchCandidatesMutation.isPending}
                >
                  {matchCandidatesMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {matchCandidatesMutation.isPending ? "Scanning..." : "Rescan for Candidates"}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Question Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Interview Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Question</label>
              <Textarea
                placeholder="Enter your interview question..."
                value={newQuestion.text}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, text: e.target.value }))}
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Duration (min)</label>
              <Input
                type="number"
                min={1}
                max={10}
                value={newQuestion.duration}
                onChange={(e) => setNewQuestion((prev) => ({ ...prev, duration: parseInt(e.target.value) || 2 }))}
              />
              <p className="text-xs text-muted-foreground">How long the candidate should spend answering this question</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddQuestion}>Add Question</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Question Modal */}
      <Dialog open={!!editingQuestion} onOpenChange={(open) => !open && setEditingQuestion(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Question</label>
                <Textarea
                  placeholder="Enter your interview question..."
                  value={editingQuestion.text}
                  onChange={(e) => setEditingQuestion((prev) => prev ? { ...prev, text: e.target.value } : null)}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Duration (min)</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={editingQuestion.duration}
                  onChange={(e) => setEditingQuestion((prev) => prev ? { ...prev, duration: parseInt(e.target.value) || 2 } : null)}
                />
                <p className="text-xs text-muted-foreground">How long the candidate should spend answering this question</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingQuestion(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateQuestion}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
