import { Mic, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface MicrophonePermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
}

export function MicrophonePermissionDialog({
  open,
  onOpenChange,
  onAllow,
}: MicrophonePermissionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mic className="w-6 h-6 text-primary" />
            </div>
            <AlertDialogTitle>Microphone Access Required</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              AuroraLink needs access to your microphone to record voice messages.
            </p>
            
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-info mt-0.5 flex-shrink-0" />
                <div className="text-sm space-y-2">
                  <p className="font-medium">What happens next:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Your browser will ask for microphone permission</li>
                    <li>Click "Allow" to enable voice messages</li>
                    <li>You can revoke access anytime in browser settings</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <p className="text-sm text-warning-foreground">
                <strong>Privacy Note:</strong> Your voice is only recorded when you press the microphone button. 
                Recordings are sent directly to the recipient and stored securely.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onAllow}>
            Allow Microphone Access
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
