
export const stripDeletedEmailSuffix = (value: unknown): string => {
    const raw = (value == null ? '' : String(value)).trim();
    if (!raw) return '';
    const marker = '.deleted.';
    const idx = raw.indexOf(marker);
    if (idx === -1) return raw;
    return raw.slice(0, idx).trim();
};

export const performanceLevelForAvg = (avgStars: number) => {
    const v = Number(avgStars);
    if (!Number.isFinite(v)) return '—';
    if (v >= 4.5) return 'Excellent';
    if (v >= 4.0) return 'Very Good';
    if (v >= 3.0) return 'Good';
    return 'Improve';
};

export const pad2 = (n: number) => String(n).padStart(2, '0');

export const monthKeyOfDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

export const normalizeEmailForMatch = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim().toLowerCase();
    if (typeof v === 'object' && v !== null) {
        const candidate = (v as any).email || (v as any).name || '';
        return String(candidate || '').trim().toLowerCase();
    }
    return '';
};

export const isOverdueFn = (dueDate: string, status: string): boolean => {
    const statusKey = String(status || '').trim().toLowerCase();
    if (statusKey === 'completed') return false;
    try {
        const due = new Date(dueDate);
        if (Number.isNaN(due.getTime())) return false;
        const dueEndOfDay = new Date(
            due.getFullYear(),
            due.getMonth(),
            due.getDate(),
            23,
            59,
            59,
            999
        );
        return Date.now() > dueEndOfDay.getTime();
    } catch {
        return false;
    }
};
