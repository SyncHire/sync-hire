'use client';

/**
 * Custom hook to manage interview call lifecycle
 * Handles initialization, joining, and cleanup
 */
import { useState, useEffect, useRef } from 'react';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';
import { useStartInterview } from '@/lib/hooks/use-interview';

interface UseInterviewCallParams {
  interviewId: string;
  candidateId: string;
  candidateName: string;
  enabled: boolean; // Only start when name is provided
}

export function useInterviewCall({
  interviewId,
  candidateId,
  candidateName,
  enabled,
}: UseInterviewCallParams) {
  const client = useStreamVideoClient();
  const [call, setCall] = useState<Call | null>(null);
  const [callEnded, setCallEnded] = useState(false);
  const startInterviewMutation = useStartInterview();
  const mutationStartedRef = useRef(false); // Persists across StrictMode remounts
  const joinedRef = useRef(false); // Track if we've successfully joined

  useEffect(() => {
    // Guard: don't run if not enabled, no client, already have call, or already started
    if (!enabled || !client || call || mutationStartedRef.current || joinedRef.current) {
      return;
    }

    // Mark mutation as started IMMEDIATELY (before any async work)
    // This prevents double-calls in StrictMode
    mutationStartedRef.current = true;

    let cancelled = false;

    const initializeInterview = async () => {
      // Don't check cancelled at the start - in StrictMode, cancelled may be set
      // before this async function body even executes. We only check cancelled
      // after joining the call, where we can properly clean up.

      try {
        console.log('🚀 Starting interview for:', candidateName);

        // Start interview and get call ID (idempotent - uses getOrCreate)
        const data = await startInterviewMutation.mutateAsync({
          interviewId,
          candidateId,
          candidateName,
        });

        // Don't check cancelled here - once mutation succeeds, complete the join
        // The mutation is idempotent, so we should finish what we started
        console.log('📞 Interview started, joining call:', data.callId);

        // Create the call object
        const videoCall = client.call('default', data.callId);

        // Enable camera and microphone BEFORE joining (per Stream.io docs)
        try {
          await videoCall.camera.enable();
        } catch (camErr) {
          console.warn('⚠️ Could not enable camera:', camErr);
        }
        try {
          await videoCall.microphone.enable();
        } catch (micErr) {
          console.warn('⚠️ Could not enable microphone:', micErr);
        }

        // Then join the call
        await videoCall.join({ create: true, video: true });

        // Mark as joined - prevents re-running even if StrictMode remounts
        joinedRef.current = true;

        if (cancelled) {
          console.log('⚠️ Cancelled after joining, leaving call');
          await videoCall.leave();
          joinedRef.current = false;
          return;
        }

        // Listen for call ended events
        videoCall.on('call.ended', () => {
          console.log('📞 Call ended by host');
          setCallEnded(true);
        });

        videoCall.on('call.session_participant_left', () => {
          console.log('📞 Participant left - ending interview');
          setTimeout(() => setCallEnded(true), 500);
        });

        setCall(videoCall);
        console.log('✅ Successfully joined call');
      } catch (err) {
        console.error('Error initializing interview:', err);
        // Reset on error so user can retry
        if (!cancelled) {
          mutationStartedRef.current = false;
        }
      }
    };

    initializeInterview();

    // Cleanup - only set cancelled flag, don't reset refs
    // This prevents double API calls in StrictMode
    return () => {
      cancelled = true;
    };
  }, [enabled, client, call, interviewId, candidateId, candidateName]);

  return {
    call,
    callEnded,
    isLoading: startInterviewMutation.isPending || (!call && enabled && !startInterviewMutation.isError),
    error: startInterviewMutation.error,
    reset: () => {
      setCall(null);
      setCallEnded(false);
      mutationStartedRef.current = false;
      joinedRef.current = false;
      startInterviewMutation.reset();
    },
  };
}
