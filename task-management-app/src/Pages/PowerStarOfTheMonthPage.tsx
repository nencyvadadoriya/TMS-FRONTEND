import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Star } from 'lucide-react';

import type { UserType } from '../Types/Types';
import { powerStarMonthlyService, type PowerStarMonthlyResponse, type PowerStarMonthlyRow } from '../Services/PowerStarMonthly.service';

const pad2 = (n: number) => String(n).padStart(2, '0');
const monthKeyOfDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

const normalizeRoleKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const toNumberSafe = (v: unknown): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    return n;
};

const clampNonNegative = (n: number): number => {
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, n);
};

const normalizeWeekArray = (v: unknown): number[] => {
    const arr = Array.isArray(v) ? v : [];
    return [0, 0, 0, 0].map((_, idx) => clampNonNegative(toNumberSafe((arr as any)[idx])));
};

const weekLabels = ['W-1', 'W-2', 'W-3', 'W-4'];

type MetricKey = 'churn' | 'liveAssign' | 'hits';

const metricMeta: Array<{ key: MetricKey; title: string; valueSuffix?: string }> = [
    { key: 'churn', title: 'Churn' },
    { key: 'liveAssign', title: 'Live/Assign', valueSuffix: '%' },
    { key: 'hits', title: 'Hits' }
];

const sum = (arr: number[]) => (arr || []).reduce((a, b) => a + toNumberSafe(b), 0);

const avg = (arr: number[]) => {
    const a = Array.isArray(arr) ? arr.map((x) => toNumberSafe(x)) : [];
    if (a.length === 0) return 0;
    return sum(a) / a.length;
};

const metricTotal = (metric: MetricKey, weeks: number[]) => {
    if (metric === 'liveAssign') return avg(weeks);
    return sum(weeks);
};

const formatMetricTotal = (metric: MetricKey, n: number) => {
    if (metric === 'liveAssign') return `${n.toFixed(0)}%`;
    return String(Math.round(n));
};

const PowerStarOfTheMonthPage = ({ currentUser }: { currentUser: UserType }) => {
    const roleKey = useMemo(() => normalizeRoleKey((currentUser as any)?.role), [currentUser]);
    const canEdit = useMemo(() => roleKey === 'md_manager' || roleKey === 'all_manager', [roleKey]);

    const [monthKey, setMonthKey] = useState<string>(() => monthKeyOfDate(new Date()));
    const [activeMetric, setActiveMetric] = useState<MetricKey>('churn');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [data, setData] = useState<PowerStarMonthlyResponse | null>(null);
    const [rowsDraft, setRowsDraft] = useState<PowerStarMonthlyRow[]>([]);

    const fetchMonthly = useCallback(async () => {
        setLoading(true);
        try {
            const res = await powerStarMonthlyService.getMonthly(monthKey);
            if (!res?.success || !res.data) {
                setData(null);
                setRowsDraft([]);
                return;
            }
            setData(res.data);
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

    const rowsNormalized = useMemo(() => {
        const list = Array.isArray(rowsDraft) ? rowsDraft : [];
        return list.map((r) => ({
            ...r,
            churn: normalizeWeekArray((r as any).churn),
            liveAssign: normalizeWeekArray((r as any).liveAssign),
            hits: normalizeWeekArray((r as any).hits)
        }));
    }, [rowsDraft]);

    const handleWeekChange = useCallback((userId: string, metric: MetricKey, weekIndex: number, value: string) => {
        setRowsDraft((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((r) => {
                if (String((r as any).userId) !== String(userId)) return r;
                const nextArr = normalizeWeekArray((r as any)[metric]);
                nextArr[weekIndex] = clampNonNegative(toNumberSafe(value));
                return { ...r, [metric]: nextArr } as any;
            });
        });
    }, []);

    const save = useCallback(async () => {
        if (!canEdit) return;
        setSaving(true);
        try {
            const payload = {
                monthKey,
                rows: rowsNormalized.map((r) => ({
                    userId: String(r.userId),
                    churn: normalizeWeekArray(r.churn),
                    liveAssign: normalizeWeekArray(r.liveAssign),
                    hits: normalizeWeekArray(r.hits)
                }))
            };
            const res = await powerStarMonthlyService.saveMonthly(payload);
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
    }, [canEdit, fetchMonthly, monthKey, rowsNormalized]);

    const bestByMetric = useMemo(() => {
        const out: Record<string, PowerStarMonthlyRow | null> = {
            churn: null,
            liveAssign: null,
            hits: null
        };

        for (const metric of metricMeta) {
            const key = metric.key;
            const sorted = [...rowsNormalized].sort((a, b) => {
                const ta = metricTotal(key, (a as any)[key]);
                const tb = metricTotal(key, (b as any)[key]);
                if (key === 'churn') return ta - tb;
                return tb - ta;
            });
            out[key] = sorted[0] || null;
        }

        return out as Record<MetricKey, PowerStarMonthlyRow | null>;
    }, [rowsNormalized]);

    return (
        <div className="space-y-5 mb-15 overflow-x-hidden">
            <div className="bg-gradient-to-r from-amber-50/60 to-white rounded-2xl shadow-sm border border-amber-100 p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                            <span className="inline-flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-amber-100/70 text-amber-700 ring-1 ring-amber-200 shadow-sm">
                                    <Star className="h-5 w-5" />
                                </span>
                                <span>Power Star of the Month</span>
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Week wise (W-1 to W-4) • Churn / Live-Assign% / Hits</p>
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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-3 border-b border-gray-200">
                    <div className="grid grid-cols-3 gap-2">
                        {metricMeta.map((m) => {
                            const isActive = activeMetric === m.key;
                            return (
                                <button
                                    key={m.key}
                                    type="button"
                                    onClick={() => setActiveMetric(m.key)}
                                    className={
                                        `px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ` +
                                        (isActive
                                            ? 'bg-blue-600 text-white border-blue-600'
                                            : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50')
                                    }
                                >
                                    {m.title}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {(() => {
                    const m = metricMeta.find((x) => x.key === activeMetric) || metricMeta[0];
                    const top = bestByMetric[m.key];
                    const topWeeks = normalizeWeekArray((top as any)?.[m.key]);
                    const topTotal = metricTotal(m.key, topWeeks);

                    const grandWeeks = [0, 0, 0, 0].map((_, idx) => {
                        return rowsNormalized.reduce((acc, r) => acc + toNumberSafe(((r as any)[m.key] as number[])?.[idx]), 0);
                    });
                    const grandTotal = metricTotal(m.key, grandWeeks);

                    return (
                        <div className="w-full">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">{m.title}</h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {m.key === 'churn' ? 'Lowest total is Top' : 'Highest total is Top'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">Top</div>
                                        <div className="text-sm font-semibold text-gray-900">{top?.name || 'Not any yet'}</div>
                                        <div className="text-xs font-semibold text-gray-700">Total: {formatMetricTotal(m.key, topTotal)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full">
                                <table className="w-full table-auto">
                                    <thead className="bg-gray-50">
                                        <tr className="text-left text-xs font-semibold text-gray-700">
                                            <th className="px-3 py-2">Manager</th>
                                            {weekLabels.map((wl) => (
                                                <th key={wl} className="px-1 py-2 text-center whitespace-nowrap">{wl}</th>
                                            ))}
                                            <th className="px-3 py-2 text-right whitespace-nowrap">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {rowsNormalized.map((r) => {
                                            const weeks = normalizeWeekArray((r as any)[m.key]);
                                            const total = metricTotal(m.key, weeks);
                                            return (
                                                <tr key={r.userId} className="hover:bg-gray-50">
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                                                                {(r as any).avatar ? (
                                                                    <img src={(r as any).avatar} alt={r.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-[11px] font-black text-blue-600 bg-blue-50 uppercase">
                                                                        {r.name?.[0] || 'U'}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-gray-900 text-xs leading-4 truncate" title={r.name}>{r.name}</div>
                                                                <div className="hidden sm:block text-[10px] text-gray-500 leading-4 truncate" title={r.email}>{r.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {weekLabels.map((wl, weekIndex) => {
                                                        const val = toNumberSafe(weeks?.[weekIndex]);
                                                        return (
                                                            <td key={wl} className="px-1 py-2 text-center">
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    className="w-16 px-2 py-1.5 border border-gray-300 rounded-md text-[12px] bg-white text-center font-medium"
                                                                    value={String(val ?? 0)}
                                                                    disabled={!canEdit || saving || loading}
                                                                    onChange={(e) => handleWeekChange(r.userId, m.key, weekIndex, e.target.value)}
                                                                    min={0}
                                                                />
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-3 py-2 text-xs font-semibold text-gray-900 text-right whitespace-nowrap">
                                                        {formatMetricTotal(m.key, total)}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {rowsNormalized.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-10 text-sm text-gray-500">{loading ? 'Loading…' : 'No managers found'}</td>
                                            </tr>
                                        ) : null}

                                        {rowsNormalized.length > 0 ? (
                                            <tr className="bg-gray-50">
                                                <td className="px-3 py-2 text-xs font-semibold text-gray-900 whitespace-nowrap">Grand Total</td>
                                                {grandWeeks.map((v, idx) => (
                                                    <td key={idx} className="px-1 py-2 text-xs font-semibold text-gray-900 text-center">{Math.round(v)}</td>
                                                ))}
                                                <td className="px-3 py-2 text-xs font-semibold text-gray-900 text-right whitespace-nowrap">{formatMetricTotal(m.key, grandTotal)}</td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};

export default PowerStarOfTheMonthPage;
