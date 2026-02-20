import { Bell, CalendarClock, Tag, User } from 'lucide-react';

const formatDate = (value: any): string => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

type Props = {
  reminder: {
    id: string;
    fromEmail?: string;
    message?: string;
    createdAt?: any;
    task?: any;
  };
  onAcknowledge: () => void;
};

const TaskReminderCard = ({ reminder, onAcknowledge }: Props) => {
  const task = reminder?.task || {};

  const title = String(task?.title || '').trim() || 'Task';
  const message = String(reminder?.message || '').trim();

  const company = String(task?.companyName || task?.company || '').trim();
  const brand = String(task?.brand || '').trim();
  const due = formatDate(task?.dueDate);
  const assignedTo = String(task?.assignedToUser?.email || task?.assignedTo?.email || task?.assignedTo || '').trim();

  return (
    <div className="bg-white border border-blue-200 shadow-xl rounded-2xl overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-blue-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-9 w-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Task Reminder</div>
              <div className="text-xs text-gray-500">From: {reminder?.fromEmail || '—'}</div>
            </div>
          </div>
          <button type="button" onClick={onAcknowledge} className="text-xs text-gray-500 hover:text-gray-700">
            Acknowledge
          </button>
        </div>
      </div>

      <div className="p-4">
        {message ? (
          <div className="text-sm text-gray-800 whitespace-pre-wrap">{message}</div>
        ) : null}

        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="text-sm font-semibold text-gray-900 truncate">{title}</div>

          <div className="mt-2 space-y-1.5 text-xs text-gray-600">
            {assignedTo ? (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                <span className="truncate">Assignee: {assignedTo}</span>
              </div>
            ) : null}

            {due ? (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-3.5 w-3.5" />
                <span className="truncate">Due: {due}</span>
              </div>
            ) : null}

            {company ? (
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                <span className="truncate">Company: {company}</span>
              </div>
            ) : null}

            {brand ? (
              <div className="flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" />
                <span className="truncate">Brand: {brand}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onAcknowledge}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskReminderCard;
