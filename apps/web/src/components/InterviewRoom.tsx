"use client";

/**
 * Interview Room Component
 * Simplified orchestrator for interview flow:
 * 1. Preview screen - show interview details, click "Join" to start
 * 2. Loading screen - while connecting
 * 3. Active interview - video call with AI
 */
import { useState } from "react";
import type { Question } from "@/lib/mock-data";
import { InterviewCallView } from "./interview/InterviewCallView";
import {
  InterviewEndedScreen,
  InterviewErrorScreen,
  InterviewLoadingScreen,
  InterviewPreviewScreen,
} from "./interview/InterviewScreens";
import { useInterviewCall } from "./interview/useInterviewCall";

interface InterviewRoomProps {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  durationMinutes: number;
  questions: Question[];
}

export function InterviewRoom({
  interviewId,
  candidateId,
  candidateName,
  jobTitle,
  company,
  durationMinutes,
  questions,
}: InterviewRoomProps) {
  const [hasJoined, setHasJoined] = useState(false);

  // Use custom hook to manage call lifecycle - only enabled after user clicks Join
  const { call, callEnded, videoAvatarEnabled, isLoading, error, reset } = useInterviewCall({
    interviewId,
    candidateId,
    candidateName,
    enabled: hasJoined,
  });

  const handleJoin = () => {
    setHasJoined(true);
  };

  const handleRetry = () => {
    reset();
    setHasJoined(false);
  };

  // Render appropriate screen based on state
  if (!hasJoined) {
    return (
      <InterviewPreviewScreen
        candidateName={candidateName}
        jobTitle={jobTitle}
        company={company}
        durationMinutes={durationMinutes}
        questions={questions}
        onJoin={handleJoin}
      />
    );
  }

  if (isLoading) {
    return <InterviewLoadingScreen />;
  }

  if (error) {
    return (
      <InterviewErrorScreen
        errorMessage={error.message}
        onRetry={handleRetry}
      />
    );
  }

  if (callEnded) {
    return <InterviewEndedScreen onRejoin={handleRetry} />;
  }

  if (!call) {
    return null;
  }

  return (
    <InterviewCallView
      call={call}
      interviewId={interviewId}
      jobTitle={jobTitle}
      durationMinutes={durationMinutes}
      questions={questions}
      videoAvatarEnabled={videoAvatarEnabled}
    />
  );
}
