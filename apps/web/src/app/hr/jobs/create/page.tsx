"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DocumentUploadSection } from "@/components/job-creation/DocumentUploadSection";
import type { ExtractedJobData, CustomQuestion, QuestionType } from "@/lib/mock-data";

type Step = 1 | 2 | 3 | 4 | 5;

interface JobCreationState {
  extractedData: ExtractedJobData | null;
  extractionHash?: string;
  originalText: string;
  customQuestions: Array<{
    type: QuestionType;
    content: string;
    required: boolean;
    order: number;
    options?: string[];
    scoringConfig?: { type: string; min: number; max: number };
  }>;
}

export default function JobCreationPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [state, setState] = useState<JobCreationState>({
    extractedData: null,
    originalText: "",
    customQuestions: [],
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
        extractionHash: result.data.id,
        originalText: file.name,
      }));

      toast.success("Job description extracted successfully!");
      setCurrentStep(2);
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

  const handleAddQuestion = () => {
    setState((prev) => ({
      ...prev,
      customQuestions: [
        ...prev.customQuestions,
        {
          type: "SHORT_ANSWER",
          content: "",
          required: false,
          order: prev.customQuestions.length,
        },
      ],
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
          originalJDText: state.originalText,
          company: "Company",
          employerId: "employer-1",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create job");
      }

      const result = await response.json();
      toast.success("Job posted successfully!");
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create New Job Posting
          </h1>
          <p className="text-muted-foreground">
            Step {currentStep} of 5
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 flex gap-2">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-colors ${
                step <= currentStep ? "bg-blue-600" : "bg-secondary"
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <Card className="p-8">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Upload Job Description
                </h2>
                <p className="text-muted-foreground">
                  Upload a PDF, DOCX, or TXT file with your job description
                </p>
              </div>

              <DocumentUploadSection
                onFileSelect={handleFileUpload}
                isProcessing={isLoading}
                error={uploadError}
              />
            </div>
          )}

          {currentStep === 2 && state.extractedData && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Review Extracted Data
                </h2>
                <p className="text-muted-foreground">
                  Review and edit the extracted job information
                </p>
              </div>

              <div className="space-y-4">
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
                  <Input
                    value={state.extractedData.employmentType}
                    onChange={(e) =>
                      handleExtractedDataChange(
                        "employmentType",
                        e.target.value
                      )
                    }
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  AI Suggestions
                </h2>
                <p className="text-muted-foreground">
                  Review AI-powered suggestions to improve your job posting
                </p>
              </div>
              <p className="text-center text-muted-foreground">
                AI suggestions coming soon
              </p>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Custom Questions
                </h2>
                <p className="text-muted-foreground">
                  Add screening questions for applicants
                </p>
              </div>

              <Button onClick={handleAddQuestion} variant="outline">
                + Add Question
              </Button>

              {state.customQuestions.length > 0 && (
                <div className="space-y-4">
                  {state.customQuestions.map((_, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Question {index + 1}
                        </span>
                        <Button variant="ghost" size="sm">
                          Remove
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Preview & Publish
                </h2>
                <p className="text-muted-foreground">
                  Review your job posting before publishing
                </p>
              </div>

              <Card className="p-6 bg-secondary/20 space-y-4">
                {state.extractedData && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Title</p>
                      <p className="text-lg font-semibold">
                        {state.extractedData.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="text-lg font-semibold">
                        {state.extractedData.location}
                      </p>
                    </div>
                  </>
                )}
              </Card>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            {currentStep > 1 && (
              <Button
                onClick={() => setCurrentStep((prev) => (prev - 1) as Step)}
                variant="outline"
              >
                Previous
              </Button>
            )}
            {currentStep < 5 && (
              <Button
                onClick={() => setCurrentStep((prev) => (prev + 1) as Step)}
                className="ml-auto"
              >
                Next
              </Button>
            )}
            {currentStep === 5 && (
              <Button
                onClick={handlePublish}
                disabled={isLoading}
                className="ml-auto"
              >
                {isLoading ? "Publishing..." : "Publish Job"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
