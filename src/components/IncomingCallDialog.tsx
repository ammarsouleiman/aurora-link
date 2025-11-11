import { Phone, PhoneOff, Video } from './ui/icons';
import { Button } from './ui/button';
import { Avatar } from './Avatar';
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-surface rounded-3xl p-8 max-w-md w-full shadow-2xl border border-border animate-in zoom-in-95 duration-300">
        {/* Caller info */}
        <div className="flex flex-col items-center text-center mb-8">
          {/* Animated avatar */}
          <div className="relative mb-6 animate-pulse" style={{ animationDuration: '2s' }}>
            <Avatar
              src={caller.avatar_url}
              alt={caller.full_name}
              fallbackText={caller.full_name}
              size="2xl"
              className="shadow-xl"
            />
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-4 border-primary animate-ping" style={{ animationDuration: '2s' }} />
          </div>

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
          <div className="flex gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-primary animate-pulse"
                style={{
                  animationDuration: '1.5s',
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6">
          {/* Reject button */}
          <Button
            variant="destructive"
            size="icon"
            onClick={onReject}
            className="h-16 w-16 rounded-full shadow-lg bg-red-500 hover:bg-red-600 hover:scale-110 active:scale-95 transition-transform"
            aria-label="Reject call"
          >
            <PhoneOff className="w-7 h-7" />
          </Button>

          {/* Accept button */}
          <Button
            size="icon"
            onClick={onAccept}
            className="h-20 w-20 rounded-full shadow-xl bg-gradient-to-br from-success to-accent hover:from-success/90 hover:to-accent/90 hover:scale-110 active:scale-95 transition-transform animate-pulse"
            style={{ animationDuration: '1s' }}
            aria-label="Accept call"
          >
            {callType === 'video' ? (
              <Video className="w-8 h-8" />
            ) : (
              <Phone className="w-8 h-8" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
