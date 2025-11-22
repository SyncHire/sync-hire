'use client';

/**
 * Active interview call view with video
 * Integrated design with Stream.io video call
 */
import { useEffect, useState, useRef } from 'react';
import {
  Call,
  StreamCall,
  useCallStateHooks,
  ParticipantView,
  StreamVideoParticipant,
} from '@stream-io/video-react-sdk';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff,
  ChevronLeft, Sparkles, Cpu, BarChart3, BrainCircuit, Clock, CheckCircle2, Circle
} from 'lucide-react';
import type { Question, InterviewStage } from '@/lib/mock-data';
import { formatTime } from '@/lib/date-utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/hooks/use-toast';
import {
  photorealistic_professional_woman_headshot,
  photorealistic_professional_man_headshot
} from '@/assets/generated_images';
import Image from 'next/image';

interface InterviewCallViewProps {
  call: Call;
  interviewId: string;
  jobTitle?: string;
  durationMinutes?: number;
  questions?: Question[];
}

// All possible interview stages in order
const INTERVIEW_STAGES: InterviewStage[] = ['Introduction', 'Technical Skills', 'Problem Solving', 'Behavioral', 'Wrap-up'];

interface TranscriptMessage {
  role: 'ai' | 'user';
  text: string;
}

/**
 * Inner component that uses Stream hooks (must be inside StreamCall)
 */
function InterviewCallContent({
  call,
  interviewId,
  jobTitle = 'AI Interview',
  durationMinutes = 30,
  questions = []
}: InterviewCallViewProps) {
  const { useParticipants, useMicrophoneState, useCameraState } = useCallStateHooks();
  const participants = useParticipants();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCameraMuted } = useCameraState();

  const [transcript, setTranscript] = useState<TranscriptMessage[]>([
    { role: 'ai', text: `Hello! I'm your AI interviewer for the ${jobTitle} position.` },
    { role: 'ai', text: "I've reviewed your application materials. Let's begin with some questions about your background." },
  ]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Get current question and compute progress
  const currentQuestion = questions[currentQuestionIndex];
  const completedStages = new Set(
    questions.slice(0, currentQuestionIndex).map(q => q.category)
  );
  const progressPercentage = questions.length > 0
    ? Math.round((currentQuestionIndex / questions.length) * 100)
    : 0;

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Find local and remote participants
  const localParticipant = participants.find(p => p.isLocalParticipant);
  const remoteParticipant = participants.find(p => !p.isLocalParticipant);

  // Check if agent is connected
  useEffect(() => {
    const hasAgent = participants.some((p) => {
      const nameMatch = p.name?.toLowerCase().includes('interviewer') ||
                        p.name?.toLowerCase().includes('ai');
      const userIdMatch = p.userId?.startsWith('agent-');
      return (nameMatch || userIdMatch) && !p.isLocalParticipant;
    });
    setAgentConnected(hasAgent);
  }, [participants]);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleToggleMic = async () => {
    try {
      await microphone.toggle();
    } catch (err) {
      console.error('Failed to toggle microphone:', err);
      toast({
        title: 'Microphone Error',
        description: 'Unable to toggle microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleCamera = async () => {
    try {
      await camera.toggle();
    } catch (err) {
      console.error('Failed to toggle camera:', err);
      toast({
        title: 'Camera Error',
        description: 'Unable to toggle camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const handleEndCall = async () => {
    await call.leave();
    window.location.href = '/candidate/jobs';
  };

  return (
    <div className="str-video h-full w-full bg-background flex flex-col font-sans overflow-hidden">

      {/* AI-Themed Header */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-background/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <Link href="/candidate/jobs">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 pl-0">
              <ChevronLeft className="h-4 w-4" /> Exit
            </Button>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              {jobTitle}
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">AI EVALUATION</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 border border-white/5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-medium text-foreground">
              {formatTime(elapsedSeconds)}
            </span>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-mono text-muted-foreground">
              {formatTime(durationMinutes * 60)}
            </span>
          </div>
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/30 border border-white/5">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`h-2 w-2 rounded-full shadow-lg ${
                agentConnected
                  ? 'bg-green-500 shadow-green-500/50'
                  : 'bg-yellow-500 shadow-yellow-500/50'
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground tracking-wide">
              {agentConnected ? 'LIVE' : 'CONNECTING...'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex p-6 gap-6 overflow-hidden relative">
        {/* Background Grid */}
        <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

        {/* Left: Main Video Feed */}
        <div className="flex-1 flex flex-col gap-4 relative z-10">

          <div className="flex-1 rounded-2xl overflow-hidden bg-black relative border border-white/10 shadow-2xl group">
            {/* AI/Remote Participant Video */}
            <div className="absolute inset-0">
              {remoteParticipant ? (
                <ParticipantView
                  participant={remoteParticipant}
                  className="h-full w-full object-cover"
                />
              ) : (
                <>
                  <Image
                    src={photorealistic_professional_woman_headshot}
                    alt="AI Interviewer"
                    fill
                    className="object-cover opacity-90 group-hover:scale-105 transition-transform duration-[20s]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </>
              )}
            </div>

            {/* AI Visualization Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white drop-shadow-lg">AI Interviewer</div>
                  <div className="text-xs text-white/70 flex items-center gap-1">
                    {agentConnected ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        Connected
                      </>
                    ) : (
                      <>
                        Processing <span className="animate-pulse">...</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Waveform */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/90 to-transparent flex items-end justify-center pb-8 gap-1">
                {[...Array(32)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ height: agentConnected ? [10, Math.random() * 40 + 10, 10] : 10 }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: Math.random() * 0.2 }}
                    className="w-1 bg-blue-500/40 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* User PIP (Picture-in-Picture) */}
            <div className="absolute top-6 right-6 w-56 aspect-video rounded-xl bg-zinc-900 overflow-hidden border border-white/10 shadow-2xl">
              {localParticipant ? (
                <ParticipantView
                  participant={localParticipant}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={photorealistic_professional_man_headshot}
                  alt="You"
                  fill
                  className="object-cover opacity-80"
                />
              )}
              <div className="absolute inset-0 border-2 border-blue-500/20 rounded-xl pointer-events-none" />
              {isMicMuted && (
                <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-red-500/80 flex items-center justify-center">
                  <MicOff className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* Floating Controls */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
              <Button
                variant={isMicMuted ? "destructive" : "secondary"}
                size="icon"
                className="h-12 w-12 rounded-xl transition-all border border-white/5"
                onClick={handleToggleMic}
              >
                {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                variant={isCameraMuted ? "destructive" : "secondary"}
                size="icon"
                className="h-12 w-12 rounded-xl border border-white/5"
                onClick={handleToggleCamera}
              >
                {isCameraMuted ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
              </Button>
              <div className="w-px h-8 bg-white/10 mx-2" />
              <Button
                variant="destructive"
                className="h-12 px-6 rounded-xl font-medium bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                onClick={handleEndCall}
              >
                <PhoneOff className="mr-2 h-4 w-4" /> End Session
              </Button>
            </div>
          </div>

          {/* Current Question Panel */}
          {currentQuestion && (
            <div className="mt-4 p-5 rounded-2xl bg-card/60 backdrop-blur-xl border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white/5 text-foreground border-white/10 text-xs">
                    {currentQuestion.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                </div>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  {currentQuestion.duration} min
                </Badge>
              </div>
              <p className="text-sm font-medium text-foreground leading-relaxed mb-4">
                {currentQuestion.text}
              </p>
              {currentQuestion.keyPoints && currentQuestion.keyPoints.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                    Key points to cover:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {currentQuestion.keyPoints.map((point, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-white/5 text-muted-foreground border-white/10 text-xs font-normal">
                        {point}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Intelligence Panel */}
        <div className="w-[400px] bg-card/60 backdrop-blur-xl border border-white/5 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative z-10">

          {/* Interview Progress */}
          <div className="p-5 border-b border-white/5 bg-white/5">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest mb-4">
              Interview Progress
            </h3>
            <div className="space-y-2">
              {INTERVIEW_STAGES.map((stage) => {
                const isCompleted = completedStages.has(stage);
                const isCurrent = currentQuestion?.category === stage;
                return (
                  <div key={stage} className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : isCurrent ? (
                      <div className="h-4 w-4 rounded-full border-2 border-blue-500 bg-blue-500/20" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50" />
                    )}
                    <span className={`text-sm ${isCompleted ? 'text-muted-foreground' : isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground/70'}`}>
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Progress bar */}
            <div className="mt-4 h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-gradient-to-r from-blue-500 to-green-400"
              />
            </div>
          </div>

          {/* Transcript Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6" ref={scrollRef}>
            {transcript.map((msg, i) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className="h-8 w-8 rounded-lg shrink-0 overflow-hidden border border-white/10 shadow-sm relative">
                  <Image
                    src={msg.role === 'ai' ? photorealistic_professional_woman_headshot : photorealistic_professional_man_headshot}
                    alt={msg.role === 'ai' ? 'AI' : 'You'}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${msg.role === 'user' ? 'text-right text-muted-foreground' : 'text-blue-400'}`}>
                    {msg.role === 'ai' ? 'AI Interviewer' : 'You'}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-sm border ${
                    msg.role === 'ai'
                      ? 'bg-white/5 border-white/5 text-gray-200 rounded-tl-none'
                      : 'bg-blue-600/10 border-blue-500/20 text-blue-100 rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Typing indicator when agent is processing */}
            {agentConnected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-4"
              >
                <div className="h-8 w-8 rounded-lg shrink-0 overflow-hidden border border-white/10 relative">
                  <Image
                    src={photorealistic_professional_woman_headshot}
                    alt="AI"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    AI Interviewer
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 w-24 rounded-tl-none flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '75ms' }} />
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Live Transcript Header */}
          <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                Live Transcript
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Recording
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export function InterviewCallViewEnhanced({ call, interviewId, jobTitle, durationMinutes, questions }: InterviewCallViewProps) {
  return (
    <StreamCall call={call}>
      <InterviewCallContent call={call} interviewId={interviewId} jobTitle={jobTitle} durationMinutes={durationMinutes} questions={questions} />
    </StreamCall>
  );
}
