"use client";

// Local toast implementation - no external dependencies
// Toasts are now managed via /utils/toast.ts
// This component is kept for compatibility but does nothing

interface ToasterProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  expand?: boolean;
  richColors?: boolean;
  duration?: number;
  theme?: 'light' | 'dark' | 'system';
}

const Toaster = ({ ...props }: ToasterProps) => {
  // Toast container is now managed by /utils/toast.ts
  // This component is a no-op for compatibility
  return null;
};

export { Toaster };
