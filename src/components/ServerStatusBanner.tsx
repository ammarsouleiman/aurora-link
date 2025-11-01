import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

interface ServerStatusBannerProps {
  onRetry?: () => void;
}

export function ServerStatusBanner({ onRetry }: ServerStatusBannerProps) {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    await onRetry?.();
    setTimeout(() => setRetrying(false), 1000);
  };

  return (
    <div className="bg-warning/10 border-b border-warning/20">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-warning-foreground">
                Unable to connect to server
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The backend server is not accessible. Please check your connection or try again later.
              </p>
            </div>
          </div>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleRetry}
              disabled={retrying}
              className="flex-shrink-0"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${retrying ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
