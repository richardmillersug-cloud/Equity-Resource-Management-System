// Professional Toast Hook Implementation
// Provides toast notifications for the application

import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

let toastCount = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ 
    title, 
    description, 
    variant = 'default',
    duration = 5000 
  }: Omit<Toast, 'id'>) => {
    const id = (++toastCount).toString();
    const newToast: Toast = { id, title, description, variant, duration };

    // Add toast to the list
    setToasts(prev => [...prev, newToast]);

    // Professional browser notification for important actions
    if (typeof window !== 'undefined') {
      // Use browser's alert for destructive actions (errors)
      if (variant === 'destructive') {
        window.alert(`❌ Error: ${title}\n${description || ''}`);
      } else {
        // Use browser's alert for success messages
        window.alert(`✅ ${title}\n${description || ''}`);
      }
    }

    // Auto remove toast after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);

    return { id };
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId));
  }, []);

  return {
    toast,
    dismiss,
    toasts
  };
};



