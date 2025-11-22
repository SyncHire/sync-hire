'use client';

/**
 * Simple interview call view using Stream's built-in layout
 * Use this for comparison with the enhanced version
 */
import { useEffect, useState } from 'react';
import {
  Call,
  CallControls,
  SpeakerLayout,
  StreamCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { Badge } from '@/components/ui/badge';
import { BrainCircuit, Video, Loader2 } from 'lucide-react';

interface InterviewCallViewProps {
  call: Call;
  interviewId: string;
  jobTitle?: string;
}

/**
 * Agent Status Banner Component
 */
function AgentStatusBanner({ status }: { status: 'waiting' | 'connected' }) {
  if (status === 'connected') {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 border-b border-green-500/20">
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium text-green-400">
          AI Interviewer Connected
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20">
      <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
      <span className="text-sm font-medium text-yellow-400">
        Waiting for AI Interviewer...
      </span>
    </div>
  );
}

/**
 * Agent Monitor Component
 */
function AgentMonitor() {
  const { useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const [agentStatus, setAgentStatus] = useState<'waiting' | 'connected'>('waiting');

  useEffect(() => {
    const hasAgent = participants.some((p) => {
      const nameMatch = p.name?.toLowerCase().includes('interviewer') ||
                        p.name?.toLowerCase().includes('ai');
      const userIdMatch = p.userId?.startsWith('agent-');
      const notCandidate = !p.userId?.includes('candidate');
      const notSelf = !p.isLocalParticipant;

      return (nameMatch || userIdMatch || (notCandidate && notSelf)) && notSelf;
    });

    setAgentStatus(hasAgent ? 'connected' : 'waiting');
  }, [participants]);

  return <AgentStatusBanner status={agentStatus} />;
}

export function InterviewCallViewSimple({ call, interviewId, jobTitle }: InterviewCallViewProps) {
  return (
    <StreamCall call={call}>
      <div className="str-video flex h-screen w-full flex-col bg-background">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-white/5 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Video className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground tracking-tight">
                  {jobTitle || 'AI Interview Session'}
                </h1>
                <p className="text-xs text-muted-foreground">
                  Interview #{interviewId}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1.5">
              <BrainCircuit className="h-3.5 w-3.5" />
              AI Powered
            </Badge>
          </div>
        </div>

        {/* Agent Status Indicator */}
        <AgentMonitor />

        {/* Video/Audio Area - Using Stream's built-in layout */}
        <div className="relative flex-1 min-h-0 bg-black/20">
          <SpeakerLayout participantsBarPosition="bottom" />
        </div>

        {/* Controls */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-white/5 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-center">
            <CallControls />
          </div>
        </div>
      </div>
    </StreamCall>
  );
}
