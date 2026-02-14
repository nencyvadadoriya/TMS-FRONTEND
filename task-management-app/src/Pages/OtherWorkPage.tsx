import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { Task, UserType } from '../Types/Types';
import { taskService } from '../Services/Task.services';

type ReviewStateByTaskId = Record<string, { stars: number; comment: string } | undefined>;

const normalizeEmail = (v: unknown) => String(v || '').trim().toLowerCase();
const normalizeText = (v: unknown) => String(v || '').trim().toLowerCase();

const OtherWorkPage = ({ currentUser, tasks, onRefreshTasks }: { currentUser: UserType; tasks: Task[]; onRefreshTasks: () => Promise<void> | void }) => {
  const myEmail = useMemo(() => normalizeEmail(currentUser?.email), [currentUser?.email]);
  const role = useMemo(() => String((currentUser as any)?.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_'), [currentUser]);

  const isManagerRole = role === 'manager' || role === 'md_manager' || role === 'admin' || role === 'super_admin';
  const isAssistantRole = role === 'assistant' || role === 'sub_assistance';
  const isObManagerRole = role === 'ob_manager';

  const otherWorkTasks = useMemo(() => {
    if (!myEmail) return [];
    return (tasks || []).filter((t: any) => {
      const assignedBy = normalizeEmail(t?.assignedByUser?.email || t?.assignedBy);
      const assignedTo = normalizeEmail(t?.assignedToUser?.email || t?.assignedTo);
      const assignedToRole = normalizeText(t?.assignedToUser?.role);
      const taskTypeKey = normalizeText(t?.taskType || t?.type);
      if (taskTypeKey !== 'other work') return false;

      // Manager/Admin: tasks created by me
      if (isManagerRole) {
        if (assignedBy !== myEmail) return false;
        return true;
      }

      // OB Manager: see tasks assigned to assistance/sub_assistance users (any assigner)
      if (isObManagerRole) {
        return assignedToRole === 'assistant' || assignedToRole === 'assistance' || assignedToRole === 'sub_assistance';
      }

      // Assistant/Sub Assistance: tasks assigned to me
      if (isAssistantRole) {
        if (assignedTo !== myEmail) return false;
        return true;
      }

      return true;
    });
  }, [tasks, myEmail, isManagerRole, isObManagerRole, isAssistantRole]);

  const summary = useMemo(() => {
    const list = otherWorkTasks || [];
    const done = list.filter((t: any) => String(t?.status || '').toLowerCase() === 'completed').length;
    const reviewed = list.filter((t: any) => (t as any)?.reviewStars != null).length;
    return { total: list.length, done, reviewed };
  }, [otherWorkTasks]);

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

  if (!isManagerRole && !isAssistantRole && !isObManagerRole) {
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
        <p className="text-sm text-gray-500 mt-1">
          {isManagerRole
            ? 'Tasks assigned by you (Other Work). Add reviews after completion.'
            : isObManagerRole
              ? 'Other Work tasks assigned to assistance users.'
              : 'Your Other Work tasks and the reviews given by managers.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700">Total: {summary.total}</span>
          <span className="px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700">Done: {summary.done}</span>
          <span className="px-2.5 py-1 rounded-full border bg-gray-50 text-gray-700">Reviewed: {summary.reviewed}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full table-fixed">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm font-semibold text-gray-700">
                <th className="px-4 py-4 w-[26%]">Task</th>
                <th className="px-4 py-4 w-[16%]">Assigned By</th>
                <th className="px-4 py-4 w-[16%]">Assignee</th>
                <th className="px-4 py-4 w-[10%]">Status</th>
                <th className="px-4 py-4 w-[22%]">Review</th>
                <th className="px-4 py-4 w-[10%] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {otherWorkTasks.map((t: any) => {
                const taskId = String(t.id || t._id || '');
                const assignedByEmail = String(t?.assignedByUser?.email || (typeof t.assignedBy === 'string' ? t.assignedBy : t.assignedBy?.email) || '').trim();
                const status = String(t.status || '').toLowerCase();
                const isCompleted = status === 'completed';

                const existingStars = t.reviewStars;
                const existingComment = t.reviewComment;
                const reviewedBy = String(t.reviewedByUser?.email || t.reviewedBy || '').trim();
                const reviewedAt = (t as any).reviewedAt;

                const state = reviewState[taskId];
                const stars = Number(state?.stars ?? (existingStars || 5));
                const comment = String(state?.comment ?? (existingComment || ''));

                const assigneeEmail = String(t?.assignedToUser?.email || (typeof t.assignedTo === 'string' ? t.assignedTo : t.assignedTo?.email) || '').trim();

                return (
                  <tr key={taskId} className="hover:bg-gray-50">
                    <td className="px-4 py-5">
                      <div className="font-semibold text-gray-900">{t.title}</div>
                      <div className="text-xs text-gray-500 mt-1">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</div>
                    </td>
                    <td className="px-4 py-5 text-sm text-gray-700 truncate" title={assignedByEmail || '—'}>{assignedByEmail || '—'}</td>
                    <td className="px-4 py-5 text-sm text-gray-700 truncate" title={assigneeEmail || '—'}>{assigneeEmail || '—'}</td>
                    <td className="px-4 py-5">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-gray-50 text-gray-700">{t.status}</span>
                    </td>
                    <td className="px-4 py-5">
                      {isManagerRole ? (
                        <>
                          <div className="flex flex-col gap-2">
                            <select
                              value={stars}
                              onChange={(e) => setStars(taskId, Number(e.target.value))}
                              className="px-2 py-2 border border-gray-300 rounded text-sm"
                              disabled={saving || !isCompleted}
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                            <input
                              value={comment}
                              onChange={(e) => setComment(taskId, e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded text-sm w-full"
                              placeholder="Comment"
                              disabled={saving || !isCompleted}
                            />
                          </div>
                          {!isCompleted && (
                            <div className="text-xs text-gray-400 mt-1">Review allowed only after completion</div>
                          )}
                        </>
                      ) : (
                        <div className="text-sm text-gray-700">
                          <div className="font-medium">{existingStars != null ? `${existingStars}/5` : '—'}</div>
                          <div className="text-xs text-gray-500 mt-1">{String(existingComment || '').trim() || '—'}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {reviewedBy ? `By: ${reviewedBy}` : ''}
                            {reviewedBy && reviewedAt ? ' • ' : ''}
                            {reviewedAt ? `At: ${new Date(reviewedAt).toLocaleString()}` : ''}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-5 text-right">
                      {isManagerRole ? (
                        <button
                          type="button"
                          className="px-4 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                          disabled={saving || !isCompleted}
                          onClick={() => submitReview(taskId)}
                        >
                          Save Review
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
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
  );
};

export default OtherWorkPage;
