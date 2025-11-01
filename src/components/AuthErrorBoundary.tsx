import { AlertCircle, RefreshCw, Shield } from 'lucide-react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface AuthErrorBoundaryProps {
  show: boolean;
  onClearSession: () => void;
}

export function AuthErrorBoundary({ show, onClearSession }: AuthErrorBoundaryProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-300">
      {/* Subtle backdrop overlay */}
      <div className="absolute inset-0 bg-black/5 backdrop-blur-sm" />
      
      {/* Error card */}
      <div className="relative max-w-md w-full space-y-5 animate-in slide-in-from-bottom-4 zoom-in-95 duration-500">
        {/* Shield icon */}
        <div className="flex justify-center animate-in zoom-in duration-700 delay-150">
          <div className="relative">
            <div className="absolute inset-0 bg-destructive/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-destructive/10 p-4 rounded-full">
              <Shield className="h-12 w-12 text-destructive" />
            </div>
          </div>
        </div>

        {/* Error message */}
        <Alert variant="destructive" className="border-2 shadow-lg animate-in fade-in duration-500 delay-300">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-base">Authentication Error</AlertTitle>
          <AlertDescription className="mt-2 text-sm leading-relaxed">
            Your session is invalid or from a different AuroraLink instance. This happens when:
            <ul className="mt-3 space-y-1.5 text-xs list-none pl-0">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>You switched between different projects</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>Your session expired or became corrupted</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>Browser data conflicts detected</span>
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Action button */}
        <div className="space-y-3 animate-in fade-in duration-500 delay-500">
          <Button 
            onClick={onClearSession}
            className="w-full shadow-md hover:shadow-lg transition-all duration-200"
            size="lg"
            variant="default"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Clear Session & Reload
          </Button>
          
          <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
            This will clear all local authentication data and reload the app.
            <br />
            <span className="text-[11px]">You'll need to log in again after this action.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
