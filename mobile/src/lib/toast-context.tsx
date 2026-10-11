import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { UCToast, ToastMessage } from '../components/uc-toast';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (options: ToastOptions | string) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);

  const hideToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  const showToast = useCallback((options: ToastOptions | string) => {
    const toastData: ToastMessage =
      typeof options === 'string'
        ? { id: String(Date.now()), message: options, type: 'info', duration: 3000 }
        : {
            id: String(Date.now()),
            message: options.message,
            type: options.type ?? 'info',
            duration: options.duration ?? 3000,
          };

    setCurrentToast(toastData);
  }, []);

  const value = useMemo(() => ({ showToast, hideToast }), [showToast, hideToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentToast && <UCToast toast={currentToast} onDismiss={hideToast} />}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
