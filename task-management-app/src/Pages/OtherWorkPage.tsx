import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { Task, UserType } from '../Types/Types';
import { taskService } from '../Services/Task.services';

type ReviewStateByTaskId = Record<string, { stars: number; comment: string } | undefined>;

const normalizeEmail = (v: unknown) => String(v || '').trim().toLowerCase();
const normalizeText = (v: unknown) => String(v || '').trim().toLowerCase();

const OtherWorkPage = ({ currentUser, tasks, onRefreshTasks }: { currentUser: UserType; tasks: Task[]; onRefreshTasks: () => Promise<void> | void }) => {
  const myEmail = useMemo(() => normalizeEmail(currentUser?.email), [currentUser?.email]);
  const role = useMemo(() => String((currentUser as any)?.role || '').trim().toLowerCase(), [currentUser]);

  const canSee = role === 'manager' || role === 'md_manager' || role === 'admin' || role === 'super_admin';

  const otherWorkTasks = useMemo(() => {
    if (!myEmail) return [];
    return (tasks || []).filter((t: any) => {
      const assignedBy = normalizeEmail(t?.assignedByUser?.email || t?.assignedBy);
      const assignedTo = normalizeEmail(t?.assignedToUser?.email || t?.assignedTo);
      const obManagerEmail = normalizeEmail(t?.obManagerEmail);
      const taskTypeKey = normalizeText(t?.taskType || t?.type);
      if (assignedBy !== myEmail) return false;
      if (taskTypeKey !== 'other work') return false;

      // Include tasks routed to OB Manager OR tasks assigned back to the creator (self-assigned).
      return Boolean(obManagerEmail) || assignedTo === myEmail;
    });
  }, [tasks, myEmail]);

  const [saving, setSaving] = useState(false);
  const [reviewState, setReviewState] = useState<ReviewStateByTaskId>({});

  const setStars = (taskId: string, stars: number) => {
    setReviewState((prev) => ({
      ...prev,
      [taskId]: { stars, comment: prev[taskId]?.comment || '' }
    }));
  };

  const setComment = (taskId: string, comment: string) => {
    setReviewState((prev) => ({
      ...prev,
      [taskId]: { stars: prev[taskId]?.stars || 5, comment }
    }));
  };

  const submitReview = async (taskId: string) => {
    const state = reviewState[taskId];
    const stars = Number(state?.stars ?? 5);
    const comment = String(state?.comment ?? '').trim();

    if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
      toast.error('Stars must be between 1 and 5');
      return;
    }

    setSaving(true);
    try {
      const res = await taskService.submitTaskReview(taskId, { reviewStars: stars, reviewComment: comment });
      if (res.success) {
        toast.success('Review saved');
        await onRefreshTasks();
      } else {
        toast.error(res.message || 'Failed to save review');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  if (!canSee) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Other Work</h2>
        <p className="text-sm text-gray-500 mt-2">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Other Work</h2>
        <p className="text-sm text-gray-500 mt-1">Tasks you routed to an OB Manager. Add reviews after completion.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Task</th>
                <th className="px-6 py-4">OB Manager</th>
                <th className="px-6 py-4">Current Assignee</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Review</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {otherWorkTasks.map((t: any) => {
                const taskId = String(t.id || t._id || '');
                const obEmail = String(t.obManagerEmail || '').trim();
                const status = String(t.status || '').toLowerCase();
                const isCompleted = status === 'completed';

                const existingStars = t.reviewStars;
                const existingComment = t.reviewComment;

                const state = reviewState[taskId];
                const stars = Number(state?.stars ?? (existingStars || 5));
                const comment = String(state?.comment ?? (existingComment || ''));

                const assigneeEmail = String(t?.assignedToUser?.email || (typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?.email) || '').trim();

                return (
                  <tr key={taskId} className="hover:bg-gray-50">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-gray-900">{t.title}</div>
                      <div className="text-xs text-gray-500 mt-1">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-700">{obEmail || '—'}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{assigneeEmail || '—'}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-gray-50 text-gray-700">{t.status}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <select
                          value={stars}
                          onChange={(e) => setStars(taskId, Number(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          disabled={saving || !isCompleted}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <input
                          value={comment}
                          onChange={(e) => setComment(taskId, e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded text-sm w-full min-w-[240px]"
                          placeholder="Comment"
                          disabled={saving || !isCompleted}
                        />
                      </div>
                      {!isCompleted && (
                        <div className="text-xs text-gray-400 mt-1">Review allowed only after completion</div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                        disabled={saving || !isCompleted}
                        onClick={() => submitReview(taskId)}
                      >
                        Save Review
                      </button>
                    </td>
                  </tr>
                );
              })}

              {otherWorkTasks.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-500" colSpan={6}>
                    No tasks found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OtherWorkPage;
