import apiClient from './apiClient';

export type ManagerMonthlyRankingRow = {
    userId: string;
    name: string;
    email: string;
    role?: string;
    position?: string;
    avatar?: string;
    assign: number;
    achieved: number;
    percent: number;
    percentLabel?: string;
};

export type ManagerMonthlyRankingResponse = {
    companyName: string;
    monthKey: string;
    rows: ManagerMonthlyRankingRow[];
    totals?: {
        assign: number;
        achieved: number;
        percent: number;
        percentLabel?: string;
    };
    updatedAt?: string | null;
    updatedBy?: string;
};

class ManagerMonthlyRankingService {
    baseUrl = '/manager-monthly-rankings';

    async getMonthlyRanking(monthKey?: string) {
        try {
            const res = await apiClient.get(this.baseUrl, {
                params: monthKey ? { month: monthKey } : undefined
            });
            return {
                success: Boolean(res.data?.success),
                data: (res.data?.data || null) as ManagerMonthlyRankingResponse | null,
                message: res.data?.message || res.data?.msg || ''
            };
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.response?.data?.msg || error?.message || 'Failed to fetch monthly ranking';
            return { success: false, data: null, message };
        }
    }

    async saveMonthlyRanking(payload: { monthKey: string; rows: Array<{ userId: string; assign: number; achieved: number }> }) {
        try {
            const res = await apiClient.put(this.baseUrl, payload);
            return {
                success: Boolean(res.data?.success),
                data: res.data?.data || null,
                message: res.data?.message || res.data?.msg || 'Saved'
            };
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.response?.data?.msg || error?.message || 'Failed to save monthly ranking';
            return { success: false, data: null, message };
        }
    }
}

export const managerMonthlyRankingService = new ManagerMonthlyRankingService();
