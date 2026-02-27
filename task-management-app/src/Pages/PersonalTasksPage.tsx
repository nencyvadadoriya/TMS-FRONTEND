import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Calendar, Clock, ListTodo, Pencil, Plus, Trash2, User, X } from 'lucide-react';
import type { UserType } from '../Types/Types';
import { personalTaskService, type PersonalTask, type PersonalTaskPriority, type PersonalTaskReminderStyle, type PersonalTaskStatus } from '../Services/PersonalTask.service';
interface PersonalTasksPageProps {
  currentUser: UserType;
}

const normalizeText = (v: any) => (v == null ? '' : String(v)).trim();
const formatDateTimeSafe = (value: any): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function PersonalTasksPage({ currentUser }: PersonalTasksPageProps) {
  const creatorEmail = useMemo(() => normalizeText(currentUser?.email).toLowerCase(), [currentUser?.email]);
  const companyName = useMemo(() => normalizeText((currentUser as any)?.companyName || (currentUser as any)?.company), [currentUser]);

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [tasks, setTasks] = useState<PersonalTask[]>([]);

  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState<PersonalTaskPriority>('medium');
  const [reminderStyle, setReminderStyle] = useState<PersonalTaskReminderStyle>('none');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [status, setStatus] = useState<PersonalTaskStatus>('pending');

  const [editingId, setEditingId] = useState<string | null>(null);

  const [reminderPopupTask, setReminderPopupTask] = useState<PersonalTask | null>(null);
  const timersRef = useRef<Record<string, number>>({});

  const canSubmit = useMemo(() => {
    if (!normalizeText(title)) return false;
    if (!creatorEmail) return false;
    if (reminderStyle === 'once' && !normalizeText(reminderDate)) return false;
    return true;
  }, [title, creatorEmail, reminderStyle, reminderDate]);

  useEffect(() => {
    if (reminderStyle === 'none') {
      setReminderDate('');
      setReminderTime('');
    }
  }, [reminderStyle]);

  const clearAllReminderTimers = useCallback(() => {
    const timers = timersRef.current;
    Object.keys(timers).forEach((k) => {
      const id = timers[k];
      if (id) window.clearTimeout(id);
    });
    timersRef.current = {};
  }, []);

  useEffect(() => {
    clearAllReminderTimers();

    const now = Date.now();
    const nextTimers: Record<string, number> = {};

    (tasks || []).forEach((t) => {
      if (!t?.id) return;
      if (t.reminderStyle !== 'once') return;
      if (!t.reminderAt) return;

      const target = new Date(t.reminderAt).getTime();
      if (!Number.isFinite(target)) return;
      const delay = target - now;
      if (delay <= 0) return;

      if (delay > 2147483000) return;

      nextTimers[t.id] = window.setTimeout(() => {
        setReminderPopupTask(t);
      }, delay);
    });

    timersRef.current = nextTimers;

    return () => {
      clearAllReminderTimers();
    };
  }, [tasks, clearAllReminderTimers]);

  const fetchMine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await personalTaskService.mine({ limit: 200 });
      if (!res.success) {
        toast.error(res.message || 'Failed to fetch personal tasks');
        setTasks([]);
        return;
      }
      setTasks(res.data as any);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMine();
  }, [fetchMine]);

  const onCreate = useCallback(async () => {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const hasDate = Boolean(normalizeText(reminderDate));
      const timePart = normalizeText(reminderTime) || '00:00';
      const reminderAtIso = hasDate ? new Date(`${reminderDate}T${timePart}`).toISOString() : null;

      const res = await personalTaskService.create({
        title: normalizeText(title),
        status,
        purpose: normalizeText(purpose),
        priority,
        reminderStyle,
        reminderAt: reminderAtIso,
        companyName
      });

      if (!res.success || !res.data) {
        toast.error(res.message || 'Failed to create personal task');
        return;
      }

      toast.success('Personal task created');
      setTitle('');
      setPurpose('');
      setPriority('medium');
      setReminderStyle('none');
      setReminderDate('');
      setReminderTime('');
      setStatus('pending');
      setEditingId(null);

      await fetchMine();
    } finally {
      setCreating(false);
    }
  }, [canSubmit, title, status, purpose, priority, reminderStyle, reminderDate, reminderTime, companyName, fetchMine]);

  const onDelete = useCallback(async (id: string) => {
    if (!id) return;
    const ok = window.confirm('Delete this personal task?');
    if (!ok) return;

    const res = await personalTaskService.delete(id);
    if (!res.success) {
      toast.error(res.message || 'Failed to delete');
      return;
    }
    toast.success('Deleted');
    await fetchMine();
  }, [fetchMine]);

  const startEdit = useCallback((t: PersonalTask) => {
    setEditingId(t.id);
    setTitle(t.title || '');
    setPurpose(t.purpose || '');
    setPriority((t.priority || 'medium') as PersonalTaskPriority);
    setReminderStyle((t.reminderStyle || 'none') as PersonalTaskReminderStyle);
    setStatus(((t as any).status || 'pending') as PersonalTaskStatus);

    const rAt = t.reminderAt ? new Date(t.reminderAt) : null;
    if (rAt && !Number.isNaN(rAt.getTime())) {
      const yyyy = String(rAt.getFullYear());
      const mm = String(rAt.getMonth() + 1).padStart(2, '0');
      const dd = String(rAt.getDate()).padStart(2, '0');
      const hh = String(rAt.getHours()).padStart(2, '0');
      const mi = String(rAt.getMinutes()).padStart(2, '0');
      setReminderDate(`${yyyy}-${mm}-${dd}`);
      setReminderTime(`${hh}:${mi}`);
    } else {
      setReminderDate('');
      setReminderTime('');
    }
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setTitle('');
    setPurpose('');
    setPriority('medium');
    setReminderStyle('none');
    setReminderDate('');
    setReminderTime('');
    setStatus('pending');
  }, []);

  const onSaveEdit = useCallback(async () => {
    if (!editingId) return;
    if (!canSubmit) return;

    setCreating(true);
    try {
      const hasDate = Boolean(normalizeText(reminderDate));
      const timePart = normalizeText(reminderTime) || '00:00';
      const reminderAtIso = hasDate ? new Date(`${reminderDate}T${timePart}`).toISOString() : null;

      const res = await personalTaskService.update(editingId, {
        title: normalizeText(title),
        purpose: normalizeText(purpose),
        priority,
        status,
        reminderStyle,
        reminderAt: reminderAtIso,
      });

      if (!res.success) {
        toast.error(res.message || 'Failed to update');
        return;
      }

      toast.success('Updated');
      cancelEdit();
      await fetchMine();
    } finally {
      setCreating(false);
    }
  }, [editingId, canSubmit, title, purpose, priority, status, reminderStyle, reminderDate, reminderTime, cancelEdit, fetchMine]);

  const onQuickStatusChange = useCallback(async (t: PersonalTask, nextStatus: PersonalTaskStatus) => {
    if (!t?.id) return;
    const res = await personalTaskService.update(t.id, { status: nextStatus });
    if (!res.success) {
      toast.error(res.message || 'Failed to update status');
      return;
    }
    await fetchMine();
  }, [fetchMine]);

  const reminderStyleHelp = useMemo(() => {
    if (reminderStyle === 'none') return 'No reminder will be scheduled.';
    if (reminderStyle === 'once') return 'You must pick a reminder date & time.';
    if (reminderStyle === 'daily') return 'Daily reminder style (schedule handling can be added later).';
    if (reminderStyle === 'weekly') return 'Weekly reminder style (schedule handling can be added later).';
    return '';
  }, [reminderStyle]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Personal Tasks
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Create tasks for yourself. Only you can see them.
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="border border-gray-200 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Personal Task
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  placeholder="Why are you creating this task?"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PersonalTaskPriority)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Style</label>
                  <select
                    value={reminderStyle}
                    onChange={(e) => setReminderStyle(e.target.value as PersonalTaskReminderStyle)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="none">None</option>
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <div className="text-xs text-gray-500 mt-1">{reminderStyleHelp}</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PersonalTaskStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Date & Time</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="date"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      disabled={reminderStyle === 'none'}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>

                  <div className="relative">
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      disabled={reminderStyle === 'none'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50"
                    />
                    <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                {reminderStyle === 'once' && !normalizeText(reminderDate) && (
                  <div className="text-xs text-red-600 mt-1">Reminder date is required for "Once"</div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-800">
                    {companyName || '—'}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-800 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="truncate">{creatorEmail || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {editingId ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={onSaveEdit}
                      disabled={!canSubmit || creating}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" />
                      {creating ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={creating}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={onCreate}
                    disabled={!canSubmit || creating}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    {creating ? 'Creating...' : 'Create Personal Task'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Your Personal Tasks</h3>
              <span className="text-sm text-gray-500">{tasks.length} total</span>
            </div>

            {loading ? (
              <div className="text-center py-10 text-sm text-gray-500">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-10 text-sm text-gray-500">
                No personal tasks yet.
              </div>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
                {tasks.map((t: PersonalTask) => (
                  <div key={t.id} className="border border-gray-200 rounded-xl p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">{t.title}</div>
                        {normalizeText(t.purpose) && (
                          <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{t.purpose}</div>
                        )}
                      </div>
                      <div className="shrink-0 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                        {t.priority}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                        {(t as any).status || 'pending'}
                      </span>
                      <button
                        onClick={() => onQuickStatusChange(t, 'in-progress')}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                      >
                        In Progress
                      </button>
                      <button
                        onClick={() => onQuickStatusChange(t, 'completed')}
                        className="text-xs px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                      >
                        Completed
                      </button>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          onClick={() => startEdit(t)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="inline-flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>Created: {formatDateTimeSafe(t.createdAt)}</span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>Reminder: {t.reminderStyle}{t.reminderAt ? ` (${formatDateTimeSafe(t.reminderAt)})` : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {reminderPopupTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setReminderPopupTask(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 flex items-center justify-between">
              <div className="text-white font-semibold">Reminder</div>
              <button
                onClick={() => setReminderPopupTask(null)}
                className="p-1.5 text-white hover:bg-white/20 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="text-lg font-bold text-gray-900">{reminderPopupTask.title}</div>
              {normalizeText(reminderPopupTask.purpose) && (
                <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{reminderPopupTask.purpose}</div>
              )}
              <div className="mt-4 text-sm text-gray-700">
                <div><span className="font-medium">Scheduled:</span> {formatDateTimeSafe(reminderPopupTask.reminderAt)}</div>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => setReminderPopupTask(null)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
