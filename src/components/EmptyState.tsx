import { LucideIcon } from 'lucide-react';
import { Button } from './ui/button';
import { motion } from 'motion/react';

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
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 20,
        }}
        className="relative mb-6"
      >
        {/* Animated background ring */}
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: 80, height: 80, marginLeft: -8, marginTop: -8 }}
        />
        
        {/* Icon container */}
        <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shadow-soft">
          <Icon className="w-8 h-8 text-primary" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="mb-2 text-xl">{title}</h3>
        {description && (
          <p className="text-muted-foreground mb-6 max-w-sm leading-relaxed">
            {description}
          </p>
        )}
        {actionLabel && onAction && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              onClick={onAction}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/20"
            >
              {actionLabel}
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
