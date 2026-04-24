import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

function Toast({ message, onDismiss, durationMs = 3000 }: ToastProps) {
  useEffect(() => {
    if (message == null) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (message == null) return null;

  return (
    <div className="toast visible" role="status" aria-live="polite">
      <span className="toast-icon">✓</span>
      <span className="toast-text">{message}</span>
    </div>
  );
}

export default Toast;
