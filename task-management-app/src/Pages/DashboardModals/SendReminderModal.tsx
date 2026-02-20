import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { Bell, Send, X } from 'lucide-react';

import type { Task } from '../../Types/Types';

type Props = {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSend: (message: string) => void | Promise<void>;
  isSending?: boolean;
};

const SendReminderModal = ({ open, task, onClose, onSend, isSending = false }: Props) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) setMessage('');
  }, [open]);

  const taskTitle = useMemo(() => {
    return String((task as any)?.title || '').trim();
  }, [task]);

  const canSend = useMemo(() => {
    return Boolean(open && task && !isSending);
  }, [open, task, isSending]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(message.trim());
  }, [canSend, message, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend();
    },
    [handleSend, onClose]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onKeyDown={handleKeyDown as any}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-200">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-semibold text-white">Send Reminder</div>
                <div className="text-sm text-blue-100 mt-0.5">
                  {taskTitle ? `Task: ${taskTitle}` : 'Task reminder message'}
                </div>
              </div>
            </div>
            <button onClick={onClose} disabled={isSending} className="p-1.5 text-white hover:bg-white/20 rounded-lg disabled:opacity-60">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6">
          <label className="block text-sm font-medium text-gray-900 mb-2">Reminder message (optional)</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Write a reminder for the assignee..."
            disabled={isSending}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
          />
          <div className="mt-2 text-xs text-gray-500">Tip: Press Ctrl+Enter to send</div>
        </div>

        <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-end gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4 mr-2" />
            {isSending ? 'Sending...' : 'Send Reminder'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendReminderModal;
