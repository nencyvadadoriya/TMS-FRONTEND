import apiClient from './apiClient';

export type PowerStarMonthlyRow = {
    userId: string;
    name: string;
    email: string;
    role?: string;
    position?: string;
    avatar?: string;
    churn: number[]; // [w1,w2,w3,w4]
    liveAssign: number[]; // [w1,w2,w3,w4]
    hits: number[]; // [w1,w2,w3,w4]
    freeze?: boolean; // MD Manager can freeze a person from top ranking
};

export type PowerStarMonthlyResponse = {
    companyName: string;
    monthKey: string;
    rows: PowerStarMonthlyRow[];
    updatedAt?: string | null;
    updatedBy?: string;
};

const normalizeWeekArray = (v: unknown): number[] => {
    const arr = Array.isArray(v) ? v : [];
    const out = [0, 0, 0, 0].map((_, idx) => {
        const n = Number((arr as any)[idx]);
        if (!Number.isFinite(n)) return 0;
        return Math.max(0, n);
    });
    return out;
};

class PowerStarMonthlyService {
    baseUrl = '/power-star-monthly';

    async getMonthly(monthKey?: string) {
        try {
            const res = await apiClient.get(this.baseUrl, {
                params: monthKey ? { month: monthKey } : undefined
            });
            const data = (res.data?.data || null) as PowerStarMonthlyResponse | null;
            if (data?.rows) {
                data.rows = data.rows.map((r) => ({
                    ...r,
                    churn: normalizeWeekArray((r as any).churn),
                    liveAssign: normalizeWeekArray((r as any).liveAssign),
                    hits: normalizeWeekArray((r as any).hits),
                    freeze: Boolean((r as any).freeze)
                }));
            }
            return {
                success: Boolean(res.data?.success),
                data,
                message: res.data?.message || res.data?.msg || ''
            };
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.response?.data?.msg || error?.message || 'Failed to fetch power star monthly';
            return { success: false, data: null, message };
        }
    }

    async saveMonthly(payload: { monthKey: string; rows: Array<{ userId: string; churn: number[]; liveAssign: number[]; hits: number[]; freeze?: boolean }> }) {
        try {
            const res = await apiClient.put(this.baseUrl, payload);
            return {
                success: Boolean(res.data?.success),
                data: res.data?.data || null,
                message: res.data?.message || res.data?.msg || 'Saved'
            };
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.response?.data?.msg || error?.message || 'Failed to save power star monthly';
            return { success: false, data: null, message };
        }
    }
}

export const powerStarMonthlyService = new PowerStarMonthlyService();
