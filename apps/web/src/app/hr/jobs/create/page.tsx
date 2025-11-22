"use client";

import { AlertCircle, Check, Eye, Pencil, Plus, X } from "lucide-react";
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

  const [state, setState] = useState<JobCreationState>({
    extractedData: null,
    aiSuggestions: [],
    questions: [],
    acceptedSuggestions: [],
  });

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

  const handleAcceptSuggestion = (index: number) => {
    setState((prev) => {
      const suggestion = prev.aiSuggestions[index];
      return {
        ...prev,
        acceptedSuggestions: [...prev.acceptedSuggestions, suggestion.improved],
      };
    });
    toast.success("Suggestion accepted!");
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

    // Filter to only included questions with content
    const includedQuestions = state.questions
      .filter((q) => q.status === "included" && q.content.trim() !== "")
      .map((q, index) => ({
        content: q.content,
        required: false,
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
          requirements: state.extractedData.requirements,
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
                      <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
                        {state.extractedData.responsibilities.length === 0 ? (
                          <li className="text-muted-foreground/60 italic">No responsibilities listed</li>
                        ) : (
                          state.extractedData.responsibilities.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </div>

                  {/* Requirements - View/Edit Mode */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">
                        Requirements ({state.extractedData.requirements.length})
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
                      <ul className="mt-1 space-y-1.5 text-sm text-muted-foreground">
                        {state.extractedData.requirements.length === 0 ? (
                          <li className="text-muted-foreground/60 italic">No requirements listed</li>
                        ) : (
                          state.extractedData.requirements.map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))
                        )}
                      </ul>
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
                    <div className="space-y-2">
                      {state.questions.map((question) => {
                        const isExcluded = question.status === "excluded";
                        const isCustom = question.type === "custom";
                        return (
                          <div
                            key={question.id}
                            onClick={() => handleToggleQuestion(question.id)}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${
                              isExcluded
                                ? "bg-muted/50 opacity-60 border-dashed"
                                : isCustom
                                  ? "bg-purple-50/50 hover:bg-purple-100/50 border-purple-200"
                                  : "bg-blue-50/50 hover:bg-blue-100/50"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {isCustom ? "Custom" : "AI Generated"}
                                  </Badge>
                                </div>
                                <p className={`font-medium ${isExcluded ? "line-through text-muted-foreground" : ""}`}>
                                  {question.content}
                                </p>
                                {question.reason && (
                                  <span className="text-xs text-muted-foreground mt-1 block">
                                    {question.reason}
                                  </span>
                                )}
                              </div>
                              <Badge
                                variant={isExcluded ? "secondary" : "default"}
                                className="ml-2 shrink-0"
                              >
                                {isExcluded ? "Excluded" : "Included"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>

              {/* AI Suggestions Section - For JD improvements */}
              <Card className="p-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">AI Suggestions for Job Description</h2>

                  {state.aiSuggestions.length === 0 ? (
                    <p className="text-muted-foreground">
                      No suggestions available
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {state.aiSuggestions.map((suggestion, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm text-muted-foreground">
                              Suggestion
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAcceptSuggestion(index)}
                              disabled={state.acceptedSuggestions.includes(
                                suggestion.improved,
                              )}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>
                              <strong>Original:</strong> {suggestion.original}
                            </p>
                            <p>
                              <strong>Improved:</strong> {suggestion.improved}
                            </p>
                          </div>
                        </div>
                      ))}
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
