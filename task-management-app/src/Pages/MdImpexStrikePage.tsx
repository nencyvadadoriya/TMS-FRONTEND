import React, { useEffect, useMemo, useState } from 'react';
import type { Task, UserType } from '../Types/Types';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { strikeService } from '../Services/Strike.services';

const normalizeText = (v: unknown) => String(v || '').trim().toLowerCase();
const normalizeCompanyKey = (v: unknown) => normalizeText(v).replace(/\s+/g, '');
const normalizeRoleKey = (v: unknown) => normalizeText(v).replace(/[\s-]+/g, '_');

type StrikeRemovalEntry = {
  remark: string;
  removedAt: string;
  removedBy?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
};

type StrikeRecord = {
  id: string;
  taskId: string;
  companyKey: string;
  firstOverdueAt: string;
  isRemoved: boolean;
  removalHistory: StrikeRemovalEntry[];
  task: Task | null;
};

type Row = {
  managerId: string;
  managerName: string;
  managerEmail: string;
  strike: number;
  strikeTasks: Task[];
  removedStrike: number;
  removedStrikeTasks: Task[];
};

const MdImpexStrikePage = ({
  currentUser,
  users,
  tasks,
  isOverdue,
}: {
  currentUser: UserType;
  users: UserType[];
  tasks: Task[];
  isOverdue: (dueDate: string, status: string) => boolean;
}) => {
  void isOverdue;
  void tasks;

  const getAssigneeEmail = (task: any): string => {
    const assignedToUser = task?.assignedToUser;
    const assignedTo = task?.assignedTo;

    const email =
      (assignedToUser && typeof assignedToUser === 'object' ? assignedToUser.email : '') ||
      (assignedTo && typeof assignedTo === 'object' ? assignedTo.email : '') ||
      (typeof assignedTo === 'string' ? assignedTo : '') ||
      '';

    return String(email || '').trim().toLowerCase();
  };

  const getTaskCompletionAt = (task: any): Date | null => {
    const raw = (task as any)?.statusUpdatedAt;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const isLateCompletedTask = (task: any): boolean => {
    try {
      const status = normalizeText((task as any)?.status);
      if (status !== 'completed') return false;
      const due = new Date((task as any)?.dueDate);
      if (Number.isNaN(due.getTime())) return false;
      
      const completedAt = getTaskCompletionAt(task);
      if (!completedAt) return false;

      // Mark as late only if completed after the due date day has passed (end of due day).
      const dueEndOfDay = new Date(
        due.getFullYear(),
        due.getMonth(),
        due.getDate(),
        23,
        59,
        59,
        999
      );

      return completedAt.getTime() > dueEndOfDay.getTime();
    } catch {
      return false;
    }
  };

  const [expandedManager, setExpandedManager] = useState<string | null>(null);
  const [strikeRecords, setStrikeRecords] = useState<StrikeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string>('');
  const [removingStrikeId, setRemovingStrikeId] = useState<string | null>(null);
  const [removeRemark, setRemoveRemark] = useState('');

  const roleKey = useMemo(() => normalizeRoleKey((currentUser as any)?.role), [currentUser]);
  const canRemoveStrike = roleKey === 'md_manager';

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        setIsLoading(true);
        setLoadError('');
        const res = await strikeService.getMdImpexStrike();
        if (!isMounted) return;
        if (!res.success) {
          setLoadError(res.message || 'Failed to load strike data');
          setStrikeRecords([]);
          return;
        }
        const list = Array.isArray(res.data) ? res.data : [];
        setStrikeRecords(list);
      } catch (e: any) {
        if (!isMounted) return;
        setLoadError(e?.message || 'Failed to load strike data');
        setStrikeRecords([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const managerUsers = useMemo(() => {
    const list = Array.isArray(users) ? users : [];
    return list
      .filter((u: any) => {
        const r = normalizeRoleKey(u?.role);
        return r === 'manager';
      })
      .map((u: any) => ({
        ...u,
        id: String(u?.id || u?._id || '').trim(),
        email: String(u?.email || '').trim(),
        name: String(u?.name || u?.email || '').trim(),
      }))
      .filter((u: any) => Boolean(u.id || u.email));
  }, [users]);

  const managerNameByEmail = useMemo(() => {
    const m = new Map<string, string>();
    (managerUsers || []).forEach((u: any) => {
      const email = String(u?.email || '').trim().toLowerCase();
      const name = String(u?.name || u?.email || '').trim();
      if (email) m.set(email, name || email);
    });
    return m;
  }, [managerUsers]);

  const rows: Row[] = useMemo(() => {
    const byManagerEmail = new Map<string, Row>();

    void currentUser;

    const currentManagerId = String((currentUser as any)?.managerId || '').trim();
    const filterToSameMdManager = roleKey === 'manager' && Boolean(currentManagerId);

    // First pass: Pre-populate with ALL valid managers from managerUsers
    managerUsers.forEach((m: any) => {
      const email = String(m.email || '').trim().toLowerCase();
      if (!email || email.includes('.deleted.')) return;

      if (filterToSameMdManager) {
        const mManagerId = String(m?.managerId || '').trim();
        if (!mManagerId || mManagerId !== currentManagerId) return;
      }

      byManagerEmail.set(email, {
        managerId: String(m.id || m._id || '').trim() || email,
        managerName: String(m.name || m.email || '').trim() || email,
        managerEmail: email,
        strike: 0,
        strikeTasks: [],
        removedStrike: 0,
        removedStrikeTasks: [],
      });
    });

    // Second pass: map persisted strike records to managers
    (strikeRecords || []).forEach((rec: any) => {
      const t = rec?.task;
      if (!t) return;

      const company = normalizeCompanyKey((t as any)?.companyName || (t as any)?.company);
      if (company !== 'mdimpex') return;

      const managerEmail = getAssigneeEmail(t);
      if (!managerEmail || managerEmail.includes('.deleted.')) return;

      const existing = byManagerEmail.get(managerEmail);
      if (!existing) return;

      if (rec?.isRemoved) {
        existing.removedStrike += 1;
        existing.removedStrikeTasks.push(t);
      } else {
        existing.strike += 1;
        existing.strikeTasks.push(t);
      }
    });

    const out = Array.from(byManagerEmail.values());
    out.sort((a, b) => (b.strike - a.strike) || (b.removedStrike - a.removedStrike) || a.managerName.localeCompare(b.managerName));
    return out;
  }, [managerUsers, strikeRecords, currentUser, roleKey]);

  const removalHistory = useMemo(() => {
    const out: Array<{
      strikeId: string;
      taskId: string;
      taskTitle: string;
      managerEmail: string;
      managerName: string;
      remark: string;
      removedAt: string;
      removedByEmail: string;
      removedByName: string;
    }> = [];

    (strikeRecords || []).forEach((rec) => {
      const history = Array.isArray(rec?.removalHistory) ? rec.removalHistory : [];
      history.forEach((h) => {
        const taskAny: any = rec?.task as any;
        const mgrEmail = taskAny ? getAssigneeEmail(taskAny) : '';
        const mgrName = mgrEmail ? (managerNameByEmail.get(mgrEmail) || mgrEmail) : '';
        out.push({
          strikeId: String(rec.id || ''),
          taskId: String(rec.taskId || ''),
          taskTitle: String((rec.task as any)?.title || ''),
          managerEmail: String(mgrEmail || ''),
          managerName: String(mgrName || ''),
          remark: String((h as any)?.remark || ''),
          removedAt: String((h as any)?.removedAt || ''),
          removedByEmail: String((h as any)?.removedBy?.email || ''),
          removedByName: String((h as any)?.removedBy?.name || ''),
        });
      });
    });

    out.sort((a, b) => String(b.removedAt).localeCompare(String(a.removedAt)));
    return out;
  }, [strikeRecords, managerNameByEmail]);

  const removedByManager = useMemo(() => {
    const groups = new Map<string, { managerEmail: string; managerName: string; tasks: Task[] }>();
    (strikeRecords || [])
      .filter((s: any) => Boolean(s?.isRemoved) && Boolean(s?.task))
      .forEach((s: any) => {
        const t: any = s.task;
        const managerEmail = t ? getAssigneeEmail(t) : '';
        if (!managerEmail) return;
        if (managerEmail.includes('.deleted.')) return;
        const managerName = managerNameByEmail.get(managerEmail) || managerEmail;
        const existing = groups.get(managerEmail) || { managerEmail, managerName, tasks: [] };
        existing.tasks.push(t);
        groups.set(managerEmail, existing);
      });

    const out = Array.from(groups.values());
    out.sort((a, b) => a.managerName.localeCompare(b.managerName));
    return out;
  }, [strikeRecords, managerNameByEmail]);

  const removedTasksByManagerEmail = useMemo(() => {
    const m = new Map<string, Task[]>();
    (removedByManager || []).forEach((g) => {
      const key = String(g.managerEmail || '').trim().toLowerCase();
      if (!key) return;
      m.set(key, Array.isArray(g.tasks) ? g.tasks : []);
    });
    return m;
  }, [removedByManager]);

  const removalHistoryByManager = useMemo(() => {
    const groups = new Map<string, { managerEmail: string; managerName: string; entries: typeof removalHistory }>();
    (removalHistory || []).forEach((h) => {
      const key = String(h.managerEmail || '').trim().toLowerCase();
      if (!key) return;
      if (key.includes('.deleted.')) return;
      const managerName = managerNameByEmail.get(key) || h.managerName || key;
      const existing = groups.get(key) || { managerEmail: key, managerName, entries: [] as any };
      (existing.entries as any).push(h);
      groups.set(key, existing);
    });
    const out = Array.from(groups.values());
    out.sort((a, b) => a.managerName.localeCompare(b.managerName));
    return out;
  }, [removalHistory, managerNameByEmail]);

  const removalHistoryEntriesByManagerEmail = useMemo(() => {
    const m = new Map<string, typeof removalHistory>();
    (removalHistoryByManager || []).forEach((g) => {
      const key = String(g.managerEmail || '').trim().toLowerCase();
      if (!key) return;
      m.set(key, Array.isArray(g.entries) ? g.entries : []);
    });
    return m;
  }, [removalHistoryByManager]);

  const refreshStrike = async () => {
    setIsLoading(true);
    setLoadError('');
    const res = await strikeService.getMdImpexStrike();
    setIsLoading(false);
    if (!res.success) {
      setLoadError(res.message || 'Failed to load strike data');
      return;
    }
    setStrikeRecords(Array.isArray(res.data) ? res.data : []);
  };

  const openRemoveModal = (strikeId: string) => {
    setLoadError('');
    setRemovingStrikeId(strikeId);
    setRemoveRemark('');
  };

  const closeRemoveModal = () => {
    setRemovingStrikeId(null);
    setRemoveRemark('');
  };

  const submitRemoveStrike = async () => {
    if (!removingStrikeId) return;
    const remark = String(removeRemark || '').trim();
    if (!remark) {
      setLoadError('Remark is required');
      return;
    }
    setLoadError('');
    const res = await strikeService.removeStrike(removingStrikeId, remark);
    if (!res.success) {
      setLoadError(res.message || 'Failed to remove strike');
      return;
    }
    closeRemoveModal();
    await refreshStrike();
  };

  if (roleKey !== 'manager' && roleKey !== 'md_manager' && roleKey !== 'admin') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900">Strike</h2>
        <p className="text-sm text-gray-500 mt-2">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Strike Status</h2>
            <p className="text-sm text-gray-500 mt-1">
              Persisted strike list (Once overdue, stays in strike until removed by MD Manager).
            </p>
          </div>
          
        </div>
        {isLoading && (
          <p className="text-sm text-gray-500 mt-4">Loading...</p>
        )}
        {loadError && (
          <p className="text-sm text-red-600 mt-4">{loadError}</p>
        )}
      </div>

      {removingStrikeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="absolute inset-0"
            onClick={closeRemoveModal}
          />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-gray-900">Remove from Strike</h3>
              <button
                type="button"
                onClick={closeRemoveModal}
                className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Remark</label>
                <textarea
                  value={removeRemark}
                  onChange={(e) => setRemoveRemark(e.target.value)}
                  className="w-full min-h-[110px] rounded-lg border border-gray-200 p-3 text-sm"
                  placeholder="Enter valid reason..."
                />
                <p className="text-xs text-gray-500">Remark is mandatory.</p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeRemoveModal}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitRemoveStrike}
                  className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Manager Details</th>
                <th className="px-6 py-4 text-center">Total Strike Tasks</th>
                <th className="px-6 py-4 text-center">Removed</th>
                <th className="px-6 py-4 text-center">Strike Tasks</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((r) => (
                <React.Fragment key={r.managerEmail}>
                  <tr
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedManager === r.managerEmail ? 'bg-blue-50/30' : ''}`}
                    onClick={() => setExpandedManager(expandedManager === r.managerEmail ? null : r.managerEmail)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900">{r.managerName || '—'}</span>
                        <span className="text-xs text-gray-500">{r.managerEmail}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                        {r.strike + r.removedStrike}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                        {r.removedStrike}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="inline-flex px-2.5 py-1 text-xs font-bold rounded-md bg-gray-100 text-gray-700 border border-gray-200">
                        {r.strike}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="text-gray-400 hover:text-gray-600">
                        {expandedManager === r.managerEmail ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </td>
                  </tr>

                  {expandedManager === r.managerEmail && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={5} className="px-6 py-4">
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500" />
                            Strike Tasks for {r.managerName}
                          </h4>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              {r.strikeTasks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                  {r.strikeTasks.map((task: any) => (
                                    <div key={task._id || task.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex justify-between items-start mb-2">
                                        {isLateCompletedTask(task) ? (
                                          <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded uppercase tracking-wider">Late Completed</span>
                                        ) : (
                                          <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase tracking-wider">Overdue</span>
                                        )}
                                        <span className="text-[10px] text-gray-400 font-mono">#{String(task._id || task.id).slice(-6)}</span>
                                      </div>
                                      <h5 className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">{task.title}</h5>
                                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 h-8">{task.description || 'No description'}</p>
                                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div className="flex flex-col">
                                          <span className="text-[10px] text-gray-400 uppercase">Due Date</span>
                                          <span className="text-xs font-bold text-gray-700">{new Date(task.dueDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                          <span className="text-[10px] text-gray-400 uppercase">Priority</span>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {task.priority}
                                          </span>
                                        </div>
                                      </div>
                                      {isLateCompletedTask(task) && (
                                        <div className="pt-3">
                                          <div className="text-[10px] text-gray-400 uppercase">Completed At</div>
                                          <div className="text-xs font-bold text-gray-700">
                                            {getTaskCompletionAt(task) ? getTaskCompletionAt(task)!.toLocaleString() : '—'}
                                          </div>
                                        </div>
                                      )}
                                      {canRemoveStrike && (
                                        <div className="pt-3">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const rec = (strikeRecords || []).find((sr) => {
                                                const srTaskId = String((sr as any)?.taskId || '');
                                                const tId = String((task as any)?._id || (task as any)?.id || '');
                                                return srTaskId && tId && srTaskId === tId && !(sr as any)?.isRemoved;
                                              });
                                              if (rec?.id) openRemoveModal(String(rec.id));
                                            }}
                                            className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100"
                                          >
                                            Remove from Strike
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
                                  <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                                  <p className="text-sm text-gray-500 font-medium">No strike tasks for this manager!</p>
                                </div>
                              )}
                            </div>

                            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                <div className="text-sm font-bold text-gray-900">Removal History</div>
                                <div className="text-xs text-gray-500">{r.managerName}</div>
                              </div>
                              <div className="p-4 space-y-4">
                                {(() => {
                                  const key = String(r.managerEmail || '').trim().toLowerCase();
                                  const removedTasks = removedTasksByManagerEmail.get(key) || [];
                                  const entries = removalHistoryEntriesByManagerEmail.get(key) || [];

                                  if (removedTasks.length === 0 && entries.length === 0) {
                                    return <p className="text-sm text-gray-500">No removal history.</p>;
                                  }

                                  return (
                                    <>
                                      {removedTasks.length > 0 && (
                                        <div>
                                          <div className="text-xs font-bold text-gray-600 uppercase">Removed Tasks</div>
                                          <div className="mt-2 space-y-2">
                                            {removedTasks.map((t: any) => (
                                              <div key={String(t?._id || t?.id)} className="rounded-xl border border-gray-200 p-3">
                                                <div className="text-sm font-bold text-gray-900 line-clamp-1">{String(t?.title || '—')}</div>
                                                <div className="text-xs text-gray-500">#{String(t?._id || t?.id || '').slice(-6)}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {entries.length > 0 && (
                                        <div>
                                          <div className="text-xs font-bold text-gray-600 uppercase">Remarks</div>
                                          <div className="mt-2 space-y-3">
                                            {entries.map((h) => (
                                              <div key={`${h.strikeId}-${h.removedAt}-${h.remark}`} className="rounded-xl border border-gray-200 p-3">
                                                <div className="flex items-start justify-between gap-3">
                                                  <div className="min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 line-clamp-1">{h.taskTitle || '—'}</div>
                                                    <div className="text-xs text-gray-500 line-clamp-2 mt-1">{h.remark}</div>
                                                    <div className="text-xs text-gray-500 mt-2">
                                                      Removed by: {h.removedByName || h.removedByEmail || '—'}
                                                    </div>
                                                  </div>
                                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                                    {h.removedAt ? new Date(h.removedAt).toLocaleString() : '—'}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td className="px-6 py-12 text-center" colSpan={5}>
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6 text-gray-300" />
                      </div>
                      <p className="text-gray-500 font-medium">No manager data available</p>
                    </div>
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

export default MdImpexStrikePage;
