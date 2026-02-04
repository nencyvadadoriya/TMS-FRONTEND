import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { Task, UserType } from '../Types/Types';
import { taskService } from '../Services/Task.services';

type ReviewFilter = 'pending' | 'reviewed' | 'all';

const normalizeRole = (v: unknown) => String(v || '').trim().toLowerCase();

const pad2 = (n: number) => String(n).padStart(2, '0');

const monthKeyOfDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const performanceLevelForAvg = (avgStars: number) => {
  const v = Number(avgStars);
  if (!Number.isFinite(v)) return '—';
  if (v >= 4.5) return 'Excellent';
  if (v >= 4.0) return 'Very Good';
  if (v >= 3.0) return 'Good';
  return 'Improve';
};

const ReviewsPage = ({ currentUser }: { currentUser: UserType }) => {
  const role = useMemo(() => normalizeRole(currentUser?.role), [currentUser?.role]);
  const canSubmit = false;
  const canView = useMemo(() => {
    if (role === 'admin' || role === 'super_admin') return true;
    const perms = (currentUser as any)?.permissions;
    if (!perms || typeof perms !== 'object') return true;
    if (Object.keys(perms).length === 0) return true;
    if (typeof (perms as any).reviews_page === 'undefined') return true;
    const perm = String((perms as any).reviews_page || '').trim().toLowerCase();
    if (['deny', 'no', 'false', '0', 'disabled'].includes(perm)) return false;
    if (['allow', 'allowed', 'yes', 'true', '1'].includes(perm)) return true;
    return perm !== 'deny';
  }, [currentUser, role]);

  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('all');

  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const [month, setMonth] = useState<string>(() => monthKeyOfDate(new Date()));

  const [reviewedTasks, setReviewedTasks] = useState<Task[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [stars, setStars] = useState<number>(5);
  const [comment, setComment] = useState<string>('');

  const [tableStatFilter, setTableStatFilter] = useState<'all' | 'done' | 'pending' | 'reviewed'>('all');

  const normalizeEmailKey = useCallback((v: unknown): string => {
    const raw = String(v || '').trim().toLowerCase();
    if (!raw) return '';
    const base = raw.split('.deleted.')[0];
    return base.trim().toLowerCase();
  }, []);

  const resolveAssigneeEmailKey = useCallback((t: any): string => {
    const raw = (t as any)?.assignedToUser?.email
      || (typeof (t as any)?.assignedTo === 'string' ? (t as any)?.assignedTo : (t as any)?.assignedTo?.email)
      || '';
    return normalizeEmailKey(raw);
  }, [normalizeEmailKey]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { email: string; label: string }>();
    (tasks || []).forEach((t: any) => {
      const key = resolveAssigneeEmailKey(t);
      if (!key) return;

      const assignedToUser = (t as any)?.assignedToUser;
      const name = String(assignedToUser?.name || '').trim();
      const label = name ? `${name} (${key})` : key;
      if (!map.has(key)) map.set(key, { email: key, label });
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [resolveAssigneeEmailKey, tasks]);

  const selectedAssigneeKey = useMemo(() => {
    const key = normalizeEmailKey(assigneeFilter);
    return key && key !== 'all' ? key : 'all';
  }, [assigneeFilter, normalizeEmailKey]);

  const filteredTasks = useMemo(() => {
    if (selectedAssigneeKey === 'all') return tasks;
    return (tasks || []).filter((t: any) => resolveAssigneeEmailKey(t) === selectedAssigneeKey);
  }, [resolveAssigneeEmailKey, selectedAssigneeKey, tasks]);

  const tableTasks = useMemo(() => {
    const list = filteredTasks || [];
    if (tableStatFilter === 'done') {
      return list.filter((t: any) => String(t?.status || '').trim().toLowerCase() === 'completed');
    }
    if (tableStatFilter === 'pending') {
      return list.filter((t: any) => String(t?.status || '').trim().toLowerCase() !== 'completed');
    }
    if (tableStatFilter === 'reviewed') {
      return list.filter((t: any) => (t as any)?.reviewStars != null);
    }
    return list;
  }, [filteredTasks, tableStatFilter]);

  const filteredStats = useMemo(() => {
    const list = filteredTasks || [];
    const done = list.filter((t: any) => String(t?.status || '').trim().toLowerCase() === 'completed').length;
    const pending = list.length - done;
    const reviewed = list.filter((t: any) => (t as any)?.reviewStars != null).length;
    return { total: list.length, done, pending, reviewed };
  }, [filteredTasks]);

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

  const fetchReviewedForSummary = useCallback(async () => {
    if (!canView) return;

    try {
      const res = await taskService.getTaskReviews({ reviewed: true });
      if (res.success) {
        setReviewedTasks(res.data || []);
      }
    } catch {
      return;
    }
  }, [canView]);

  useEffect(() => {
    void fetchReviewedForSummary();
  }, [fetchReviewedForSummary]);

  const monthlySummary = useMemo(() => {
    const parseMonth = (value: string) => {
      const [y, m] = String(value || '').split('-').map((x) => Number(x));
      if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970 || m < 1 || m > 12) return null;
      const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const endExclusive = new Date(y, m, 1, 0, 0, 0, 0);
      return { start, endExclusive };
    };

    const monthRange = parseMonth(month);
    const reviewed = (reviewedTasks || []).filter((t) => {
      const stars = (t as any).reviewStars;
      const reviewedAtRaw = (t as any).reviewedAt;
      if (stars == null) return false;
      if (!reviewedAtRaw) return false;
      if (!monthRange) return true;
      const reviewedAt = new Date(reviewedAtRaw);
      if (Number.isNaN(reviewedAt.getTime())) return false;
      return reviewedAt >= monthRange.start && reviewedAt < monthRange.endExclusive;
    });

    const assigneeScoped = selectedAssigneeKey === 'all'
      ? reviewed
      : reviewed.filter((t: any) => resolveAssigneeEmailKey(t) === selectedAssigneeKey);

    const byAssignee = new Map<string, {
      email: string;
      name: string;
      total: number;
      starSum: number;
      stars: Record<number, number>;
    }>();

    assigneeScoped.forEach((t) => {
      const assignedToUser = (t as any)?.assignedToUser;
      const email = String(
        assignedToUser?.email
        || (typeof t.assignedTo === 'string' ? t.assignedTo : (t.assignedTo as any)?.email)
        || ''
      ).trim().toLowerCase();
      if (!email) return;
      if (email.includes('.deleted.')) return;

      const name = String(assignedToUser?.name || email);
      const starsValue = Number((t as any).reviewStars);
      if (!Number.isFinite(starsValue) || starsValue < 1 || starsValue > 5) return;

      const existing = byAssignee.get(email) || {
        email,
        name,
        total: 0,
        starSum: 0,
        stars: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
      };

      existing.total += 1;
      existing.starSum += starsValue;
      existing.stars[starsValue] = (existing.stars[starsValue] || 0) + 1;
      byAssignee.set(email, existing);
    });

    const rows = Array.from(byAssignee.values());
    const totalReviews = rows.reduce((sum, r) => sum + r.total, 0);
    const toPct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0);
    const formatPct = (v: number) => `${v.toFixed(1)}%`;
    const formatStars = (v: number) => `${v.toFixed(1)}`;

    const mapped = rows
      .map((r) => {
        const sharePct = toPct(r.total, totalReviews);
        const avgStars = r.total > 0 ? (r.starSum / r.total) : 0;
        const ratingPct = toPct(r.starSum, r.total * 5);
        const performance = performanceLevelForAvg(avgStars);
        const starPct = {
          5: toPct(r.stars[5] || 0, r.total),
          4: toPct(r.stars[4] || 0, r.total),
          3: toPct(r.stars[3] || 0, r.total),
          2: toPct(r.stars[2] || 0, r.total),
          1: toPct(r.stars[1] || 0, r.total),
        };
        return {
          ...r,
          sharePct,
          sharePctLabel: formatPct(sharePct),
          avgStars,
          avgStarsLabel: formatStars(avgStars),
          ratingPct,
          ratingPctLabel: formatPct(ratingPct),
          performance,
          starPct,
          starPctLabel: {
            5: formatPct(starPct[5]),
            4: formatPct(starPct[4]),
            3: formatPct(starPct[3]),
            2: formatPct(starPct[2]),
            1: formatPct(starPct[1]),
          }
        };
      })
      .sort((a, b) => (b.sharePct - a.sharePct) || (b.total - a.total) || a.name.localeCompare(b.name));

    const topEmail = mapped[0]?.email || null;
    return {
      totalReviews,
      rows: mapped,
      topEmail,
    };
  }, [month, resolveAssigneeEmailKey, reviewedTasks, selectedAssigneeKey]);

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
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={loading}
            />
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={loading}
            >
              <option value="all">All assistance</option>
              {assigneeOptions.map((o) => (
                <option key={o.email} value={o.email}>{o.label}</option>
              ))}
            </select>
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
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <button type="button" onClick={() => setTableStatFilter('all')} className={`px-2.5 py-1 rounded-full border ${tableStatFilter === 'all' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700'}`}>Total: {filteredStats.total}</button>
          <button type="button" onClick={() => setTableStatFilter('done')} className={`px-2.5 py-1 rounded-full border ${tableStatFilter === 'done' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700'}`}>Done: {filteredStats.done}</button>
          <button type="button" onClick={() => setTableStatFilter('pending')} className={`px-2.5 py-1 rounded-full border ${tableStatFilter === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700'}`}>Pending: {filteredStats.pending}</button>
          <button type="button" onClick={() => setTableStatFilter('reviewed')} className={`px-2.5 py-1 rounded-full border ${tableStatFilter === 'reviewed' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700'}`}>Reviewed: {filteredStats.reviewed}</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-gray-900">Monthly summary (person-wise)</div>
              <div className="text-xs text-gray-500 mt-1">Only reviewed tasks are included (based on reviewed date).</div>
            </div>
            <div className="text-sm text-gray-700">Total reviews: <span className="font-semibold">{monthlySummary.totalReviews}</span></div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm font-semibold text-gray-700">
                <th className="px-6 py-4">Assistance</th>
                <th className="px-6 py-4">Reviews</th>
                <th className="px-6 py-4">Total Stars</th>
                <th className="px-6 py-4">Avg</th>
                <th className="px-6 py-4">Rating %</th>
                <th className="px-6 py-4">Performance</th>
                <th className="px-6 py-4">Share %</th>
                <th className="px-6 py-4">5★</th>
                <th className="px-6 py-4">4★</th>
                <th className="px-6 py-4">3★</th>
                <th className="px-6 py-4">2★</th>
                <th className="px-6 py-4">1★</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {monthlySummary.rows.map((r) => {
                const isTop = monthlySummary.topEmail && monthlySummary.topEmail === r.email;
                return (
                  <tr key={r.email} className={isTop ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-5">
                      <div className="font-semibold text-gray-900">{r.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{r.email}</div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.total}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.starSum}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.avgStarsLabel}/5</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.ratingPctLabel}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.performance}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.sharePctLabel}</td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.stars[5] || 0} <span className="text-xs text-gray-500">({r.starPctLabel[5]})</span></td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.stars[4] || 0} <span className="text-xs text-gray-500">({r.starPctLabel[4]})</span></td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.stars[3] || 0} <span className="text-xs text-gray-500">({r.starPctLabel[3]})</span></td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.stars[2] || 0} <span className="text-xs text-gray-500">({r.starPctLabel[2]})</span></td>
                    <td className="px-6 py-5 text-sm text-gray-700">{r.stars[1] || 0} <span className="text-xs text-gray-500">({r.starPctLabel[1]})</span></td>
                  </tr>
                );
              })}

              {monthlySummary.rows.length === 0 && (
                <tr>
                  <td className="px-6 py-8 text-sm text-gray-500" colSpan={12}>
                    {loading ? 'Loading…' : 'No reviewed tasks found for selected month'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              {tableTasks.map((t) => {
                const reviewedStars = (t as any).reviewStars;
                const isReviewed = reviewedStars != null;
                const isEditing = editingId === t.id;

                const assigneeEmailRaw = (t as any)?.assignedToUser?.email || (typeof t.assignedTo === 'string' ? t.assignedTo : (t.assignedTo as any)?.email) || '';
                const creatorEmailRaw = (t as any)?.assignedByUser?.email || (typeof t.assignedBy === 'string' ? t.assignedBy : (t.assignedBy as any)?.email) || '';
                const assigneeEmail = String(assigneeEmailRaw || '').split('.deleted.')[0];
                const creatorEmail = String(creatorEmailRaw || '').split('.deleted.')[0];
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

              {tableTasks.length === 0 && (
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
