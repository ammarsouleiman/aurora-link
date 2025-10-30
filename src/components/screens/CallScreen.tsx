import { useState, useEffect, useRef } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar } from '../Avatar';
import { motion } from 'motion/react';
import type { User as UserType } from '../../utils/types';

interface CallScreenProps {
  callType: 'voice' | 'video';
  recipientUser: UserType;
  currentUser: UserType;
  isInitiator: boolean;
  onEndCall: () => void;
  onCallConnected?: () => void;
  onCallFailed?: (error: string) => void;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

export function CallScreen({
  callType,
  recipientUser,
  currentUser,
  isInitiator,
  onEndCall,
  onCallConnected,
  onCallFailed,
  peerConnection,
  localStream,
  remoteStream,
}: CallScreenProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected'>('connecting');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Set up local stream
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    // Set up remote stream
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
      setCallStatus('connected');
      onCallConnected?.();
      
      // Start call duration timer
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [remoteStream, onCallConnected]);

  useEffect(() => {
    // Update status based on initiator
    if (isInitiator && callStatus === 'connecting') {
      setCallStatus('ringing');
    }
  }, [isInitiator, callStatus]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'connected':
        return formatDuration(callDuration);
      default:
        return '';
    }
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-surface via-background to-muted flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <motion.div 
          className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.5, 0.3, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {callType === 'video' ? (
        /* Video Call Layout */
        <div className="w-full h-full relative">
          {/* Remote video (fullscreen) */}
          <div className="w-full h-full bg-black relative">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Avatar
                  src={recipientUser.avatar_url}
                  alt={recipientUser.full_name}
                  fallbackText={recipientUser.full_name}
                  size="2xl"
                  className="mb-6"
                />
                <h2 className="text-white text-2xl mb-2">{recipientUser.full_name}</h2>
                <p className="text-white/70">{getStatusText()}</p>
                {callStatus === 'ringing' && (
                  <motion.div
                    className="mt-8 flex gap-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-3 h-3 rounded-full bg-white/50"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5],
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          delay: i * 0.2,
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Local video (picture-in-picture) */}
          {localStream && !isVideoOff && (
            <motion.div
              className="absolute top-4 right-4 w-40 h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-black"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 }}
              drag
              dragConstraints={{ top: 0, left: -200, right: 0, bottom: 400 }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            </motion.div>
          )}

          {/* Call info overlay (top) */}
          <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <Avatar
                  src={recipientUser.avatar_url}
                  alt={recipientUser.full_name}
                  fallbackText={recipientUser.full_name}
                  size="sm"
                />
                <div>
                  <h3 className="font-medium">{recipientUser.full_name}</h3>
                  <p className="text-xs text-white/70">{getStatusText()}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/10"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Controls (bottom) */}
          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/60 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="icon"
                  onClick={toggleMute}
                  className="h-14 w-14 rounded-full shadow-lg"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant={isVideoOff ? "destructive" : "secondary"}
                  size="icon"
                  onClick={toggleVideo}
                  className="h-14 w-14 rounded-full shadow-lg"
                  aria-label={isVideoOff ? "Turn on camera" : "Turn off camera"}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={onEndCall}
                  className="h-16 w-16 rounded-full shadow-lg bg-red-500 hover:bg-red-600"
                  aria-label="End call"
                >
                  <PhoneOff className="w-7 h-7" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      ) : (
        /* Voice Call Layout */
        <div className="relative z-10 flex flex-col items-center justify-center gap-8 p-8">
          {/* Recipient avatar with pulse animation */}
          <motion.div
            animate={{
              scale: callStatus === 'ringing' ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: callStatus === 'ringing' ? Infinity : 0,
              ease: "easeInOut"
            }}
            className="relative"
          >
            <Avatar
              src={recipientUser.avatar_url}
              alt={recipientUser.full_name}
              fallbackText={recipientUser.full_name}
              size="2xl"
              className="shadow-2xl"
            />
            {callStatus === 'ringing' && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-primary"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.8, 0, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
              />
            )}
          </motion.div>

          {/* Call info */}
          <div className="text-center">
            <h2 className="text-3xl mb-2">{recipientUser.full_name}</h2>
            <p className="text-muted-foreground text-lg">{getStatusText()}</p>
          </div>

          {/* Animated indicator for ringing */}
          {callStatus === 'ringing' && (
            <motion.div
              className="flex gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 rounded-full bg-primary"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-6 mt-8">
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                onClick={toggleMute}
                className="h-16 w-16 rounded-full shadow-lg"
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="destructive"
                size="icon"
                onClick={onEndCall}
                className="h-20 w-20 rounded-full shadow-2xl bg-red-500 hover:bg-red-600"
                aria-label="End call"
              >
                <PhoneOff className="w-8 h-8" />
              </Button>
            </motion.div>
          </div>

          {/* Hidden video element for local stream */}
          {localStream && (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="hidden"
            />
          )}
        </div>
      )}
    </div>
  );
}
