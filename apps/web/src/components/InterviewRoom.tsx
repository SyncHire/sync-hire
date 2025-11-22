'use client';

/**
 * Interview Room Component
 * Simplified orchestrator for interview flow
 */
import { useState } from 'react';
import { useInterviewCall } from './interview/useInterviewCall';
import type { Question } from '@/lib/mock-data';
import {
  InterviewNameForm,
  InterviewLoadingScreen,
  InterviewErrorScreen,
  InterviewEndedScreen,
} from './interview/InterviewScreens';
import { InterviewCallViewEnhanced } from './interview/InterviewCallView';

interface InterviewRoomProps {
  callId: string;
  interviewId: string;
  candidateId: string;
  candidateName?: string;
  jobTitle?: string;
  durationMinutes?: number;
  questions?: Question[];
}

export function InterviewRoom({
  interviewId,
  candidateId,
  candidateName,
  jobTitle,
  durationMinutes = 30,
  questions = [],
}: InterviewRoomProps) {
  // Check if user has already started this interview
  const storageKey = `interview-${interviewId}-started`;
  const storedName = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
  const hasStarted = !!storedName;

  const [nameInput, setNameInput] = useState(storedName || candidateName || '');
  const [showNameForm, setShowNameForm] = useState(!hasStarted);

  // Use custom hook to manage call lifecycle
  const { call, callEnded, isLoading, error, reset } = useInterviewCall({
    interviewId,
    candidateId,
    candidateName: nameInput,
    enabled: !showNameForm, // Only start when name is provided
  });

  const handleStartInterview = () => {
    if (nameInput.trim()) {
      // Save name to localStorage to skip form on refresh
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, nameInput.trim());
      }
      setShowNameForm(false);
    }
  };

  const handleRejoin = () => {
    // Clear the localStorage to allow re-entering name
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
    reset();
    setShowNameForm(true);
    window.location.reload();
  };

  const handleRetry = () => {
    reset();
    window.location.reload();
  };

  // Render appropriate screen based on state
  if (showNameForm) {
    return (
      <InterviewNameForm
        nameInput={nameInput}
        onNameChange={setNameInput}
        onSubmit={handleStartInterview}
      />
    );
  }

  if (isLoading) {
    return <InterviewLoadingScreen />;
  }

  if (error) {
    return <InterviewErrorScreen errorMessage={error.message} onRetry={handleRetry} />;
  }

  if (callEnded) {
    return <InterviewEndedScreen onRejoin={handleRejoin} />;
  }

  if (!call) {
    return null;
  }

  return (
    <InterviewCallViewEnhanced
      call={call}
      interviewId={interviewId}
      jobTitle={jobTitle}
      durationMinutes={durationMinutes}
      questions={questions}
    />
  );
}
