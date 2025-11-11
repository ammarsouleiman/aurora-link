import { LucideIcon } from './ui/icons';
import { Button } from './ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="relative mb-6 animate-in zoom-in-50 duration-500">
        {/* Animated background ring */}
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 animate-pulse"
          style={{ width: 80, height: 80, marginLeft: -8, marginTop: -8, animationDuration: '3s' }}
        />
        
        {/* Icon container */}
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shadow-soft">
          <Icon className="w-8 h-8 text-primary" />
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
        <h3 className="mb-2 text-xl">{title}</h3>
        {description && (
          <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <Button 
            onClick={onAction}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-transform"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
