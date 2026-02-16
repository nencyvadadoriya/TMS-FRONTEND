import apiClient from "./apiClient";

const isDev = Boolean(import.meta.env.DEV);

const describeAxiosError = (err: any) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    const code = err?.code;
    const message = err?.message;
    const method = err?.config?.method;
    const baseURL = err?.config?.baseURL;
    const url = err?.config?.url;

    const fullUrl =
        baseURL && url
            ? `${String(baseURL).replace(/\/$/, '')}/${String(url).replace(/^\//, '')}`
            : (baseURL || url);

    return { status, data, code, message, method, url: fullUrl };
};

class StrikeService {
    baseUrl = "/strike/";

    async getMdImpexStrike() {
        try {
            const res = await apiClient.get(`${this.baseUrl}md-impex`);
            return {
                success: Boolean(res.data.success),
                data: res.data.data || [],
                message: res.data.message || res.data.msg || 'Strike fetched successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Get Strike Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: [],
                message: backendMessage || backendError || err.message || 'Failed to fetch strike'
            };
        }
    }

    async removeStrike(strikeId: string, remark: string) {
        try {
            const res = await apiClient.patch(`${this.baseUrl}${strikeId}/remove`, { remark });
            return {
                success: Boolean(res.data.success),
                data: res.data.data || null,
                message: res.data.message || res.data.msg || 'Strike removed successfully'
            };
        } catch (err: any) {
            if (isDev) console.error('❌ Remove Strike Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || 'Failed to remove strike'
            };
        }
    }
}

export const strikeService = new StrikeService();
