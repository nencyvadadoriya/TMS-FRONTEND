import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

import type { Task, UserType } from '../Types/Types';
import { routepath } from '../Routes/route';

type Props = {
  task: Task | null;
  currentUser: UserType;
  users: UserType[];
  onSubmit: (payload: { assignedTo: string; dueDate: string }) => Promise<boolean>;
  isSubmitting: boolean;
};

export default function SpeedEcomReassignPage({ task, currentUser, users, onSubmit, isSubmitting }: Props) {
  const navigate = useNavigate();

  const normalizeText = useCallback((v: unknown) => String(v || '').trim().toLowerCase(), []);
  const normalizeRoleKey = useCallback((v: unknown) => normalizeText(v).replace(/[\s-]+/g, '_'), [normalizeText]);
  const normalizeCompanyKey = useCallback((v: unknown) => normalizeText(v).replace(/\s+/g, ''), [normalizeText]);

  const currentAssigneeEmail = useMemo(() => {
    const assignedTo: any = (task as any)?.assignedToUser || (task as any)?.assignedTo;
    const email =
      (typeof assignedTo === 'string' && assignedTo.includes('@') ? assignedTo : assignedTo?.email) ||
      '';
    return String(email || '').trim().toLowerCase();
  }, [task]);

  const assignedByEmail = useMemo(() => {
    const assignedBy: any = (task as any)?.assignedByUser || (task as any)?.assignedBy;
    const email =
      (typeof assignedBy === 'string' && assignedBy.includes('@') ? assignedBy : assignedBy?.email) ||
      '';
    return normalizeText(email);
  }, [normalizeText, task]);

  const myEmail = useMemo(() => normalizeText((currentUser as any)?.email), [currentUser, normalizeText]);
  const myRoleKey = useMemo(() => normalizeRoleKey((currentUser as any)?.role), [currentUser, normalizeRoleKey]);
  const myId = useMemo(() => String((currentUser as any)?.id || (currentUser as any)?._id || '').trim(), [currentUser]);
  const myManagerId = useMemo(() => String((currentUser as any)?.managerId || '').trim(), [currentUser]);

  const allowedPairIds = useMemo(() => {
    const ids = new Set<string>();
    if (myId) ids.add(myId);
    const list = Array.isArray(users) ? users : [];

    if (myRoleKey === 'rm') {
      list.forEach((u: any) => {
        const uid = String(u?.id || u?._id || '').trim();
        const urole = normalizeRoleKey(u?.role);
        const mgr = String(u?.managerId || '').trim();
        if (uid && urole === 'am' && mgr && myId && mgr === myId) ids.add(uid);
      });
    }

    if (myRoleKey === 'am') {
      if (myManagerId) ids.add(myManagerId);
    }

    return ids;
  }, [myId, myManagerId, myRoleKey, normalizeRoleKey, users]);

  const canReassign = useMemo(() => {
    if (!task) return false;
    const taskStatusKey = String((task as any)?.status || '').trim().toLowerCase();
    const isTaskCompleted = taskStatusKey === 'completed';
    if (!isTaskCompleted) return false;

    const isCreator = Boolean(myEmail && assignedByEmail && myEmail === assignedByEmail);
    if (isCreator) return true;

    if (myRoleKey !== 'rm' && myRoleKey !== 'am') return false;

    const assignedById = String((task as any)?.assignedByUser?.id || (task as any)?.assignedByUser?._id || '').trim();
    if (assignedById && allowedPairIds.has(assignedById)) return true;

    if (!assignedByEmail) return false;
    const found = (users || []).find((u: any) => normalizeText(u?.email) === assignedByEmail);
    const foundId = String((found as any)?.id || (found as any)?._id || '').trim();
    return Boolean(foundId && allowedPairIds.has(foundId));
  }, [allowedPairIds, assignedByEmail, myEmail, myRoleKey, normalizeText, task, users]);

  const availableUsers = useMemo(() => {
    const SPEED_ECOM_KEY = 'speedecom';
    const list = Array.isArray(users) ? users : [];
    const filtered = list.filter((u: any) => normalizeCompanyKey(u?.companyName || u?.company) === SPEED_ECOM_KEY);
    const restricted = filtered.filter((u: any) => {
      const uid = String(u?.id || u?._id || '').trim();
      const urole = normalizeRoleKey(u?.role);
      if (myRoleKey === 'sbm') return true;
      if (myRoleKey === 'rm' || myRoleKey === 'am') {
        if (urole === 'sbm' || urole === 'admin' || urole === 'super_admin') return true;
        return Boolean(uid && allowedPairIds.has(uid));
      }
      return false;
    });

    // Always include current assignee as a safe fallback
    const withAssignee = (() => {
      if (!currentAssigneeEmail) return restricted;
      const found = filtered.find((u: any) => normalizeText(u?.email) === currentAssigneeEmail);
      if (!found) return restricted;
      const already = restricted.some((u: any) => normalizeText(u?.email) === currentAssigneeEmail);
      return already ? restricted : [...restricted, found];
    })();

    return withAssignee.sort((a: any, b: any) => String(a?.email || '').localeCompare(String(b?.email || '')));
  }, [allowedPairIds, currentAssigneeEmail, myRoleKey, normalizeCompanyKey, normalizeRoleKey, normalizeText, users]);

  const initialDueDate = useMemo(() => {
    const raw = (task as any)?.dueDate;
    if (!raw) return '';
    try {
      return new Date(raw).toISOString().split('T')[0] || '';
    } catch {
      return '';
    }
  }, [task]);
  const [dueDate, setDueDate] = useState<string>(initialDueDate);
  const [newAssigneeEmail, setNewAssigneeEmail] = useState<string>(() => {
    const current = currentAssigneeEmail;
    if (current) return current;
    const first = (availableUsers || [])[0] as any;
    return normalizeText(first?.email);
  });

  const handleBack = useCallback(() => {
    navigate(routepath.tasks);
  }, [navigate]);

  const handleSubmit = useCallback(async () => {
    if (!task?.id) {
      toast.error('Task not found');
      return;
    }

    if (!canReassign) {
      toast.error('You do not have permission to reassign this task');
      return;
    }

    if (!currentAssigneeEmail) {
      toast.error('Current assignee email not found');
      return;
    }

    if (!newAssigneeEmail) {
      toast.error('Please select a new assignee');
      return;
    }

    if (!dueDate) {
      toast.error('Due date is required');
      return;
    }

    const ok = await onSubmit({ assignedTo: newAssigneeEmail, dueDate });
    if (ok) {
      toast.success('Task reassigned successfully');
      navigate(routepath.tasks);
    }
  }, [canReassign, currentAssigneeEmail, dueDate, navigate, newAssigneeEmail, onSubmit, task?.id]);

  if (!task) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          <div className="text-sm text-gray-700">Task not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <UserPlus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Speed E Com Reassign</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-blue-100">Reassign with due date change</p>
                  {task.status === 'reassigned' && (
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-white text-blue-600 rounded-full shadow-sm">
                      Reassigned
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white/90 hover:bg-white/20 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="text-sm font-semibold text-gray-900 mb-1">{task.title}</div>
            <div className="text-xs text-gray-600">Task ID: {task.id}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Current Assignee Email</label>
              <select
                value={currentAssigneeEmail}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700"
              >
                <option value={currentAssigneeEmail}>{currentAssigneeEmail || '—'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reassign To</label>
              <select
                value={newAssigneeEmail}
                onChange={(e) => setNewAssigneeEmail(e.target.value)}
                disabled={isSubmitting || !canReassign}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!canReassign ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-700'}`}
              >
                <option value="">Select team member</option>
                {availableUsers.map((u: any) => (
                  <option key={String(u?.id || u?._id || u?.email)} value={normalizeText(u?.email)}>
                    {String(u?.email || '').trim()}
                  </option>
                ))}
              </select>
              {!canReassign && (
                <p className="mt-2 text-sm text-red-600">Only the task creator can reassign (AM allowed if RM created it).</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting || !canReassign}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-8">
            <button
              type="button"
              onClick={handleBack}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !dueDate}
              className="px-6 py-2 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Reassign & Update Due Date'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
