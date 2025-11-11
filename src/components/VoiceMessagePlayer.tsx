import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from './ui/icons';
import { Button } from './ui/button';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isSent?: boolean;
}

export function VoiceMessagePlayer({ audioUrl, duration, isSent = false }: VoiceMessagePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setTotalDuration(Math.floor(audio.duration));
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    });

    return () => {
      audio.pause();
      audio.src = '';
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [audioUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    } else {
      audioRef.current.play();
      progressIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(Math.floor(audioRef.current.currentTime));
        }
      }, 100);
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-[220px] py-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePlayPause}
        className={`h-9 w-9 rounded-full shrink-0 ${
          isSent 
            ? 'hover:bg-primary-foreground/20 text-primary-foreground' 
            : 'hover:bg-[var(--hover-muted)] text-foreground'
        }`}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" fill="currentColor" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
        )}
      </Button>

      <div className="flex-1 flex flex-col gap-1.5">
        {/* Custom waveform/progress bar */}
        <div className="relative h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all ${
              isSent ? 'bg-primary-foreground/80' : 'bg-primary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className={`flex justify-between items-center text-[11px] ${
          isSent ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          <span>{formatTime(isPlaying ? currentTime : totalDuration)}</span>
          <svg 
            className={`w-12 h-4 ${isSent ? 'opacity-50' : 'opacity-40'}`}
            viewBox="0 0 48 16" 
            fill="none"
          >
            <path 
              d="M1 8 L1 8 M5 6 L5 10 M9 4 L9 12 M13 7 L13 9 M17 5 L17 11 M21 3 L21 13 M25 6 L25 10 M29 4 L29 12 M33 8 L33 8 M37 5 L37 11 M41 7 L41 9 M45 6 L45 10" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
