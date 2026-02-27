import { Bell, CalendarClock, Tag, CheckCircle } from 'lucide-react';

const formatDate = (value: any): string => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
};

type Props = {
  reminder: {
    id: string;
    taskId: string;
    title: string;
    purpose?: string;
    priority?: string;
    fromEmail?: string;
    fromName?: string;
    message?: string;
    createdAt?: any;
    task?: any;
  };
  onAcknowledge: () => void;
  onComplete?: () => void;
};

const getPriorityColor = (priority?: string) => {
  switch (priority?.toLowerCase()) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'low': return 'text-green-600 bg-green-50 border-green-200';
    default: return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};

const PersonalTaskReminderCard = ({ reminder, onAcknowledge, onComplete }: Props) => {
  const task = reminder?.task || {};

  const title = reminder?.title || String(task?.title || '').trim() || 'Personal Task';
  const message = String(reminder?.message || '').trim();
  const purpose = String(task?.purpose || reminder?.purpose || '').trim();
  const priority = String(task?.priority || reminder?.priority || '').trim();
  const due = formatDate(task?.dueDate || reminder?.createdAt);

  const priorityClass = getPriorityColor(priority);

  return (
    <div className="bg-white border border-indigo-200 shadow-2xl rounded-2xl overflow-hidden w-full max-w-md">
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-10 w-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">Personal Task Reminder</div>
              <div className="text-xs text-gray-500">
                {reminder?.fromName || 'Personal Task Manager'}
              </div>
            </div>
          </div>
          {priority && (
            <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${priorityClass}`}>
              {priority.charAt(0).toUpperCase() + priority.slice(1)}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {message ? (
          <div className="text-sm font-medium text-indigo-700 mb-3">{message}</div>
        ) : null}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="text-base font-bold text-gray-900 mb-2">{title}</div>

          {purpose && (
            <div className="text-sm text-gray-600 mb-3">
              <span className="font-medium">Purpose:</span> {purpose}
            </div>
          )}

          <div className="space-y-2 text-xs text-gray-600">
            {due && (
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-indigo-500" />
                <span className="font-medium">Reminder Time:</span> {due}
              </div>
            )}

            {task?.status && (
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-500" />
                <span className="font-medium">Status:</span> 
                <span className="capitalize">{task.status.replace('-', ' ')}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {onComplete && (
            <button
              type="button"
              onClick={onComplete}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Mark Complete
            </button>
          )}
          <button
            type="button"
            onClick={onAcknowledge}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonalTaskReminderCard;
