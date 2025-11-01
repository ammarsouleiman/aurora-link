import { AlertCircle, Settings } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface MicrophonePermissionDeniedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MicrophonePermissionDeniedDialog({
  open,
  onOpenChange,
}: MicrophonePermissionDeniedDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle>Microphone Access Denied</AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            You've denied microphone access. To send voice messages, you need to enable it in your browser settings.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Settings className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-3">
                <div className="font-medium">How to enable microphone access:</div>
                
                <div className="space-y-2 text-muted-foreground">
                  <div>
                    <div className="font-medium text-foreground mb-1">Chrome / Edge:</div>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the lock icon 🔒 in the address bar</li>
                      <li>Find "Microphone" and select "Allow"</li>
                      <li>Refresh the page</li>
                    </ol>
                  </div>
                  
                  <div>
                    <div className="font-medium text-foreground mb-1">Firefox:</div>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Click the permissions icon in the address bar</li>
                      <li>Remove the microphone block (X)</li>
                      <li>Click the mic button again to allow</li>
                    </ol>
                  </div>
                  
                  <div>
                    <div className="font-medium text-foreground mb-1">Safari:</div>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Go to Safari → Settings for This Website</li>
                      <li>Set Microphone to "Allow"</li>
                      <li>Refresh the page</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
            <div className="text-sm text-foreground">
              <strong>Tip:</strong> After changing your browser settings, try clicking the microphone button again.
            </div>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => onOpenChange(false)}>
            Got It
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
