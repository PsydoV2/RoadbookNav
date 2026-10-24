'use client';

import { useEffect } from 'react';
import { BTN_CANCEL, BTN_DELETE, BTN_PRIMARY } from './styles';

// Custom confirmation dialog — replaces browser confirm()
export interface ConfirmAction {
  message: string;
  confirmLabel?: string;   // default "Delete"
  cancelLabel?: string;    // default "Cancel"
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel?: () => void;   // runs in addition to closing
}

export function ConfirmDialog({ action, onClose }: { action: ConfirmAction; onClose: () => void }) {
  const cancel = () => {
    action.onCancel?.();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a1a] border border-white/25 rounded-2xl p-6 max-w-xs w-full flex flex-col gap-5">
        <p className="text-white text-sm leading-relaxed whitespace-pre-line">{action.message}</p>
        <div className="flex gap-3">
          <button onClick={cancel} className={`flex-1 py-3 px-4 ${BTN_CANCEL}`}>
            {action.cancelLabel ?? 'Cancel'}
          </button>
          <button
            onClick={action.onConfirm}
            className={`flex-1 py-3 px-4 ${action.tone === 'primary' ? `${BTN_PRIMARY} rounded-xl` : BTN_DELETE}`}
          >
            {action.confirmLabel ?? 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Non-blocking notification — replaces browser alert()
export interface ToastMessage {
  text: string;
  tone: 'info' | 'error';
}

export function Toast({ toast, onDismiss }: { toast: ToastMessage; onDismiss: () => void }) {
  useEffect(() => {
    const id = setTimeout(onDismiss, toast.tone === 'error' ? 6000 : 3500);
    return () => clearTimeout(id);
  }, [toast, onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[3000] px-4 w-full max-w-sm" role="status" aria-live="polite">
      <button
        onClick={onDismiss}
        className={`w-full text-left rounded-xl px-4 py-3 text-sm shadow-xl border ${
          toast.tone === 'error'
            ? 'bg-red-950 border-red-500/40 text-red-200'
            : 'bg-[#1f1f1f] border-white/20 text-white'
        }`}
      >
        {toast.text}
      </button>
    </div>
  );
}
