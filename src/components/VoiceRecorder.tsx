import { useState, useRef, useEffect } from 'react';
import { Mic, X, Send, Pause, Play } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from '../utils/toast';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startRecording();
    
    return () => {
      cleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Voice recording not supported', {
          description: 'Your browser does not support voice recording',
        });
        onCancel();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          toast.error('Microphone access denied', {
            description: 'Please allow microphone access in your browser settings to send voice messages',
            duration: 5000,
          });
        } else if (error.name === 'NotFoundError') {
          toast.error('No microphone found', {
            description: 'Please connect a microphone to record voice messages',
            duration: 5000,
          });
        } else if (error.name === 'NotReadableError') {
          toast.error('Microphone is busy', {
            description: 'Your microphone is already in use by another application',
            duration: 5000,
          });
        } else {
          toast.error('Failed to access microphone', {
            description: error.message || 'Please check your browser settings',
            duration: 5000,
          });
        }
      } else {
        toast.error('Failed to access microphone', {
          description: 'Please allow microphone access to send voice messages',
          duration: 5000,
        });
      }
      
      onCancel();
    }
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
      setIsPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setIsPaused(true);
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob, duration);
    } else {
      handleStop();
      // Wait for blob to be ready
      setTimeout(() => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          onRecordingComplete(blob, duration);
        }
      }, 100);
    }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    onCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-surface border-t border-border p-4">
      <div className="flex items-center gap-3">
        {/* Cancel button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          className="h-10 w-10"
          aria-label="Cancel recording"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Recording indicator */}
        <div className="flex-1 flex items-center gap-3 bg-destructive/10 rounded-full px-4 py-2">
          <div className="flex items-center gap-2">
            {isRecording && !isPaused && (
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            )}
            <Mic className="w-5 h-5 text-destructive" />
          </div>
          
          <div className="flex-1">
            <div className="h-8 flex items-center gap-1">
              {/* Simple waveform animation */}
              {isRecording && !isPaused && (
                <>
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-destructive rounded-full"
                      style={{
                        height: `${Math.random() * 100}%`,
                        animation: `pulse ${0.5 + Math.random() * 0.5}s infinite ease-in-out`,
                        animationDelay: `${i * 0.05}s`,
                      }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          <span className="text-sm font-mono">{formatDuration(duration)}</span>
        </div>

        {/* Pause/Resume button */}
        {isRecording && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePauseResume}
            className="h-10 w-10"
            aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </Button>
        )}

        {/* Send button */}
        <Button
          size="icon"
          onClick={handleSend}
          disabled={duration < 1}
          className="h-10 w-10 rounded-full"
          aria-label="Send voice message"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
