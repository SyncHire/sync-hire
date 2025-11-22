"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Check, Eye, AlertCircle } from "lucide-react";
import { DocumentUploadSection } from "@/components/job-creation/DocumentUploadSection";
import type { ExtractedJobData } from "@/lib/mock-data";

interface AIQuestion {
  content: string;
  reason: string;
}

interface AISuggestion {
  original: string;
  improved: string;
}

interface JobCreationState {
  extractedData: ExtractedJobData | null;
  aiSuggestions: AISuggestion[];
  aiQuestions: AIQuestion[];
  customQuestions: Array<{
    content: string;
    required: boolean;
    order: number;
  }>;
  acceptedSuggestions: string[]; // Track accepted suggestions by index
}

export default function JobCreationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [state, setState] = useState<JobCreationState>({
    extractedData: null,
    aiSuggestions: [],
    aiQuestions: [],
    customQuestions: [],
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

      setState((prev) => ({
        ...prev,
        extractedData: result.data.extractedData,
        aiSuggestions: result.data.aiSuggestions,
        aiQuestions: result.data.aiQuestions,
        extractionHash: result.data.id,
        originalText: file.name,
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
    value: unknown
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
      const newAcceptedSuggestions = [...prev.acceptedSuggestions, suggestion.improved];

      return {
        ...prev,
        acceptedSuggestions: newAcceptedSuggestions,
      };
    });

    toast.success("Suggestion accepted!");
  };

  const handleAddAIQuestion = (aiQuestion: AIQuestion) => {
    setState((prev) => ({
      ...prev,
      customQuestions: [
        ...prev.customQuestions,
        {
          content: aiQuestion.content,
          required: false,
          order: prev.customQuestions.length,
        },
      ],
    }));

    toast.success("Question added to custom questions!");
  };

  const handleAddCustomQuestion = () => {
    setState((prev) => ({
      ...prev,
      customQuestions: [
        ...prev.customQuestions,
        {
          content: "",
          required: false,
          order: prev.customQuestions.length,
        },
      ],
    }));
  };

  const handleQuestionChange = (index: number, field: string, value: any) => {
    setState((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.map((q, i) =>
        i === index ? { ...q, [field]: value } : q
      ),
    }));
  };

  const handleDeleteQuestion = (index: number) => {
    setState((prev) => ({
      ...prev,
      customQuestions: prev.customQuestions.filter((_, i) => i !== index),
    }));
  };

  const handlePublish = async () => {
    if (!state.extractedData) {
      toast.error("No extracted data found");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.extractedData.title,
          description: state.extractedData.responsibilities.join("\n"),
          location: state.extractedData.location,
          employmentType: state.extractedData.employmentType,
          requirements: state.extractedData.requirements,
          responsibilities: state.extractedData.responsibilities,
          seniority: state.extractedData.seniority,
          customQuestions: state.customQuestions,
          originalJDText: JSON.stringify(state.extractedData, null, 2),
          company: "Company",
          employerId: "employer-1",
          aiSuggestions: state.acceptedSuggestions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create job");
      }

      const result = await response.json();
      toast.success("Job created! Redirecting...", {
        duration: 2000,
      });
      setIsLoading(true);
      router.push(`/hr/jobs/${result.data.id}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create job";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-background p-6">
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
                      <label className="text-sm font-medium text-foreground">Job Title</label>
                      <Input
                        value={state.extractedData.title}
                        onChange={(e) =>
                          handleExtractedDataChange("title", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">Location</label>
                      <Input
                        value={state.extractedData.location}
                        onChange={(e) =>
                          handleExtractedDataChange("location", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">Seniority Level</label>
                      <Input
                        value={state.extractedData.seniority}
                        onChange={(e) =>
                          handleExtractedDataChange("seniority", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground">Employment Type</label>
                      <Input
                        value={state.extractedData.employmentType}
                        onChange={(e) =>
                          handleExtractedDataChange("employmentType", e.target.value)
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Responsibilities</label>
                    <Textarea
                      value={state.extractedData.responsibilities.join("\n")}
                      onChange={(e) =>
                        handleExtractedDataChange("responsibilities", e.target.value.split("\n"))
                      }
                      className="mt-1"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">Requirements</label>
                    <Textarea
                      value={state.extractedData.requirements.join("\n")}
                      onChange={(e) =>
                        handleExtractedDataChange("requirements", e.target.value.split("\n"))
                      }
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                </div>
              </Card>

              {/* AI Suggestions Section */}
              <Card className="p-6">
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">AI Suggestions</h2>

                  {state.aiSuggestions.length === 0 ? (
                    <p className="text-muted-foreground">No suggestions available</p>
                  ) : (
                    <div className="space-y-3">
                      {state.aiSuggestions.map((suggestion, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-sm text-muted-foreground">
                              Suggestion
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAcceptSuggestion(index)}
                                disabled={state.acceptedSuggestions.includes(suggestion.improved)}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p><strong>Original:</strong> {suggestion.original}</p>
                            <p><strong>Improved:</strong> {suggestion.improved}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              {/* Custom Questions Section */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Screening Questions</h2>
                    <Button onClick={handleAddCustomQuestion} size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {/* AI Suggested Questions */}
                  {state.aiQuestions.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">AI-Recommended Questions</h3>
                      <div className="space-y-2">
                        {state.aiQuestions.map((question, index) => (
                          <div key={index} className="border rounded-lg p-3 bg-blue-50/50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{question.content}</p>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">{question.reason}</span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddAIQuestion(question)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Custom Questions */}
                  <div>
                    <h3 className="text-lg font-medium mb-3">Custom Questions</h3>
                    {state.customQuestions.length === 0 ? (
                      <p className="text-muted-foreground">No custom questions added yet</p>
                    ) : (
                      <div className="space-y-3">
                        {state.customQuestions.map((question, index) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-1 space-y-2">
                                <Input
                                  placeholder="Question text"
                                  value={question.content}
                                  onChange={(e) => handleQuestionChange(index, "content", e.target.value)}
                                />
                                <div className="flex gap-2 items-center">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`required-${index}`}
                                      checked={question.required}
                                      onCheckedChange={(checked) =>
                                        handleQuestionChange(index, "required", checked)
                                      }
                                    />
                                    <label htmlFor={`required-${index}`} className="text-sm">
                                      Required
                                    </label>
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteQuestion(index)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Live Preview */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-4 h-4" />
                  <h3 className="font-semibold">Live Preview</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <p className="font-medium">{state.extractedData.title || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium">{state.extractedData.location || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Questions:</span>
                    <p className="font-medium">
                      {state.customQuestions.length} custom, {state.aiQuestions.length} AI suggested
                    </p>
                  </div>
                  {state.acceptedSuggestions.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">Improvements:</span>
                      <p className="font-medium">{state.acceptedSuggestions.length} applied</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Actions */}
              <Card className="p-6">
                <Button
                  onClick={handlePublish}
                  disabled={isLoading || !state.extractedData.title || !state.extractedData.location}
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