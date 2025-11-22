'use client';

/**
 * Interview Room Component
 * Simplified orchestrator for interview flow
 */
import { useState, useEffect } from 'react';
import { useInterviewCall } from './interview/useInterviewCall';
import {
  InterviewNameForm,
  InterviewLoadingScreen,
  InterviewErrorScreen,
  InterviewEndedScreen,
} from './interview/InterviewScreens';
import { InterviewCallViewEnhanced, InterviewCallViewSimple } from './interview/InterviewCallView';
import { Button } from '@/components/ui/button';
import { LayoutGrid, Layout } from 'lucide-react';

interface InterviewRoomProps {
  callId: string;
  interviewId: string;
  candidateId: string;
  candidateName?: string;
  jobTitle?: string;
}

export function InterviewRoom({
  interviewId,
  candidateId,
  candidateName,
  jobTitle,
}: InterviewRoomProps) {
  // Check if user has already started this interview
  const storageKey = `interview-${interviewId}-started`;
  const storedName = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
  const hasStarted = !!storedName;

  const [nameInput, setNameInput] = useState(storedName || candidateName || '');
  const [showNameForm, setShowNameForm] = useState(!hasStarted);
  const [useEnhancedView, setUseEnhancedView] = useState(true);

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

  // Render call view with toggle button
  return (
    <div className="relative h-full w-full">
      {/* View Toggle Button - positioned at bottom left to avoid header overlap */}
      <div className="absolute bottom-24 left-6 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUseEnhancedView(!useEnhancedView)}
          className="bg-black/60 backdrop-blur-md border-white/10 hover:bg-white/10 text-white gap-2 shadow-lg"
        >
          {useEnhancedView ? (
            <>
              <Layout className="h-4 w-4" />
              Simple View
            </>
          ) : (
            <>
              <LayoutGrid className="h-4 w-4" />
              Enhanced View
            </>
          )}
        </Button>
      </div>

      {/* Render selected view */}
      {useEnhancedView ? (
        <InterviewCallViewEnhanced call={call} interviewId={interviewId} jobTitle={jobTitle} />
      ) : (
        <InterviewCallViewSimple call={call} interviewId={interviewId} jobTitle={jobTitle} />
      )}
    </div>
  );
}
