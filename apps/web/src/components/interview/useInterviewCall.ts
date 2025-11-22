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
  const initializingRef = useRef(false);
  const joinedRef = useRef(false); // Track if we've successfully joined

  useEffect(() => {
    // Guard: don't run if not enabled or already initializing/joined
    if (!enabled || !client || call || initializingRef.current || joinedRef.current) {
      return;
    }

    let cancelled = false;

    const initializeInterview = async () => {
      if (cancelled) return;

      try {
        initializingRef.current = true;
        console.log('🚀 Starting interview for:', candidateName);

        // Start interview and get call ID
        const data = await startInterviewMutation.mutateAsync({
          interviewId,
          candidateId,
          candidateName,
        });

        if (cancelled) {
          console.log('⚠️ Cancelled before joining call');
          initializingRef.current = false;
          return;
        }

        console.log('📞 Interview started, joining call:', data.callId);

        // Join the call
        const videoCall = client.call('default', data.callId);
        await videoCall.join();

        // Mark as joined - prevents re-running even if StrictMode remounts
        joinedRef.current = true;

        if (cancelled) {
          console.log('⚠️ Cancelled after joining, leaving call');
          await videoCall.leave();
          joinedRef.current = false;
          initializingRef.current = false;
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
        if (!cancelled) {
          initializingRef.current = false;
        }
      }
    };

    initializeInterview();

    // Cleanup - use a local reference to avoid TypeScript flow issues
    return () => {
      cancelled = true;
      // Don't reset joinedRef here - let it persist to prevent re-runs on StrictMode remount
      initializingRef.current = false;
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
      initializingRef.current = false;
      joinedRef.current = false; // Reset on manual reset
      startInterviewMutation.reset();
    },
  };
}
