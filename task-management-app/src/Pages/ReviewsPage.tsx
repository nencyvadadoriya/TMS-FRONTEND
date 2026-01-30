import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { Task, UserType } from '../Types/Types';
import { taskService } from '../Services/Task.services';

type ReviewFilter = 'pending' | 'reviewed' | 'all';

const normalizeRole = (v: unknown) => String(v || '').trim().toLowerCase();

const ReviewsPage = ({ currentUser }: { currentUser: UserType }) => {
  const role = useMemo(() => normalizeRole(currentUser?.role), [currentUser?.role]);
  const canSubmit = false;
  const canView = role === 'ob_manager';

  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  const fetchReviews = useCallback(async () => {
    if (!canView) {
      toast.error('Access denied');
      return;
    }

    setLoading(true);
    try {
      const reviewedParam = filter === 'all' ? undefined : (filter === 'reviewed' ? true : false);
      const res = await taskService.getTaskReviews({ reviewed: reviewedParam });
      if (res.success) {
        setTasks(res.data || []);
      } else {
        toast.error(res.message || 'Failed to fetch reviews');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  }, [canView, filter]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const startEdit = (t: Task) => {
    setEditingId(t.id);
    setStars(Number((t as any).reviewStars || 5));
    setComment(String((t as any).reviewComment || ''));
  };

  const submit = async () => {
    if (!editingId) return;
    if (!canSubmit) {
      toast.error('You do not have permission to submit reviews');
      return;
    }

    const s = Number(stars);
    if (!Number.isFinite(s) || s < 1 || s > 5) {
      toast.error('Stars must be between 1 and 5');
      return;
    }

    setLoading(true);
    try {
      const res = await taskService.submitTaskReview(editingId, { reviewStars: s, reviewComment: comment });
      if (res.success) {
        toast.success('Review saved');
        setEditingId(null);
        setComment('');
        setStars(5);
        await fetchReviews();
      } else {
        toast.error(res.message || 'Failed to save review');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save review');
    } finally {
      setLoading(false);
    }
  };

  if (!canView) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
        <p className="text-sm text-gray-500 mt-2">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
            <p className="text-sm text-gray-500 mt-1">Manager can rate completed tasks (1–5 stars). OB Manager can view.</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as ReviewFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={loading}
            >
              <option value="pending">Pending reviews</option>
              <option value="reviewed">Reviewed</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Task</th>
                <th className="px-6 py-4">Assignee</th>
                <th className="px-6 py-4">Creator</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Stars</th>
                <th className="px-6 py-4">Comment</th>
                <th className="px-6 py-4">Reviewed At</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => {
                const reviewedStars = (t as any).reviewStars;
                const isReviewed = reviewedStars != null;
                const isEditing = editingId === t.id;

                const assigneeEmail = (t as any)?.assignedToUser?.email || (typeof t.assignedTo === 'string' ? t.assignedTo : (t.assignedTo as any)?.email) || '';
                const creatorEmail = (t as any)?.assignedByUser?.email || (typeof t.assignedBy === 'string' ? t.assignedBy : (t.assignedBy as any)?.email) || '';
                const reviewComment = String((t as any).reviewComment || '').trim();

                return (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-gray-900">{t.title}</div>
                      <div className="text-xs text-gray-500 mt-1">Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}</div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-700">{assigneeEmail || '—'}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{creatorEmail || '—'}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-gray-50 text-gray-700">
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-700">{isReviewed ? `${reviewedStars}/5` : '—'}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{reviewComment || '—'}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{(t as any).reviewedAt ? new Date((t as any).reviewedAt).toLocaleString() : '—'}</td>
                    <td className="px-6 py-5 text-right">
                      {canSubmit ? (
                        <button
                          type="button"
                          className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50"
                          onClick={() => startEdit(t)}
                          disabled={loading}
                        >
                          {isReviewed ? 'Edit' : 'Review'}
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}

                      {isEditing && (
                        <div className="mt-3 p-3 border border-gray-200 rounded-lg bg-white text-left">
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-700">Stars</label>
                            <select
                              value={stars}
                              onChange={(e) => setStars(Number(e.target.value))}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                              disabled={loading}
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </div>

                          <div className="mt-2">
                            <label className="block text-sm text-gray-700 mb-1">Comment</label>
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                              rows={3}
                              disabled={loading}
                            />
                          </div>

                          <div className="mt-3 flex items-center justify-end gap-2">
                            <button
                              type="button"
                              className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
                              onClick={() => setEditingId(null)}
                              disabled={loading}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="px-4 py-2 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                              onClick={() => submit()}
                              disabled={loading}
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {tasks.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-500" colSpan={8}>
                    {loading ? 'Loading…' : 'No tasks found'}
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

export default ReviewsPage;
