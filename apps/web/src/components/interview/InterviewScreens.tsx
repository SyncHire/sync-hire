'use client';

/**
 * UI screens for different interview states
 * Updated to match dark theme design system
 */
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertTriangle, CheckCircle2, Sparkles, Video, Clock, Mic, Camera, VideoOff, MicOff } from 'lucide-react';
import type { Question } from '@/lib/mock-data';

interface InterviewPreviewScreenProps {
  candidateName: string;
  jobTitle: string;
  company: string;
  durationMinutes: number;
  questions: Question[];
  onJoin: () => void;
}

type PermissionStatus = 'pending' | 'granted' | 'denied';

// Logo.dev API for company logos
const LOGO_DEV_PUBLIC_KEY = process.env.NEXT_PUBLIC_LOGO_DEV_KEY || 'pk_FgUgq-__SdOal0JNAYVqJQ';

const getCompanyLogoUrl = (domain: string) =>
  `https://img.logo.dev/${domain}?token=${LOGO_DEV_PUBLIC_KEY}`;

const companyLogos: Record<string, string> = {
  'Stripe': getCompanyLogoUrl('stripe.com'),
  'Databricks': getCompanyLogoUrl('databricks.com'),
  'Vercel': getCompanyLogoUrl('vercel.com'),
  'Cloudflare': getCompanyLogoUrl('cloudflare.com'),
  'OpenAI': getCompanyLogoUrl('openai.com'),
  'Spotify': getCompanyLogoUrl('spotify.com'),
};

export function InterviewPreviewScreen({
  candidateName,
  jobTitle,
  company,
  durationMinutes,
  questions,
  onJoin,
}: InterviewPreviewScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraPermission, setCameraPermission] = useState<PermissionStatus>('pending');
  const [micPermission, setMicPermission] = useState<PermissionStatus>('pending');

  // Get unique stages from questions
  const stages = [...new Set(questions.map(q => q.category))];
  const companyLogo = companyLogos[company];

  // Request permissions on mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setStream(mediaStream);
        setCameraPermission('granted');
        setMicPermission('granted');

        // Connect stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error('Permission error:', err);
        // Try to get more specific error info
        if (err instanceof Error) {
          if (err.name === 'NotAllowedError') {
            setCameraPermission('denied');
            setMicPermission('denied');
          }
        }
      }
    };

    requestPermissions();

    // Cleanup: stop all tracks when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const permissionsGranted = cameraPermission === 'granted' && micPermission === 'granted';
  const permissionsDenied = cameraPermission === 'denied' || micPermission === 'denied';

  const handleJoin = () => {
    // Stop preview stream before joining (the call will create its own)
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onJoin();
  };

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)] pointer-events-none opacity-50" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

      <Card className="relative max-w-xl w-full mx-4 bg-card/80 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardContent className="pt-8 pb-8 px-8">
          {/* Company Header */}
          <div className="mb-6 flex items-center justify-center gap-3">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={`${company} logo`}
                className="h-10 w-10 rounded-lg object-contain bg-white p-1"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Video className="h-5 w-5 text-blue-400" />
              </div>
            )}
            <div className="text-left">
              <p className="text-lg font-semibold text-foreground">{company}</p>
              <p className="text-sm text-muted-foreground">{jobTitle}</p>
            </div>
          </div>

          {/* Camera Preview */}
          <div className="mb-6 relative rounded-xl overflow-hidden bg-black aspect-video">
            {permissionsGranted ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary/50">
                {cameraPermission === 'pending' ? (
                  <>
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-3" />
                    <p className="text-sm text-muted-foreground">Requesting camera access...</p>
                  </>
                ) : (
                  <>
                    <VideoOff className="h-8 w-8 text-red-400 mb-3" />
                    <p className="text-sm text-red-400">Camera access denied</p>
                    <p className="text-xs text-muted-foreground mt-1">Please enable camera in browser settings</p>
                  </>
                )}
              </div>
            )}

            {/* Candidate name overlay */}
            {permissionsGranted && (
              <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                <p className="text-sm text-white font-medium">{candidateName}</p>
              </div>
            )}
          </div>

          {/* Permission Status */}
          <div className="mb-6 flex gap-3">
            <div className={`flex-1 p-3 rounded-lg border ${
              cameraPermission === 'granted'
                ? 'bg-green-500/10 border-green-500/20'
                : cameraPermission === 'denied'
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-secondary/30 border-white/5'
            }`}>
              <div className="flex items-center gap-2">
                {cameraPermission === 'granted' ? (
                  <Camera className="h-4 w-4 text-green-400" />
                ) : cameraPermission === 'denied' ? (
                  <VideoOff className="h-4 w-4 text-red-400" />
                ) : (
                  <Camera className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-sm ${
                  cameraPermission === 'granted' ? 'text-green-400' :
                  cameraPermission === 'denied' ? 'text-red-400' : 'text-muted-foreground'
                }`}>
                  Camera {cameraPermission === 'granted' ? 'Ready' : cameraPermission === 'denied' ? 'Blocked' : 'Pending'}
                </span>
              </div>
            </div>
            <div className={`flex-1 p-3 rounded-lg border ${
              micPermission === 'granted'
                ? 'bg-green-500/10 border-green-500/20'
                : micPermission === 'denied'
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-secondary/30 border-white/5'
            }`}>
              <div className="flex items-center gap-2">
                {micPermission === 'granted' ? (
                  <Mic className="h-4 w-4 text-green-400" />
                ) : micPermission === 'denied' ? (
                  <MicOff className="h-4 w-4 text-red-400" />
                ) : (
                  <Mic className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`text-sm ${
                  micPermission === 'granted' ? 'text-green-400' :
                  micPermission === 'denied' ? 'text-red-400' : 'text-muted-foreground'
                }`}>
                  Microphone {micPermission === 'granted' ? 'Ready' : micPermission === 'denied' ? 'Blocked' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          {/* Interview Info */}
          <div className="mb-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {durationMinutes} minutes
            </span>
            <span className="flex items-center gap-1.5">
              <Video className="h-4 w-4" /> {questions.length} questions
            </span>
          </div>

          {/* Interview Stages */}
          <div className="mb-6">
            <div className="flex flex-wrap justify-center gap-2">
              {stages.map((stage) => (
                <span
                  key={stage}
                  className="px-3 py-1.5 text-xs bg-secondary/50 text-muted-foreground rounded-full border border-white/5"
                >
                  {stage}
                </span>
              ))}
            </div>
          </div>

          <Button
            onClick={handleJoin}
            disabled={!permissionsGranted}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {permissionsGranted ? 'Join Interview' : permissionsDenied ? 'Permissions Required' : 'Checking Permissions...'}
          </Button>

          {permissionsDenied && (
            <p className="mt-3 text-xs text-center text-red-400">
              Please allow camera and microphone access in your browser to continue.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function InterviewLoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)] pointer-events-none opacity-50" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative text-center max-w-md px-6">
        {/* Animated Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
              <Loader2 className="h-10 w-10 text-blue-400 animate-spin" />
            </div>
            <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur-xl animate-pulse" />
          </div>
        </div>

        <h2 className="mb-3 text-2xl font-semibold text-foreground tracking-tight">
          Starting your interview
        </h2>
        <p className="mb-6 text-muted-foreground">
          The AI interviewer will join shortly...
        </p>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* Tips */}
        <div className="p-4 bg-card/50 backdrop-blur-sm rounded-xl border border-white/5">
          <p className="text-sm text-muted-foreground">
            <span className="text-blue-400 font-medium">Tip:</span> Speak clearly and take your time with each answer
          </p>
        </div>
      </div>
    </div>
  );
}

interface InterviewErrorScreenProps {
  errorMessage: string;
  onRetry: () => void;
}

export function InterviewErrorScreen({ errorMessage, onRetry }: InterviewErrorScreenProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)] pointer-events-none opacity-50" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-red-500/10 blur-[100px] rounded-full pointer-events-none" />

      <Card className="relative max-w-md w-full mx-4 bg-card/80 backdrop-blur-xl border-red-500/20 shadow-2xl">
        <CardContent className="pt-8 pb-8 px-8 text-center">
          {/* Error Icon */}
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>

          <h2 className="mb-3 text-2xl font-semibold text-foreground tracking-tight">
            Connection Error
          </h2>
          <p className="mb-6 text-muted-foreground text-sm">{errorMessage}</p>

          <Button
            onClick={onRetry}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/20"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface InterviewEndedScreenProps {
  onRejoin: () => void;
}

export function InterviewEndedScreen({ onRejoin }: InterviewEndedScreenProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-grid-pattern [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_80%)] pointer-events-none opacity-50" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-green-500/10 blur-[100px] rounded-full pointer-events-none" />

      <Card className="relative max-w-md w-full mx-4 bg-card/80 backdrop-blur-xl border-green-500/20 shadow-2xl">
        <CardContent className="pt-8 pb-8 px-8 text-center">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <h2 className="mb-3 text-2xl font-semibold text-foreground tracking-tight">
            Interview Complete
          </h2>
          <p className="mb-8 text-muted-foreground text-sm">
            Thank you for completing your interview! We&apos;ll review your responses and get back to you soon.
          </p>

          <div className="space-y-3">
            <Button
              onClick={onRejoin}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-lg shadow-blue-500/20"
            >
              Start New Interview
            </Button>
            <Button
              onClick={() => window.location.href = '/candidate/jobs'}
              variant="outline"
              className="w-full h-11 border-white/10 bg-white/5 hover:bg-white/10"
            >
              Browse More Jobs
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
