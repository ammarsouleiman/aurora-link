import { useState, useRef, useEffect } from 'react';
import { Mic, X, Send, Trash2 } from './ui/icons';
import { toast } from '../utils/toast';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [amplitude, setAmplitude] = useState<number[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;
      
      // Set up audio analyzer for waveform
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      // Start waveform animation
      updateWaveform();
      
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
        onRecordingComplete(blob, duration);
        cleanup();
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Start timer
      timerRef.current = setInterval(() => {
        setDuration((prev) => {
          const newDuration = prev + 1;
          // Auto-send after 60 minutes (like WhatsApp)
          if (newDuration >= 3600) {
            handleSend();
          }
          return newDuration;
        });
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

  const updateWaveform = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);
    
    // Sample some points for the waveform
    const samples = 30;
    const step = Math.floor(bufferLength / samples);
    const waveformData: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const value = dataArray[i * step];
      const normalized = Math.abs((value - 128) / 128);
      waveformData.push(Math.max(0.1, normalized));
    }
    
    setAmplitude(waveformData);
    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  };

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const handleSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
    <div className="absolute inset-0 bg-[#efeae2] z-50 flex flex-col">
      {/* Header */}
      <div className="h-[60px] bg-[#00a884] flex items-center px-4 gap-4 shadow-sm">
        <button
          onClick={handleCancel}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors active:scale-95"
          aria-label="Cancel recording"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex-1">
          <div className="text-white text-[17px] font-medium">Recording...</div>
          <div className="text-white/90 text-[13px]">{formatDuration(duration)}</div>
        </div>

        <button
          onClick={handleCancel}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors active:scale-95"
          aria-label="Delete recording"
        >
          <Trash2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main recording area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Pulsing microphone */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-[#00a884]/20 rounded-full animate-ping" 
               style={{ animationDuration: '2s' }} />
          <div className="relative w-24 h-24 bg-[#00a884] rounded-full flex items-center justify-center shadow-lg">
            <Mic className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Waveform visualization */}
        <div className="w-full max-w-md h-24 flex items-center justify-center gap-[3px] mb-4">
          {amplitude.length > 0 ? (
            amplitude.map((amp, i) => (
              <div
                key={i}
                className="w-1 bg-[#00a884] rounded-full transition-all duration-100"
                style={{
                  height: `${Math.min(amp * 100, 96)}px`,
                  opacity: 0.6 + amp * 0.4,
                }}
              />
            ))
          ) : (
            // Placeholder bars
            [...Array(30)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-[#00a884]/30 rounded-full"
                style={{ height: '12px' }}
              />
            ))
          )}
        </div>

        {/* Duration display */}
        <div className="text-[#667781] text-lg font-mono mb-2">
          {formatDuration(duration)}
        </div>

        {/* Instructions */}
        <div className="text-[#667781] text-sm text-center max-w-xs">
          {duration < 1 
            ? 'Speak now...'
            : 'Tap the send button when you\'re done'
          }
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="bg-[#efeae2] px-6 py-6 pb-safe">
        <div className="flex items-center justify-center gap-6">
          {/* Cancel button */}
          <button
            onClick={handleCancel}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-[#f0f2f5] hover:bg-[#e4e6eb] transition-all active:scale-95 shadow-sm"
            aria-label="Cancel and delete"
          >
            <Trash2 className="w-6 h-6 text-[#54656f]" />
          </button>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={duration < 1}
            className="w-20 h-20 flex items-center justify-center rounded-full bg-[#00a884] hover:bg-[#00a884]/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            aria-label="Send voice message"
          >
            <Send className="w-8 h-8 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
