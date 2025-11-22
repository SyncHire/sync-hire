"use client";

import { AlertCircle, Check, Eye, Pencil, Plus, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DocumentUploadSection } from "@/components/job-creation/DocumentUploadSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  EMPLOYMENT_TYPES,
  WORK_ARRANGEMENTS,
  type EmploymentType,
  type ExtractedJobData,
  type WorkArrangement,
} from "@/lib/mock-data";

// Unified question interface
interface ScreeningQuestion {
  id: string;
  content: string;
  reason?: string;
  type: "generated" | "custom";
  status: "included" | "excluded";
}

interface AISuggestion {
  original: string;
  improved: string;
}

interface JobCreationState {
  extractedData: ExtractedJobData | null;
  aiSuggestions: AISuggestion[];
  questions: ScreeningQuestion[];
  acceptedSuggestions: string[];
}

export default function JobCreationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newQuestionContent, setNewQuestionContent] = useState("");
  const [editingResponsibilities, setEditingResponsibilities] = useState(false);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [skippedRequirements, setSkippedRequirements] = useState<Set<number>>(new Set());

  const [state, setState] = useState<JobCreationState>({
    extractedData: null,
    aiSuggestions: [],
    questions: [],
    acceptedSuggestions: [],
  });

  const toggleSkipRequirement = (index: number) => {
    setSkippedRequirements((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/jobs/extract-jd", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract job description");
      }

      const result = await response.json();

      // Convert AI questions to unified format
      const aiQuestions: ScreeningQuestion[] = (result.data.aiQuestions || []).map(
        (q: { content: string; reason: string }, index: number) => ({
          id: `generated-${index}`,
          content: q.content,
          reason: q.reason,
          type: "generated" as const,
          status: "included" as const,
        })
      );

      setState((prev) => ({
        ...prev,
        extractedData: result.data.extractedData,
        aiSuggestions: result.data.aiSuggestions,
        questions: aiQuestions,
      }));

      toast.success("Job description extracted successfully!");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtractedDataChange = (
    field: keyof ExtractedJobData,
    value: unknown,
  ) => {
    setState((prev) => ({
      ...prev,
      extractedData: {
        ...prev.extractedData!,
        [field]: value,
      },
    }));
  };

  // Find suggestion for a specific item (matches by original text)
  const findSuggestionForItem = (item: string): AISuggestion | undefined => {
    return state.aiSuggestions.find(
      (s) =>
        s.original.toLowerCase().includes(item.toLowerCase().slice(0, 50)) ||
        item.toLowerCase().includes(s.original.toLowerCase().slice(0, 50))
    );
  };

  // Accept a suggestion and replace the original item
  const handleAcceptSuggestion = (
    suggestion: AISuggestion,
    field: "responsibilities" | "requirements"
  ) => {
    if (!state.extractedData) return;

    // Find and replace the matching item
    const items = [...state.extractedData[field]];
    const itemIndex = items.findIndex(
      (item) =>
        item.toLowerCase().includes(suggestion.original.toLowerCase().slice(0, 50)) ||
        suggestion.original.toLowerCase().includes(item.toLowerCase().slice(0, 50))
    );

    if (itemIndex !== -1) {
      items[itemIndex] = suggestion.improved;
      setState((prev) => ({
        ...prev,
        extractedData: {
          ...prev.extractedData!,
          [field]: items,
        },
        acceptedSuggestions: [...prev.acceptedSuggestions, suggestion.improved],
      }));
      setExpandedSuggestion(null);
      toast.success("Suggestion applied!");
    }
  };

  // Dismiss a suggestion (remove it from the list)
  const handleDismissSuggestion = (suggestion: AISuggestion) => {
    setState((prev) => ({
      ...prev,
      aiSuggestions: prev.aiSuggestions.filter((s) => s !== suggestion),
    }));
    setExpandedSuggestion(null);
    toast.info("Suggestion dismissed");
  };

  const handleToggleQuestion = (questionId: string) => {
    setState((prev) => ({
      ...prev,
      questions: prev.questions.map((q) =>
        q.id === questionId
          ? { ...q, status: q.status === "included" ? "excluded" : "included" }
          : q
      ),
    }));
  };

  const handleAddCustomQuestion = () => {
    if (!newQuestionContent.trim()) {
      toast.error("Please enter a question");
      return;
    }

    const newQuestion: ScreeningQuestion = {
      id: `custom-${Date.now()}`,
      content: newQuestionContent.trim(),
      type: "custom",
      status: "included",
    };

    setState((prev) => ({
      ...prev,
      questions: [newQuestion, ...prev.questions], // Add to top
    }));

    setNewQuestionContent("");
    setIsModalOpen(false);
    toast.success("Question added!");
  };

  const handlePublish = async () => {
    if (!state.extractedData) {
      toast.error("No extracted data found");
      return;
    }

    setIsLoading(true);

    // Filter to only included questions with content and format for the API
    const includedQuestions = state.questions
      .filter((q) => q.status === "included" && q.content.trim() !== "")
      .map((q, index) => ({
        text: q.content,
        type: "text" as const,
        duration: 2,
        order: index,
        source: q.type === "generated" ? "ai" : "custom",
      }));

    try {
      const response = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.extractedData.title,
          description: state.extractedData.responsibilities.join("\n"),
          location: state.extractedData.location,
          employmentType: state.extractedData.employmentType,
          workArrangement: state.extractedData.workArrangement,
          requirements: state.extractedData.requirements.filter((_, i) => !skippedRequirements.has(i)),
          responsibilities: state.extractedData.responsibilities,
          seniority: state.extractedData.seniority,
          customQuestions: includedQuestions,
          originalJDText: JSON.stringify(state.extractedData, null, 2),
          company: state.extractedData.company || "Company",
          employerId: "employer-1",
          aiSuggestions: state.acceptedSuggestions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create job");
      }

      const result = await response.json();
      toast.success("Job created! Redirecting...", { duration: 2000 });
      router.push(`/hr/jobs/${result.data.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create job";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate counts
  const includedCount = state.questions.filter((q) => q.status === "included").length;
  const totalCount = state.questions.length;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Add Question Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setIsModalOpen(false)}
          />
          <Card className="relative z-10 w-full max-w-md p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add Custom Question</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Question
                </label>
                <Textarea
                  placeholder="Enter your screening question..."
                  value={newQuestionContent}
                  onChange={(e) => setNewQuestionContent(e.target.value)}
                  className="mt-1"
                  rows={3}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddCustomQuestion}>
                  Add Question
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create New Job Posting
          </h1>
          <p className="text-muted-foreground">
            Upload a job description and customize your posting
          </p>
        </div>

        {!state.extractedData ? (
          // Upload step
          <Card className="p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Upload Job Description
                </h2>
                <p className="text-muted-foreground">
                  Upload a PDF file with your job description to get started
                </p>
              </div>

              <DocumentUploadSection
                onFileSelect={handleFileUpload}
                isProcessing={isLoading}
                error={uploadError}
              />
            </div>
          </Card>
        ) : (
          // Unified Extracted Data view
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main content area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Extracted Data Section */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Job Details</h2>
                    <Badge variant="outline">Extracted from PDF</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Job Title
                      </label>
                      <Input
                        value={state.extractedData.title}
                        onChange={(e) =>
                          handleExtractedDataChange("title", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Company
                      </label>
                      <Input
                        value={state.extractedData.company}
                        onChange={(e) =>
                          handleExtractedDataChange("company", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Location
                      </label>
                      <Input
                        value={state.extractedData.location}
                        onChange={(e) =>
                          handleExtractedDataChange("location", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Seniority Level
                      </label>
                      <Input
                        value={state.extractedData.seniority}
                        onChange={(e) =>
                          handleExtractedDataChange("seniority", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Employment Type
                      </label>
                      <Select
                        value={state.extractedData.employmentType}
                        onValueChange={(value: EmploymentType) =>
                          handleExtractedDataChange("employmentType", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EMPLOYMENT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">
                        Work Arrangement
                      </label>
                      <Select
                        value={state.extractedData.workArrangement}
                        onValueChange={(value: WorkArrangement) =>
                          handleExtractedDataChange("workArrangement", value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select work arrangement" />
                        </SelectTrigger>
                        <SelectContent>
                          {WORK_ARRANGEMENTS.map((arrangement) => (
                            <SelectItem key={arrangement} value={arrangement}>
                              {arrangement}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Responsibilities - View/Edit Mode */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">
                        Responsibilities ({state.extractedData.responsibilities.length})
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingResponsibilities(!editingResponsibilities)}
                        className="h-7 px-2"
                      >
                        {editingResponsibilities ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Done
                          </>
                        ) : (
                          <>
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </div>
                    {editingResponsibilities ? (
                      <Textarea
                        value={state.extractedData.responsibilities.join("\n")}
                        onChange={(e) =>
                          handleExtractedDataChange(
                            "responsibilities",
                            e.target.value.split("\n").filter((line) => line.trim()),
                          )
                        }
                        className="mt-1"
                        rows={8}
                        placeholder="Enter each responsibility on a new line..."
                      />
                    ) : (
                      <div className="mt-2 space-y-2">
                        {state.extractedData.responsibilities.length === 0 ? (
                          <p className="text-muted-foreground/60 italic text-sm py-4 text-center">
                            No responsibilities listed
                          </p>
                        ) : (
                          state.extractedData.responsibilities.map((item, i) => {
                            const suggestion = findSuggestionForItem(item);
                            const isExpanded = expandedSuggestion === `resp-${i}`;
                            const isAccepted = suggestion && state.acceptedSuggestions.includes(suggestion.improved);

                            return (
                              <div key={i}>
                                <div
                                  className={`flex items-start gap-3 p-2.5 rounded-md transition-colors ${
                                    isExpanded ? "bg-primary/5" : "hover:bg-muted/50"
                                  }`}
                                >
                                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center mt-0.5">
                                    {i + 1}
                                  </span>
                                  <span className="text-sm text-foreground leading-relaxed flex-1">{item}</span>
                                  {suggestion && !isAccepted && (
                                    <button
                                      type="button"
                                      onClick={() => setExpandedSuggestion(isExpanded ? null : `resp-${i}`)}
                                      className={`flex-shrink-0 p-1 rounded transition-all ${
                                        isExpanded
                                          ? "bg-primary text-primary-foreground"
                                          : "text-primary/60 hover:text-primary hover:bg-primary/10"
                                      }`}
                                      title="AI has a suggestion"
                                    >
                                      <Sparkles className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                {isExpanded && suggestion && (
                                  <div className="ml-8 mt-1 mb-2 p-3 rounded-lg bg-secondary/50 border border-border">
                                    <p className="text-sm text-foreground mb-2">{suggestion.improved}</p>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleAcceptSuggestion(suggestion, "responsibilities")}
                                      >
                                        <Check className="w-3 h-3 mr-1" />
                                        Apply
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => handleDismissSuggestion(suggestion)}
                                      >
                                        Dismiss
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  {/* Requirements - View/Edit Mode */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">
                        Requirements ({state.extractedData.requirements.length - skippedRequirements.size}{skippedRequirements.size > 0 ? ` / ${state.extractedData.requirements.length}` : ''})
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRequirements(!editingRequirements)}
                        className="h-7 px-2"
                      >
                        {editingRequirements ? (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Done
                          </>
                        ) : (
                          <>
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </>
                        )}
                      </Button>
                    </div>
                    {editingRequirements ? (
                      <Textarea
                        value={state.extractedData.requirements.join("\n")}
                        onChange={(e) =>
                          handleExtractedDataChange(
                            "requirements",
                            e.target.value.split("\n").filter((line) => line.trim()),
                          )
                        }
                        className="mt-1"
                        rows={8}
                        placeholder="Enter each requirement on a new line..."
                      />
                    ) : (
                      <div className="mt-2 space-y-2">
                        {state.extractedData.requirements.length === 0 ? (
                          <p className="text-muted-foreground/60 italic text-sm py-4 text-center">
                            No requirements listed
                          </p>
                        ) : (
                          state.extractedData.requirements.map((item, i) => {
                            const suggestion = findSuggestionForItem(item);
                            const isExpanded = expandedSuggestion === `req-${i}`;
                            const isAccepted = suggestion && state.acceptedSuggestions.includes(suggestion.improved);
                            const isSkipped = skippedRequirements.has(i);

                            return (
                              <div key={i}>
                                <div
                                  className={`flex items-start gap-3 p-2.5 rounded-md transition-colors ${
                                    isSkipped ? "opacity-50" : isExpanded ? "bg-primary/5" : "hover:bg-muted/50"
                                  }`}
                                >
                                  <span className={`flex-shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center mt-0.5 ${
                                    isSkipped ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                                  }`}>
                                    {i + 1}
                                  </span>
                                  <span className={`text-sm leading-relaxed flex-1 ${
                                    isSkipped ? "line-through text-muted-foreground" : "text-foreground"
                                  }`}>{item}</span>
                                  <div className="flex items-center gap-1">
                                    {suggestion && !isAccepted && !isSkipped && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedSuggestion(isExpanded ? null : `req-${i}`)}
                                        className={`flex-shrink-0 p-1 rounded transition-all ${
                                          isExpanded
                                            ? "bg-primary text-primary-foreground"
                                            : "text-primary/60 hover:text-primary hover:bg-primary/10"
                                        }`}
                                        title="AI has a suggestion"
                                      >
                                        <Sparkles className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => toggleSkipRequirement(i)}
                                      className={`flex-shrink-0 p-1 rounded transition-all ${
                                        isSkipped
                                          ? "text-primary hover:bg-primary/10"
                                          : "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                                      }`}
                                      title={isSkipped ? "Restore requirement" : "Skip requirement"}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {isExpanded && suggestion && !isSkipped && (
                                  <div className="ml-8 mt-1 mb-2 p-3 rounded-lg bg-secondary/50 border border-border">
                                    <p className="text-sm text-foreground mb-2">{suggestion.improved}</p>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => handleAcceptSuggestion(suggestion, "requirements")}
                                      >
                                        <Check className="w-3 h-3 mr-1" />
                                        Apply
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 text-xs"
                                        onClick={() => handleDismissSuggestion(suggestion)}
                                      >
                                        Dismiss
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* Screening Questions Section */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">
                      Screening Questions
                    </h2>
                    <Button onClick={() => setIsModalOpen(true)} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Click on a question to toggle include/exclude. Custom questions appear at the top.
                  </p>

                  {/* Unified Question List */}
                  {state.questions.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center">
                      No questions yet. Upload a job description to generate AI questions or add custom ones.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {state.questions.map((question) => {
                        const isExcluded = question.status === "excluded";
                        const isCustom = question.type === "custom";
                        return (
                          <div
                            key={question.id}
                            onClick={() => handleToggleQuestion(question.id)}
                            className={`border rounded-md p-2 cursor-pointer transition-all ${
                              isExcluded
                                ? "opacity-50 border-dashed bg-muted/30"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 h-5 shrink-0 font-medium ${
                                  isCustom
                                    ? "bg-primary/10 text-primary border-primary/30"
                                    : "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400"
                                }`}
                              >
                                {isCustom ? "Custom" : "AI"}
                              </Badge>
                              <p className={`text-sm flex-1 ${isExcluded ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {question.content}
                              </p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 font-medium ${
                                isExcluded
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-green-500/15 text-green-600 dark:text-green-400"
                              }`}>
                                {isExcluded ? "Skip" : "Include"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>

            </div>

            {/* Sidebar - Sticky on scroll with max height */}
            <div className="space-y-6 sticky top-[6rem] self-start max-h-[calc(100vh-7rem)] overflow-y-auto">
              {/* Questions Summary */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-4 h-4" />
                  <h3 className="font-semibold">Questions Summary</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Included</span>
                    <Badge variant="default">{includedCount}</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Excluded</span>
                    <Badge variant="secondary">{totalCount - includedCount}</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 font-medium">
                    <span>Total</span>
                    <Badge variant="outline">{totalCount}</Badge>
                  </div>
                </div>

                {/* Preview of included questions */}
                {includedCount > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Questions to be included:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {state.questions
                        .filter((q) => q.status === "included")
                        .map((q) => (
                          <p
                            key={q.id}
                            className={`text-xs truncate ${q.type === "custom" ? "text-purple-600" : "text-foreground"}`}
                          >
                            • {q.content}
                          </p>
                        ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Actions */}
              <Card className="p-6">
                <Button
                  onClick={handlePublish}
                  disabled={
                    isLoading ||
                    !state.extractedData.title ||
                    !state.extractedData.location
                  }
                  className="w-full"
                >
                  {isLoading ? "Creating Job..." : "Create Job Posting"}
                </Button>
                {!state.extractedData.title || !state.extractedData.location ? (
                  <p className="text-xs text-muted-foreground mt-2">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Title and location are required
                  </p>
                ) : null}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
