import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { UserType } from '../Types/Types';
import { managerMonthlyRankingService, type ManagerMonthlyRankingResponse, type ManagerMonthlyRankingRow } from '../Services/ManagerMonthlyRanking.service';

const pad2 = (n: number) => String(n).padStart(2, '0');

const monthKeyOfDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const normalizeRoleKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const toNumberSafe = (v: unknown): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return n;
};

const clampNonNegativeInt = (n: number): number => {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.floor(n));
};

const calcPercent = (assign: number, achieved: number): number => {
    if (assign <= 0) return 0;
    const pct = (achieved / assign) * 100;
    if (!Number.isFinite(pct)) return 0;
    return Math.max(0, pct);
};

const ManagerMonthlyRankingPage = ({ currentUser }: { currentUser: UserType }) => {
    const roleKey = useMemo(() => normalizeRoleKey((currentUser as any)?.role), [currentUser]);
    const canEdit = useMemo(() => roleKey === 'md_manager', [roleKey]);

    const [monthKey, setMonthKey] = useState<string>(() => monthKeyOfDate(new Date()));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [data, setData] = useState<ManagerMonthlyRankingResponse | null>(null);
    const [rowsDraft, setRowsDraft] = useState<ManagerMonthlyRankingRow[]>([]);

    const fetchMonthly = useCallback(async () => {
        setLoading(true);
        try {
            console.log('Fetching ranking for month:', monthKey);
            const res = await managerMonthlyRankingService.getMonthlyRanking(monthKey);
            console.log('Fetch response:', res);
            if (!res?.success || !res.data) {
                setData(null);
                setRowsDraft([]);
                return;
            }
            setData(res.data);
            // Crucial: use the rows from backend directly
            setRowsDraft(res.data.rows || []);
        } catch (err) {
            console.error('fetchMonthly error:', err);
        } finally {
            setLoading(false);
        }
    }, [monthKey]);

    useEffect(() => {
        void fetchMonthly();
    }, [fetchMonthly]);

    const computedRows = useMemo(() => {
        const list = Array.isArray(rowsDraft) ? rowsDraft : [];
        const mapped = list.map((r) => {
            const assign = clampNonNegativeInt(toNumberSafe((r as any).assign));
            const achieved = clampNonNegativeInt(toNumberSafe((r as any).achieved));
            const percent = calcPercent(assign, achieved);
            return {
                ...r,
                assign,
                achieved,
                percent,
                percentLabel: `${percent.toFixed(1)}%`
            };
        });
        mapped.sort((a, b) => (b.percent - a.percent) || (b.achieved - a.achieved) || (a.name || '').localeCompare(b.name || ''));
        return mapped;
    }, [rowsDraft]);

    const totals = useMemo(() => {
        const t = computedRows.reduce(
            (acc, r) => {
                acc.assign += toNumberSafe(r.assign);
                acc.achieved += toNumberSafe(r.achieved);
                return acc;
            },
            { assign: 0, achieved: 0 }
        );
        const percent = calcPercent(t.assign, t.achieved);
        return { ...t, percent, percentLabel: `${percent.toFixed(1)}%` };
    }, [computedRows]);

    const topRow = useMemo(() => computedRows[0] || null, [computedRows]);

    const handleChange = useCallback((userId: string, field: 'assign' | 'achieved', value: string) => {
        setRowsDraft((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((r) => {
                if (String((r as any).userId) !== String(userId)) return r;

                const currentAssign = clampNonNegativeInt(toNumberSafe((r as any).assign));
                const currentAchieved = clampNonNegativeInt(toNumberSafe((r as any).achieved));

                if (field === 'assign') {
                    const nextAssign = clampNonNegativeInt(toNumberSafe(value));
                    const nextAchieved = Math.min(currentAchieved, nextAssign);
                    return { ...r, assign: nextAssign, achieved: nextAchieved } as any;
                }

                const nextAchievedRaw = clampNonNegativeInt(toNumberSafe(value));
                const nextAchieved = Math.min(nextAchievedRaw, currentAssign);
                return { ...r, achieved: nextAchieved } as any;
            });
        });
    }, []);

    const save = useCallback(async () => {
        if (!canEdit) return;

        setSaving(true);
        try {
            const payload = {
                monthKey,
                rows: computedRows.map((r) => ({
                    userId: String(r.userId),
                    assign: clampNonNegativeInt(toNumberSafe(r.assign)),
                    achieved: Math.min(
                        clampNonNegativeInt(toNumberSafe(r.achieved)),
                        clampNonNegativeInt(toNumberSafe(r.assign))
                    )
                }))
            };
            console.log('Saving ranking payload:', payload);
            const res = await managerMonthlyRankingService.saveMonthlyRanking(payload);
            console.log('Save response:', res);
            if (!res?.success) {
                toast.error(res?.message || 'Failed to save');
                return;
            }

            toast.success('Saved successfully');
            await fetchMonthly();
        } catch (err) {
            console.error('Save error:', err);
            toast.error('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    }, [canEdit, computedRows, fetchMonthly, monthKey]);

    return (
        <div className="space-y-5 mb-15">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Employee of the Month Marketer</h2>
                        <p className="text-sm text-gray-500 mt-1">Assign vs Achieved (auto %) • Sorted by highest %</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="month"
                            value={monthKey}
                            onChange={(e) => setMonthKey(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                            disabled={loading || saving}
                        />

                        {canEdit ? (
                            <button
                                type="button"
                                onClick={() => void save()}
                                disabled={saving || loading}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        ) : null}
                    </div>
                </div>

                {data?.companyName ? (
                    <div className="mt-4 text-xs text-gray-500">
                        Company: <span className="font-semibold text-gray-800">{data.companyName}</span>
                        {data?.updatedAt ? (
                            <span>
                                {' '}
                                • Last updated: <span className="font-semibold text-gray-800">{new Date(String(data.updatedAt)).toLocaleString()}</span>
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <div className="text-sm font-semibold text-gray-900">Top Manager</div>
                        <div className="text-xs text-gray-500 mt-1">Highest % for selected month</div>
                    </div>

                    <div className="text-sm text-gray-700">
                        Total: <span className="font-semibold">{totals.percentLabel}</span>
                    </div>
                </div>

                <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-full bg-white overflow-hidden border border-amber-200 shadow-sm flex-shrink-0">
                                {topRow?.avatar ? (
                                    <img src={topRow.avatar} alt={topRow.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-base font-black text-amber-700 bg-amber-100 uppercase">
                                        {topRow?.name?.[0] || 'U'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="text-base font-semibold text-gray-900">{topRow?.name || 'Not any yet'}</div>
                                <div className="text-xs text-gray-600 mt-1">{topRow?.email || ''}</div>
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-amber-200 text-amber-800">
                            <span className="text-sm font-semibold">{topRow?.percentLabel || '0.0%'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gray-50">
                            <tr className="text-left text-sm font-semibold text-gray-700">
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Manager</th>
                                <th className="px-6 py-4">Assign</th>
                                <th className="px-6 py-4">Achieved</th>
                                <th className="px-6 py-4">%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {computedRows.map((r, idx) => {
                                const isTop = idx === 0;
                                return (
                                    <tr key={r.userId} className={isTop ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                        <td className="px-6 py-5 text-sm text-gray-700">{idx + 1}</td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white overflow-hidden border border-gray-200 shadow-sm flex-shrink-0">
                                                    {r.avatar ? (
                                                        <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-sm font-black text-blue-600 bg-blue-50 uppercase">
                                                            {r.name?.[0] || 'U'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{r.name}</div>
                                                    <div className="text-xs text-gray-500 mt-1">{r.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                value={String(r.assign ?? 0)}
                                                disabled={!canEdit || saving || loading}
                                                onChange={(e) => handleChange(r.userId, 'assign', e.target.value)}
                                                min={0}
                                            />
                                        </td>
                                        <td className="px-6 py-5">
                                            <input
                                                type="number"
                                                inputMode="numeric"
                                                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                                                value={String(r.achieved ?? 0)}
                                                disabled={!canEdit || saving || loading}
                                                onChange={(e) => handleChange(r.userId, 'achieved', e.target.value)}
                                                min={0}
                                                max={r.assign ?? 0}
                                            />
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full border bg-gray-50 text-gray-700">
                                                {r.percentLabel}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}

                            {computedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-sm text-gray-500">{loading ? 'Loading…' : 'No managers found'}</td>
                                </tr>
                            ) : null}

                            {computedRows.length > 0 ? (
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900" colSpan={2}>Grand Total</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{totals.assign}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{totals.achieved}</td>
                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{totals.percentLabel}</td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManagerMonthlyRankingPage;
