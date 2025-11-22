"use client";

import {
  type Call,
  type CallClosedCaption,
  hasVideo,
  ParticipantView,
  StreamCall,
  useCallStateHooks,
} from "@stream-io/video-react-sdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Cpu,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Video as VideoIcon,
  VideoOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
/**
 * Active interview call view with video
 * Integrated design with Stream.io video call
 */
import { useEffect, useRef, useState } from "react";
import {
  photorealistic_professional_man_headshot,
  photorealistic_professional_woman_headshot,
} from "@/assets/generated_images";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/date-utils";
import { toast } from "@/lib/hooks/use-toast";
import type { InterviewStage, Question } from "@/lib/mock-data";

interface InterviewCallViewProps {
  call: Call;
  interviewId: string;
  jobTitle?: string;
  durationMinutes?: number;
  questions?: Question[];
  videoAvatarEnabled?: boolean;
}

// All possible interview stages in order
const INTERVIEW_STAGES: InterviewStage[] = [
  "Introduction",
  "Technical Skills",
  "Problem Solving",
  "Behavioral",
  "Wrap-up",
];

interface TranscriptMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: number;
  isAI: boolean;
}

/**
 * Inner component that uses Stream hooks (must be inside StreamCall)
 */
function InterviewCallContent({
  call,
  interviewId,
  jobTitle = "AI Interview",
  durationMinutes = 30,
  questions = [],
  videoAvatarEnabled = false,
}: InterviewCallViewProps) {
  const {
    useParticipants,
    useMicrophoneState,
    useCameraState,
    useCallClosedCaptions,
    useIsCallCaptioningInProgress,
  } = useCallStateHooks();
  const participants = useParticipants();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCameraMuted } = useCameraState();
  const closedCaptions = useCallClosedCaptions();
  const isCaptioning = useIsCallCaptioningInProgress();

  // Full transcript history built from caption events
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [agentConnected, setAgentConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Get current question and compute progress
  const currentQuestion = questions[currentQuestionIndex];
  const completedStages = new Set<InterviewStage>([
    // Introduction is always done since AI starts with greeting
    "Introduction",
    ...questions.slice(0, currentQuestionIndex).map((q) => q.category),
  ]);
  const progressPercentage =
    questions.length > 0
      ? Math.round((currentQuestionIndex / questions.length) * 100)
      : 0;

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Find local and remote participants
  const localParticipant = participants.find((p) => p.isLocalParticipant);
  const remoteParticipant = participants.find((p) => !p.isLocalParticipant);

  // Check if AI is speaking (for avatar animation)
  const isAISpeaking = remoteParticipant?.isSpeaking ?? false;

  // Check if agent is connected
  useEffect(() => {
    const hasAgent = participants.some((p) => {
      const nameMatch =
        p.name?.toLowerCase().includes("interviewer") ||
        p.name?.toLowerCase().includes("ai");
      const userIdMatch = p.userId?.startsWith("agent-");
      return (nameMatch || userIdMatch) && !p.isLocalParticipant;
    });
    setAgentConnected(hasAgent);
  }, [participants]);

  // Listen for custom events from AI agent (transcript and progress)
  useEffect(() => {
    const handleCustomEvent = (event: {
      custom?: {
        type?: string;
        speaker?: string;
        text?: string;
        timestamp?: number;
        questionIndex?: number;
        category?: string;
      };
    }) => {
      const payload = event.custom;

      // Handle transcript events (both AI and user from Gemini)
      if (payload?.type === "transcript" && payload.text) {
        const text = payload.text;
        const isAgent = payload.speaker === "agent";
        console.log(
          `📨 ${isAgent ? "AI" : "User"} transcript event:`,
          text.substring(0, 50) + "...",
        );

        setTranscript((prev) => {
          const lastMessage = prev[prev.length - 1];
          const speakerId = isAgent ? "agent" : "user";
          const now = Date.now();
          const timeSinceLastMessage = lastMessage
            ? now - lastMessage.timestamp
            : Infinity;
          const TIME_GAP_THRESHOLD = 2000; // 2 seconds

          // If last message is from same speaker AND within time threshold, append to it
          if (
            lastMessage &&
            lastMessage.isAI === isAgent &&
            timeSinceLastMessage < TIME_GAP_THRESHOLD
          ) {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...lastMessage,
              text: lastMessage.text + " " + text,
              timestamp: now, // Update timestamp to track last update
            };
            return updated;
          }

          // New message (different speaker OR time gap exceeded)
          return [
            ...prev,
            {
              id: `${speakerId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              speakerId,
              speakerName: isAgent ? "AI Interviewer" : "You",
              text,
              timestamp: Date.now(),
              isAI: isAgent,
            },
          ];
        });
      }

      // Handle progress events
      if (
        payload?.type === "progress" &&
        typeof payload.questionIndex === "number"
      ) {
        console.log(
          "📊 Progress event:",
          payload.questionIndex + 1,
          payload.category,
        );
        setCurrentQuestionIndex(payload.questionIndex);
      }
    };

    call.on("custom", handleCustomEvent);
    return () => {
      call.off("custom", handleCustomEvent);
    };
  }, [call]);

  // Track caption segments to handle Stream's segmented delivery
  // Key: speakerId, Value: { startTime, lastText }
  const captionSegmentsRef = useRef<
    Map<string, { startTime: string; lastText: string }>
  >(new Map());
  // Track last logged speaker for batched logging
  const lastLoggedSpeakerRef = useRef<string | null>(null);

  // Build transcript from closed captions - streaming updates
  useEffect(() => {
    if (closedCaptions.length === 0) {
      return;
    }

    // Process each caption
    closedCaptions.forEach((caption: CallClosedCaption) => {
      const text = caption.text.trim();
      if (!text) {
        return;
      }

      const speakerId = caption.user.id;
      const startTime = caption.start_time || "";
      const isAI =
        caption.user.name?.toLowerCase().includes("interviewer") ||
        caption.user.name?.toLowerCase().includes("ai") ||
        speakerId?.startsWith("agent-");

      // Skip AI captions - we get AI text from custom events instead
      if (isAI) {
        return;
      }

      // Get the last segment info for this speaker
      const lastSegment = captionSegmentsRef.current.get(speakerId);
      const isNewSegment = !lastSegment || lastSegment.startTime !== startTime;
      const isSameText = lastSegment?.lastText === text;

      // Skip if we've already processed this exact text
      if (isSameText) {
        return;
      }

      // Update segment tracking
      captionSegmentsRef.current.set(speakerId, { startTime, lastText: text });

      setTranscript((prev) => {
        const lastMessage = prev[prev.length - 1];
        const speakerIcon = isAI ? "🤖" : "👤";
        const speakerName = isAI ? "AI" : caption.user.name || "User";
        const now = Date.now();
        const timeSinceLastMessage = lastMessage
          ? now - lastMessage.timestamp
          : Infinity;
        const TIME_GAP_THRESHOLD = 1500; // 1.5 seconds

        // Same speaker
        if (lastMessage && lastMessage.speakerId === speakerId) {
          // If time gap exceeded, start new message even for same speaker
          if (timeSinceLastMessage >= TIME_GAP_THRESHOLD) {
            console.log(
              `📝 ${speakerIcon} ${speakerName} (new after ${Math.round(timeSinceLastMessage / 1000)}s gap): ${text}`,
            );
            lastLoggedSpeakerRef.current = speakerId;
            const newId = `msg-${now}-${Math.random().toString(36).substr(2, 9)}`;
            return [
              ...prev,
              {
                id: newId,
                speakerId,
                speakerName: caption.user.name || "Unknown",
                text,
                timestamp: now,
                isAI,
              },
            ];
          }

          if (isNewSegment) {
            // New segment from same speaker - APPEND to existing message
            const updated = [...prev];
            const newText = lastMessage.text + " " + text;
            updated[updated.length - 1] = {
              ...lastMessage,
              text: newText,
              timestamp: now, // Update timestamp to track last update
            };
            // Log continuation
            console.log(`📝 ${speakerIcon} ${speakerName}: ...${text}`);
            return updated;
          } else {
            // Same segment - text is cumulative, check if it's an extension
            // If new text is longer and contains similar content, replace
            if (text.length >= lastMessage.text.length) {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMessage,
                text: text,
                timestamp: now, // Update timestamp to track last update
              };
              return updated;
            }
            return prev;
          }
        }

        // Different speaker - add new message
        // Log speaker change
        if (lastLoggedSpeakerRef.current !== speakerId) {
          console.log(`📝 ${speakerIcon} ${speakerName}: ${text}`);
          lastLoggedSpeakerRef.current = speakerId;
        }

        const newId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        return [
          ...prev,
          {
            id: newId,
            speakerId,
            speakerName: caption.user.name || "Unknown",
            text,
            timestamp: Date.now(),
            isAI,
          },
        ];
      });
    });
  }, [closedCaptions]);

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
      console.error("Failed to toggle microphone:", err);
      toast({
        title: "Microphone Error",
        description: "Unable to toggle microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleToggleCamera = async () => {
    try {
      await camera.toggle();
    } catch (err) {
      console.error("Failed to toggle camera:", err);
      toast({
        title: "Camera Error",
        description: "Unable to toggle camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const handleEndCall = async () => {
    await call.leave();
    window.location.href = "/candidate/jobs";
  };

  return (
    <div className="str-video h-full w-full bg-background flex flex-col font-sans overflow-hidden">
      {/* AI-Themed Header */}
      <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <Link href="/candidate/jobs">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-2 pl-0"
            >
              <ChevronLeft className="h-4 w-4" /> Exit
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-sm font-semibold flex items-center gap-2">
              {jobTitle}
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">
                AI EVALUATION
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Interview Progress - Hover to expand */}
          <div className="relative group">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border cursor-pointer">
              <div className="flex items-center gap-1.5">
                {INTERVIEW_STAGES.map((stage, idx) => {
                  const isCompleted = completedStages.has(stage);
                  const isCurrent = currentQuestion?.category === stage;
                  return (
                    <div
                      key={stage}
                      className={`h-1.5 w-4 rounded-full transition-colors ${
                        isCompleted
                          ? "bg-green-500"
                          : isCurrent
                            ? "bg-blue-500"
                            : "bg-white/20"
                      }`}
                    />
                  );
                })}
              </div>
              <span className="text-xs font-medium text-foreground ml-1">
                {currentQuestion?.category || "Introduction"}
              </span>
            </div>

            {/* Hover dropdown */}
            <div className="absolute top-full right-0 mt-2 w-56 p-3 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                Interview Progress
              </div>
              <div className="space-y-2">
                {INTERVIEW_STAGES.map((stage) => {
                  const isCompleted = completedStages.has(stage);
                  const isCurrent = currentQuestion?.category === stage;
                  return (
                    <div key={stage} className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      ) : isCurrent ? (
                        <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-500 bg-blue-500/20" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      <span
                        className={`text-xs ${isCompleted ? "text-muted-foreground" : isCurrent ? "text-foreground font-medium" : "text-muted-foreground/60"}`}
                      >
                        {stage}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 h-1 w-full bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`h-2 w-2 rounded-full shadow-lg ${
                agentConnected
                  ? "bg-green-500 shadow-green-500/50"
                  : "bg-yellow-500 shadow-yellow-500/50"
              }`}
            />
            <span className="text-xs font-medium text-muted-foreground tracking-wide">
              {agentConnected ? "LIVE" : "CONNECTING..."}
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
          <div className="flex-1 rounded-2xl overflow-hidden bg-black relative border border-border shadow-2xl group">
            {/* AI Video Feed - HeyGen or fallback avatar */}
            <div className="absolute inset-0">
              {/* Pulsing glow effect when speaking */}
              <AnimatePresence>
                {isAISpeaking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-0"
                  >
                    <motion.div
                      animate={{
                        boxShadow: [
                          "inset 0 0 60px 20px rgba(59, 130, 246, 0.1)",
                          "inset 0 0 80px 30px rgba(59, 130, 246, 0.2)",
                          "inset 0 0 60px 20px rgba(59, 130, 246, 0.1)",
                        ],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute inset-0 rounded-2xl"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Show video avatar only if enabled and video is available, otherwise show static avatar */}
              {videoAvatarEnabled && remoteParticipant && hasVideo(remoteParticipant) ? (
                <div className="absolute inset-0 ai-video-container">
                  <ParticipantView
                    participant={remoteParticipant}
                    muteAudio={false}
                    ParticipantViewUI={null}
                  />
                </div>
              ) : (
                <motion.div
                  animate={{
                    scale: isAISpeaking ? [1, 1.02, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: isAISpeaking ? Infinity : 0,
                    ease: "easeInOut",
                  }}
                  className="absolute inset-0"
                >
                  <Image
                    src={photorealistic_professional_woman_headshot}
                    alt="AI Interviewer"
                    fill
                    sizes="100vw"
                    className="object-cover opacity-90"
                  />
                </motion.div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* AI Visualization Overlay */}
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-6 left-6 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
                  <Cpu className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white drop-shadow-lg">
                    AI Interviewer
                  </div>
                  <div className="text-xs text-white/70 flex items-center gap-1">
                    {isAISpeaking ? (
                      <>
                        <motion.span
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                          className="h-1.5 w-1.5 rounded-full bg-blue-400"
                        />
                        Speaking
                      </>
                    ) : agentConnected ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                        Listening
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
                    animate={{
                      height: isAISpeaking
                        ? [10, Math.random() * 60 + 20, 10]
                        : agentConnected
                          ? [8, 12, 8]
                          : 6,
                    }}
                    transition={{
                      duration: isAISpeaking ? 0.3 : 0.8,
                      repeat: Infinity,
                      repeatDelay: Math.random() * 0.1,
                    }}
                    className={`w-1 rounded-full transition-colors ${
                      isAISpeaking ? "bg-blue-400/60" : "bg-blue-500/30"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* User PIP (Picture-in-Picture) */}
            <div className="pip-video-container absolute top-6 right-6 w-56 aspect-video rounded-xl bg-zinc-900 overflow-hidden border border-white/20 shadow-2xl z-20">
              {localParticipant ? (
                <ParticipantView
                  participant={localParticipant}
                  ParticipantViewUI={null}
                />
              ) : (
                <Image
                  src={photorealistic_professional_man_headshot}
                  alt="You"
                  fill
                  sizes="224px"
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

            {/* Floating Controls - bottom right */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-white/10 shadow-xl z-10">
              <Button
                variant={isMicMuted ? "destructive" : "ghost"}
                size="icon"
                className={`h-8 w-8 rounded-md transition-colors ${!isMicMuted && "text-white/80 hover:text-white hover:bg-white/10"}`}
                onClick={handleToggleMic}
              >
                {isMicMuted ? (
                  <MicOff className="h-3.5 w-3.5" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant={isCameraMuted ? "destructive" : "ghost"}
                size="icon"
                className={`h-8 w-8 rounded-md transition-colors ${!isCameraMuted && "text-white/80 hover:text-white hover:bg-white/10"}`}
                onClick={handleToggleCamera}
              >
                {isCameraMuted ? (
                  <VideoOff className="h-3.5 w-3.5" />
                ) : (
                  <VideoIcon className="h-3.5 w-3.5" />
                )}
              </Button>
              <div className="w-px h-5 bg-white/20" />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors"
                onClick={handleEndCall}
              >
                <PhoneOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Current Question Panel */}
          {currentQuestion && (
            <div className="mt-4 p-5 rounded-2xl bg-card border border-border shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="bg-secondary/50 text-foreground border-border text-xs"
                  >
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
              <p className="text-sm font-medium text-foreground leading-relaxed">
                {currentQuestion.text}
              </p>
            </div>
          )}
        </div>

        {/* Right: Transcript Panel */}
        <div className="w-[400px] bg-card/60 backdrop-blur-xl border border-border rounded-2xl flex flex-col shadow-2xl overflow-hidden relative z-10">
          {/* Transcript Header */}
          <div className="p-4 border-b border-border bg-secondary/30">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                Live Transcript
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isCaptioning ? (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                    Transcribing
                  </>
                ) : (
                  <>
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                    Starting...
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Transcript Feed */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6" ref={scrollRef}>
            {transcript.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <p className="text-sm">Waiting for conversation...</p>
                <p className="text-xs mt-1">Transcript will appear here</p>
              </div>
            ) : (
              transcript.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                  className={`flex gap-4 ${!msg.isAI ? "flex-row-reverse" : ""}`}
                >
                  <div className="h-8 w-8 rounded-lg shrink-0 overflow-hidden border border-border shadow-sm relative">
                    <Image
                      src={
                        msg.isAI
                          ? photorealistic_professional_woman_headshot
                          : photorealistic_professional_man_headshot
                      }
                      alt={msg.isAI ? "AI" : "You"}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col gap-1 max-w-[85%]">
                    <div
                      className={`text-[10px] font-bold uppercase tracking-wider ${!msg.isAI ? "text-right text-muted-foreground" : "text-blue-400"}`}
                    >
                      {msg.isAI ? "AI Interviewer" : msg.speakerName}
                    </div>
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed backdrop-blur-sm border ${
                        msg.isAI
                          ? "bg-secondary/50 border-border text-foreground rounded-tl-none"
                          : "bg-blue-600/10 border-blue-500/20 text-foreground rounded-tr-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function InterviewCallView({
  call,
  interviewId,
  jobTitle,
  durationMinutes,
  questions,
  videoAvatarEnabled,
}: InterviewCallViewProps) {
  return (
    <StreamCall call={call}>
      <InterviewCallContent
        call={call}
        interviewId={interviewId}
        jobTitle={jobTitle}
        durationMinutes={durationMinutes}
        questions={questions}
        videoAvatarEnabled={videoAvatarEnabled}
      />
    </StreamCall>
  );
}
