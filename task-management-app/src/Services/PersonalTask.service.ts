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
      ? `${String(baseURL).replace(/\/$/, "")}/${String(url).replace(/^\//, "")}`
      : (baseURL || url);

  return { status, data, code, message, method, url: fullUrl };
};

export type PersonalTaskPriority = 'high' | 'medium' | 'low';
export type PersonalTaskReminderStyle = 'none' | 'once' | 'daily' | 'weekly';
export type PersonalTaskStatus = 'pending' | 'in-progress' | 'completed';

export interface PersonalTask {
  id: string;
  title: string;
  status?: PersonalTaskStatus;
  purpose?: string;
  priority: PersonalTaskPriority;
  reminderStyle: PersonalTaskReminderStyle;
  reminderAt?: string | null;
  companyName?: string;
  creatorEmail: string;
  createdAt: string;
  updatedAt: string;
}

class PersonalTaskService {
  baseUrl = '/personal-tasks';

  async create(payload: {
    title: string;
    status?: PersonalTaskStatus;
    purpose?: string;
    priority?: PersonalTaskPriority;
    reminderStyle?: PersonalTaskReminderStyle;
    reminderAt?: string | null;
    companyName?: string;
  }) {
    try {
      if (isDev) console.log('📤 Creating personal task:', payload);
      const res = await apiClient.post(this.baseUrl, payload);
      const data = res.data?.data;
      return {
        success: Boolean(res.data?.success),
        data: data ? { ...data, id: data.id || data._id } : null,
        message: res.data?.message || 'Personal task created'
      };
    } catch (err: any) {
      console.error('❌ Create PersonalTask Error:', describeAxiosError(err));
      const backendMessage = err.response?.data?.message || err.response?.data?.msg;
      const backendError = err.response?.data?.error;
      return {
        success: false,
        data: null,
        message: backendMessage || backendError || err.message || 'Failed to create personal task'
      };
    }
  }

  async mine(params?: { limit?: number }) {
    try {
      const search = new URLSearchParams();
      if (params?.limit) search.set('limit', String(params.limit));
      const qs = search.toString();
      const url = `${this.baseUrl}/mine${qs ? `?${qs}` : ''}`;

      const res = await apiClient.get(url);
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      return {
        success: Boolean(res.data?.success),
        data: list.map((t: any) => ({ ...t, id: t.id || t._id })),
        message: res.data?.message || 'Personal tasks fetched'
      };
    } catch (err: any) {
      console.error('❌ Get My PersonalTasks Error:', describeAxiosError(err));
      const backendMessage = err.response?.data?.message || err.response?.data?.msg;
      const backendError = err.response?.data?.error;
      return {
        success: false,
        data: [],
        message: backendMessage || backendError || err.message || 'Failed to fetch personal tasks'
      };
    }
  }

  async update(id: string, payload: Partial<{
    title: string;
    status: PersonalTaskStatus;
    purpose: string;
    priority: PersonalTaskPriority;
    reminderStyle: PersonalTaskReminderStyle;
    reminderAt: string | null;
  }>) {
    try {
      const url = `${this.baseUrl}/${id}`;
      const res = await apiClient.patch(url, payload);
      const data = res.data?.data;
      return {
        success: Boolean(res.data?.success),
        data: data ? { ...data, id: data.id || data._id } : null,
        message: res.data?.message || 'Personal task updated'
      };
    } catch (err: any) {
      console.error('❌ Update PersonalTask Error:', describeAxiosError(err));
      const backendMessage = err.response?.data?.message || err.response?.data?.msg;
      const backendError = err.response?.data?.error;
      return {
        success: false,
        data: null,
        message: backendMessage || backendError || err.message || 'Failed to update personal task'
      };
    }
  }

  async delete(id: string) {
    try {
      const url = `${this.baseUrl}/${id}`;
      const res = await apiClient.delete(url);
      return {
        success: Boolean(res.data?.success),
        data: res.data?.data || { id },
        message: res.data?.message || 'Personal task deleted'
      };
    } catch (err: any) {
      console.error('❌ Delete PersonalTask Error:', describeAxiosError(err));
      const backendMessage = err.response?.data?.message || err.response?.data?.msg;
      const backendError = err.response?.data?.error;
      return {
        success: false,
        data: null,
        message: backendMessage || backendError || err.message || 'Failed to delete personal task'
      };
    }
  }
}

export const personalTaskService = new PersonalTaskService();
