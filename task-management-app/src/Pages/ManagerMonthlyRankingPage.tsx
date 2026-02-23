import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {  Star, Award, CheckCircle, Users } from 'lucide-react';

import type { UserType } from '../Types/Types';
import { managerMonthlyRankingService, type ManagerMonthlyRankingResponse, type ManagerMonthlyRankingRow } from '../Services/ManagerMonthlyRanking.service';
import { toAvatarUrl } from '../utils/avatar';

const ALLOWED_MARKETER_MANAGER_EMAILS = new Set([
    'drashtismartbiz@gmail.com',
    'krunalsmartbiz@gmail.com',
    'harshsmartbiz@gmail.com'
]);

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

const normalizeEmailKey = (v: unknown): string => String(v || '').trim().toLowerCase();

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
        const filtered = list.filter((r) => ALLOWED_MARKETER_MANAGER_EMAILS.has(normalizeEmailKey((r as any).email)));
        const mapped = filtered.map((r) => {
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

    const formatMonthLabel = (value?: string): string => {
        const raw = String(value || '').trim();
        const [y, m] = raw.split('-').map((x) => Number(x));
        if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970 || m < 1 || m > 12) {
            return new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    };

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

  

    return (
        <div className="space-y-6 mb-5">
            {/* ─── MAIN CARD ─── */}
            {/* Calendar outside the card - right side */}
            <div className="flex justify-end mb-6">
                <div className="relative">
                    <input
                        type="month"
                        value={monthKey || ''}
                        onChange={(e) => setMonthKey(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 bg-white/60 text-slate-600 text-sm font-semibold shadow-sm cursor-pointer"
                        disabled={loading || saving}
                    />
                </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-white/80">
                
                {/* ✅ SOFT PASTEL GRADIENT BACKGROUND — sky blue → yellow → pink → white → green */}  
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(135deg, #e0f4ff 0%, #fef9c3 25%, #fce7f3 50%, #f0fdf4 75%, #e0f4ff 100%)',
                    }}
                />
    
                {/* Soft glow blob — sky blue top right */}
                <div
                    className="absolute -top-20 -right-20 w-80 h-80 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, #bae6fd 0%, transparent 70%)',
                        filter: 'blur(40px)',
                        opacity: 0.7,
                    }}
                />
                {/* Soft glow blob — pink left */}
                <div
                    className="absolute top-1/2 -left-16 w-64 h-64 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, #fbcfe8 0%, transparent 70%)',
                        filter: 'blur(40px)',
                        opacity: 0.6,
                    }}
                />
                {/* Soft glow blob — yellow bottom center */}
                <div
                    className="absolute -bottom-16 right-1/3 w-72 h-72 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, #fde68a 0%, transparent 70%)',
                        filter: 'blur(48px)',
                        opacity: 0.5,
                    }}
                />
                {/* Soft glow blob — green bottom right */}
                <div
                    className="absolute bottom-0 -right-10 w-56 h-56 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, #bbf7d0 0%, transparent 70%)',
                        filter: 'blur(36px)',
                        opacity: 0.55,
                    }}
                />

                {/* Dot grid texture */}
                <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                        backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
                        backgroundSize: '36px 36px',
                    }}
                />

                {/* ─── CONTENT ─── */}
                <div className="relative p-8">

                    {/* Top Bar */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div
                                className="p-2.5 rounded-xl shadow-md"
                                style={{ background: 'linear-gradient(135deg, #fbbf24, #f9a8d4)' }}
                            >
                                <Award className="h-5 w-5 text-white drop-shadow" />
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-sky-500 uppercase tracking-widest">
                                    {formatMonthLabel(monthKey)}
                                </span>
                                <h3 className="text-lg font-bold text-slate-700">Employee of the Month Marketer</h3>
                            </div>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="grid lg:grid-cols-2 gap-8 items-center">

                        {/* Left Column */}
                        <div className="space-y-6">

                            {/* Name & Performance */}
                            <div>
                                <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-800 mb-3 drop-shadow-sm">
                                    {computedRows.length > 0 ? topRow?.name : 'No data available for this month'}
                                </h1>
                                <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <div className="flex">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`h-5 w-5 ${
                                                        i < Math.floor((topRow?.percent || 0) / 20)
                                                            ? 'text-amber-400 fill-amber-400'
                                                            : 'text-slate-300'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-sm font-medium text-slate-500">
                                            ({topRow?.percentLabel || '0.0%'})
                                        </span>
                                    </div>
                                    <div className="h-1 w-1 bg-slate-300 rounded-full" />
                                    <div className="flex items-center gap-1 text-sm text-slate-500">
                                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                                        <span>Verified Performance</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quote */}
                            <p
                                className="text-slate-600 text-base border-l-4 pl-4 italic"
                                style={{ borderColor: '#f9a8d4' }}
                            >
                                {computedRows.length > 0 && topRow ? `"Exceptional achievement with ${topRow.percentLabel} target completion"` : '"No data available for this month"'}
                            </p>

                            {/* Performance Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* light pink */}
                                <div
                                    className="rounded-2xl p-4 border shadow-sm"
                                    style={{
                                        background: 'linear-gradient(135deg, #fce7f3, #fbcfe840)',
                                        borderColor: '#fbcfe8',
                                    }}
                                >
                                    <p className="text-xs text-pink-500 font-semibold mb-1">Assigned Tasks</p>
                                    <p className="text-base font-bold text-slate-800">{computedRows.length > 0 && topRow ? topRow.assign : 0}</p>
                                </div>

                                {/* light yellow */}
                                <div
                                    className="rounded-2xl p-4 border shadow-sm"
                                    style={{
                                        background: 'linear-gradient(135deg, #fefce8, #fde68a40)',
                                        borderColor: '#fde68a',
                                    }}
                                >
                                    <p className="text-xs text-amber-500 font-semibold mb-1">Achieved Tasks</p>
                                    <p className="text-base font-bold text-slate-800">{computedRows.length > 0 && topRow ? topRow.achieved : 0}</p>
                                </div>
                            </div>

                            {/* Company Info */}
                            {data?.companyName && (
                                <div className="text-xs text-slate-500">
                                    Company: <span className="font-semibold text-slate-700">{data.companyName}</span>
                                    {data?.updatedAt && (
                                        <span>
                                            {' '}• Last updated: <span className="font-semibold text-slate-700">{new Date(String(data.updatedAt)).toLocaleString()}</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column — Trophy Profile */}
                        <div className="relative flex justify-center lg:justify-end">
                            <div className="relative w-80 h-80 lg:w-96 lg:h-96">

                                {/* Pastel rainbow glow */}
                                <div
                                    className="absolute inset-0 rounded-full opacity-50 pointer-events-none"
                                    style={{
                                        background:
                                            'conic-gradient(from 0deg, #bae6fd, #fde68a, #fbcfe8, #bbf7d0, #bae6fd)',
                                        filter: 'blur(20px)',
                                    }}
                                />

                                {/* Thin conic ring */}
                                <div
                                    className="absolute inset-3 rounded-full"
                                    style={{
                                        padding: '3px',
                                        background:
                                            'conic-gradient(from 0deg, #7dd3fc, #fbbf24, #f9a8d4, #6ee7b7, #7dd3fc)',
                                    }}
                                >
                                    <div
                                        className="w-full h-full rounded-full"
                                        style={{ background: 'linear-gradient(135deg, #f0f9ff, #fef9ee)' }}
                                    />
                                </div>

                                {/* Profile Image */}
                                <div className="absolute inset-10 rounded-full overflow-hidden shadow-xl">
                                    {toAvatarUrl(topRow?.avatar) ? (
                                        <img
                                            src={toAvatarUrl(topRow?.avatar)}
                                            alt={topRow?.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center"
                                            style={{
                                                background: 'linear-gradient(135deg, #7dd3fc, #fde68a, #f9a8d4)',
                                            }}
                                        >
                                            <span className="text-white text-8xl font-black drop-shadow-lg">
                                                {(topRow?.name || 'U').trim().charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}

                                    {/* Soft bottom overlay */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            background: 'linear-gradient(to top, rgba(253,230,138,0.35) 0%, transparent 60%)',
                                        }}
                                    />

                                    {/* Champion badge */}
                                    <div className="absolute bottom-4 left-0 right-0 text-center">
                                        <span
                                            className="px-4 py-1 rounded-full text-sm font-bold border shadow-sm"
                                            style={{
                                                background: 'rgba(255,255,255,0.80)',
                                                borderColor: '#fde68a',
                                                color: '#d97706',
                                                backdropFilter: 'blur(6px)',
                                            }}
                                        >
                                            👑 CHAMPION 👑
                                        </span>
                                    </div>
                                </div>

                                {/* Pastel sparkles — fixed positions */}
                                {[
                                    { color: '#7dd3fc', top: '8%',  left: '50%' },
                                    { color: '#fbbf24', top: '20%', left: '88%' },
                                    { color: '#f9a8d4', top: '50%', left: '92%' },
                                    { color: '#6ee7b7', top: '78%', left: '80%' },
                                    { color: '#7dd3fc', top: '85%', left: '30%' },
                                    { color: '#fbbf24', top: '65%', left: '5%'  },
                                    { color: '#f9a8d4', top: '30%', left: '3%'  },
                                    { color: '#6ee7b7', top: '10%', left: '18%' },
                                ].map((s, i) => (
                                    <div
                                        key={i}
                                        className="absolute w-2 h-2 rounded-full animate-ping pointer-events-none"
                                        style={{
                                            background: s.color,
                                            top: s.top,
                                            left: s.left,
                                            animationDelay: `${i * 0.28}s`,
                                            animationDuration: `${1.6 + (i % 3) * 0.5}s`,
                                            opacity: 0.85,
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── TEAM SECTION ─── */}
            {computedRows.length > 1 && (
                <div className="relative overflow-hidden rounded-3xl shadow-xl border border-white/80 mb-10">

                    {/* ✅ SOFT PASTEL TEAM SECTION GRADIENT */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'linear-gradient(160deg, #f0f9ff 0%, #fef9c3 35%, #fce7f3 65%, #f0fdf4 100%)',
                        }}
                    />

                    {/* Dot grid */}
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)`,
                            backgroundSize: '28px 28px',
                        }}
                    />

                    {/* Corner blobs */}
                    <div
                        className="absolute -top-12 -left-12 w-48 h-48 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, #bae6fd 0%, transparent 70%)', filter: 'blur(30px)', opacity: 0.5 }}
                    />
                    <div
                        className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full pointer-events-none"
                        style={{ background: 'radial-gradient(circle, #bbf7d0 0%, transparent 70%)', filter: 'blur(30px)', opacity: 0.5 }}
                    />

                    <div className="relative">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200/70 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="p-2 rounded-lg shadow-sm"
                                    style={{ background: 'linear-gradient(135deg, #bae6fd, #bbf7d0)' }}
                                >
                                    <Users className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-700">Team Performance Dashboard</h3>
                                    <p className="text-xs text-slate-400">Real-time metrics • This month</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-xs px-3 py-1.5 rounded-full font-semibold border shadow-sm"
                                    style={{
                                        background: 'linear-gradient(135deg, #e0f4ff, #fce7f3)',
                                        borderColor: '#bae6fd',
                                        color: '#0369a1',
                                    }}
                                >
                                    {computedRows.length} Team Members
                                </span>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => void save()}
                                        disabled={saving || loading}
                                        className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-60 shadow-md"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Team Grid */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {computedRows.map((r, index) => {
                                    const cardGradients = [
                                        'linear-gradient(135deg, #e0f4ff, #fce7f3)',
                                        'linear-gradient(135deg, #fef9c3, #f0fdf4)',
                                        'linear-gradient(135deg, #fce7f3, #e0f4ff)',
                                        'linear-gradient(135deg, #f0fdf4, #fef9c3)',
                                        'linear-gradient(135deg, #fef9c3, #fce7f3)',
                                        'linear-gradient(135deg, #e0f4ff, #f0fdf4)',
                                    ];
                                    const cardBorders = ['#bae6fd', '#fde68a', '#fbcfe8', '#bbf7d0', '#fbbf24', '#7dd3fc'];
                                    const badgeGrads  = [
                                        'linear-gradient(135deg, #38bdf8, #bae6fd)',
                                        'linear-gradient(135deg, #fbbf24, #fde68a)',
                                        'linear-gradient(135deg, #f472b6, #fbcfe8)',
                                        'linear-gradient(135deg, #34d399, #bbf7d0)',
                                        'linear-gradient(135deg, #fbbf24, #fef9c3)',
                                        'linear-gradient(135deg, #38bdf8, #e0f4ff)',
                                    ];
                                    const badgeTextColors = ['#0369a1','#92400e','#be185d','#065f46','#92400e','#0369a1'];

                                    const ci = index % cardGradients.length;

                                    return (
                                        <div key={r.userId} className="group relative">
                                            <div
                                                className="rounded-2xl border p-4 hover:shadow-lg transition-all duration-300"
                                                style={{ background: cardGradients[ci], borderColor: cardBorders[ci] }}
                                            >
                                                {/* Rank badge */}
                                                <div
                                                    className="absolute -top-2.5 -right-2.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold text-white shadow-md"
                                                    style={{ background: badgeGrads[ci] }}
                                                >
                                                    <span style={{ color: badgeTextColors[ci] }}>#{index + 2}</span>
                                                </div>

                                                <div className="flex items-start gap-3">
                                                    {/* Avatar */}
                                                    <div className="relative">
                                                        <div
                                                            className="w-12 h-12 rounded-xl overflow-hidden"
                                                            style={{ border: `2px solid ${cardBorders[ci]}` }}
                                                        >
                                                            {toAvatarUrl(r?.avatar) ? (
                                                                <img
                                                                    src={toAvatarUrl(r?.avatar)}
                                                                    alt={r.name}
                                                                    className="w-full h-full object-cover"
                                                                    loading="lazy"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="w-full h-full flex items-center justify-center"
                                                                    style={{ background: cardGradients[(ci + 2) % cardGradients.length] }}
                                                                >
                                                                    <span className="font-bold text-lg text-slate-600">
                                                                        {(r.name || 'U').trim().charAt(0).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white" />
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-slate-800 text-sm mb-0.5 truncate">{r.name}</h4>
                                                        <p className="text-xs text-slate-400 mb-2 truncate">{r.email}</p>

                                                        <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
                                                            <div className="flex items-center gap-1">
                                                                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                                                                <span className="font-semibold text-slate-700">{r.percentLabel}</span>
                                                            </div>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-slate-500">{r.percent}% success</span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-1 mb-2">
                                                            <div className="text-center">
                                                                <p className="text-xs font-bold text-slate-700">{formatNumber(r.assign)}</p>
                                                                <p className="text-[10px] text-slate-400">Assign</p>
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-xs font-bold text-slate-700">{formatNumber(r.achieved)}</p>
                                                                <p className="text-[10px] text-slate-400">Achieved</p>
                                                            </div>
                                                        </div>

                                                        {/* Performance tag */}
                                                        <span
                                                            className="inline-block text-xs px-2.5 py-1 rounded-lg font-semibold border"
                                                            style={
                                                                r.percent >= 90
                                                                    ? { background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }
                                                                    : r.percent >= 70
                                                                    ? { background: '#e0f4ff', color: '#0369a1', borderColor: '#bae6fd' }
                                                                    : { background: '#fef9c3', color: '#b45309', borderColor: '#fde68a' }
                                                            }
                                                        >
                                                            {r.percent >= 90 ? 'Excellent' : r.percent >= 70 ? 'Good' : 'Needs Improvement'}
                                                        </span>

                                                        {/* Editable fields for admins */}
                                                        {canEdit && (
                                                            <div className="mt-2 space-y-1">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-slate-400 w-12">Assign:</span>
                                                                    <input
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs bg-white"
                                                                        value={String(r.assign ?? 0)}
                                                                        disabled={saving || loading}
                                                                        onChange={(e) => handleChange(r.userId, 'assign', e.target.value)}
                                                                        min={0}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-[10px] text-slate-400 w-12">Achieve:</span>
                                                                    <input
                                                                        type="number"
                                                                        inputMode="numeric"
                                                                        className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs bg-white"
                                                                        value={String(r.achieved ?? 0)}
                                                                        disabled={saving || loading}
                                                                        onChange={(e) => handleChange(r.userId, 'achieved', e.target.value)}
                                                                        min={0}
                                                                        max={r.assign ?? 0}
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerMonthlyRankingPage;
