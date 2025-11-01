import { Phone, PhoneOff, Video } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar } from './Avatar';
import { motion } from 'motion/react';
import type { User as UserType } from '../utils/types';

interface IncomingCallDialogProps {
  caller: UserType;
  callType: 'voice' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallDialog({
  caller,
  callType,
  onAccept,
  onReject,
}: IncomingCallDialogProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-surface rounded-3xl p-8 max-w-md w-full shadow-2xl border border-border"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        {/* Caller info */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Animated avatar */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative mb-6"
          >
            <Avatar
              src={caller.avatar_url}
              alt={caller.full_name}
              fallbackText={caller.full_name}
              size="2xl"
              className="shadow-xl"
            />
            {/* Pulse ring */}
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
          </motion.div>

          <h2 className="text-2xl mb-2">{caller.full_name}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            {callType === 'video' ? (
              <>
                <Video className="w-4 h-4" />
                <span>Incoming video call...</span>
              </>
            ) : (
              <>
                <Phone className="w-4 h-4" />
                <span>Incoming call...</span>
              </>
            )}
          </div>

          {/* Animated indicator */}
          <motion.div
            className="flex gap-2 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
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
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6">
          {/* Reject button */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant="destructive"
              size="icon"
              onClick={onReject}
              className="h-16 w-16 rounded-full shadow-lg bg-red-500 hover:bg-red-600"
              aria-label="Reject call"
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </motion.div>

          {/* Accept button */}
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Button
              size="icon"
              onClick={onAccept}
              className="h-20 w-20 rounded-full shadow-xl bg-gradient-to-br from-success to-accent hover:from-success/90 hover:to-accent/90"
              aria-label="Accept call"
            >
              {callType === 'video' ? (
                <Video className="w-8 h-8" />
              ) : (
                <Phone className="w-8 h-8" />
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
