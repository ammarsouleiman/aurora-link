// Toast utility wrapper - using local sonner component
// Create simple toast implementation to bypass sonner CDN
let toastCount = 0;

interface ToastOptions {
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

function createToastElement(message: string, options?: ToastOptions) {
  toastCount++;
  const id = `toast-${toastCount}`;
  
  const toast = document.createElement('div');
  toast.id = id;
  toast.className = 'fixed bottom-4 right-4 z-[100] bg-surface border border-border rounded-lg shadow-lg p-4 max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300';
  
  const content = document.createElement('div');
  content.className = 'flex items-start gap-3';
  
  const textContainer = document.createElement('div');
  textContainer.className = 'flex-1';
  
  const messageEl = document.createElement('div');
  messageEl.className = 'font-medium text-foreground';
  messageEl.textContent = message;
  textContainer.appendChild(messageEl);
  
  if (options?.description) {
    const descEl = document.createElement('div');
    descEl.className = 'text-sm text-muted-foreground mt-1';
    descEl.textContent = options.description;
    textContainer.appendChild(descEl);
  }
  
  content.appendChild(textContainer);
  
  if (options?.action) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'text-sm font-medium text-primary hover:text-primary/80 transition-colors';
    actionBtn.textContent = options.action.label;
    actionBtn.onclick = () => {
      options.action!.onClick();
      removeToast(id);
    };
    content.appendChild(actionBtn);
  }
  
  toast.appendChild(content);
  document.body.appendChild(toast);
  
  const duration = options?.duration ?? 4000;
  setTimeout(() => removeToast(id), duration);
  
  return id;
}

function removeToast(id: string) {
  const toast = document.getElementById(id);
  if (toast) {
    toast.classList.add('animate-out', 'slide-out-to-bottom-5', 'fade-out');
    setTimeout(() => toast.remove(), 300);
  }
}

export const toast = Object.assign(
  (message: string, options?: ToastOptions) => createToastElement(message, options),
  {
    success: (message: string, options?: ToastOptions) => {
      return createToastElement(`✓ ${message}`, options);
    },
    error: (message: string, options?: ToastOptions) => {
      return createToastElement(`✕ ${message}`, options);
    },
    info: (message: string, options?: ToastOptions) => {
      return createToastElement(`ℹ ${message}`, options);
    },
    warning: (message: string, options?: ToastOptions) => {
      return createToastElement(`⚠ ${message}`, options);
    },
  }
);
