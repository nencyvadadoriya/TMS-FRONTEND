// TaskService.ts

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

const normalizeTask = (task: any) => {
    if (!task) return task;

    const id = task._id || task.id;
    const companyName = (task.companyName || task.company || '').toString();
    const taskType = (task.taskType || task.type || '').toString();

    const brand = (typeof task.brand === 'string'
        ? task.brand
        : (task.brand?.name || '')
    ).toString();

    return {
        ...task,
        id,
        companyName,
        taskType,
        brand,
    };
};

class TaskService {
    baseUrl = "/task/";
    authAddTask = "addTask";
    authGetAllTask = "getAllTasks";
    authUpdateTask = "updateTask";
    authDeletedTask = "deleteTask";

    private buildCommentsUrl(taskId: string, commentId?: string) {
        let url = `${this.baseUrl}${taskId}/comments`;
        if (commentId) {
            url += `/${commentId}`;
        }
        return url;
    }

    private buildHistoryUrl(taskId: string) {
        return `${this.baseUrl}${taskId}/history`;
    }

    async addTask(payload: any) {
        try {
            if (isDev) console.log('📤 Sending task to API:', payload);

            const res = await apiClient.post(this.baseUrl + this.authAddTask, payload);

            if (isDev) console.log('📥 API Response:', res.data);

            const task = res.data.data;
            return {
                success: Boolean(res.data.success),
                data: task ? normalizeTask(task) : null,
                message: res.data.message || res.data.msg || 'Task created successfully'
            };
        } catch (err: any) {
            console.error("❌ Add Task Error:", describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || "Failed to add task"
            };
        }
    }

    async getAllTasks() {
        try {
            const res = await apiClient.get(this.baseUrl + this.authGetAllTask);

            const tasks = (res.data.data || []).map((task: any) => normalizeTask(task));

            return {
                success: Boolean(res.data.success),
                data: tasks,
                message: res.data.message || res.data.msg || 'Tasks fetched successfully'
            };
        } catch (err: any) {
            console.error("❌ Get Tasks Error:", describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: [],
                message: backendMessage || backendError || err.message || "Failed to fetch tasks"
            };
        }
    }

    async updateTask(id: string, payload: any) {
        try {
            if (isDev) console.log('📝 Updating task:', id, payload);

            const res = await apiClient.put(this.baseUrl + this.authUpdateTask + `/${id}`, payload);

            if (isDev) console.log('✅ Update response:', res.data);

            const task = res.data.data;
            return {
                success: Boolean(res.data.success),
                data: task ? normalizeTask(task) : null,
                message: res.data.message || res.data.msg || 'Task updated successfully'
            };
        } catch (err: any) {
            const described = describeAxiosError(err);
            if (isDev) {
                try {
                    console.error('❌ Update Task Error:', {
                        ...described,
                        dataString: typeof described?.data === 'string' ? described.data : JSON.stringify(described?.data ?? null),
                    });
                } catch {
                    console.error('❌ Update Task Error:', described);
                }
            } else {
                console.error('❌ Update Task Error:', described);
            }

            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            const backendDetails = (() => {
                const d = err.response?.data;
                if (!d) return '';
                if (typeof d === 'string') return d;
                try {
                    return JSON.stringify(d);
                } catch {
                    return '';
                }
            })();
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || backendDetails || err.message || "Failed to update task"
            };
        }
    }

    async mdImpexReassignTask(id: string, assignedTo: string) {
        try {
            if (isDev) console.log('📝 MD Impex reassign task:', id, assignedTo);

            const res = await apiClient.put(`${this.baseUrl}md-impex/reassign/${id}`, { assignedTo });

            const task = res.data.data;
            return {
                success: Boolean(res.data.success),
                data: task ? normalizeTask(task) : null,
                message: res.data.message || res.data.msg || 'Task reassigned successfully'
            };
        } catch (err: any) {
            console.error("❌ MD Impex Reassign Error:", describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || 'Failed to reassign task'
            };
        }
    }

    async deleteTask(id: string) {
        try {
            if (isDev) console.log('Sending DELETE request for task ID:', id);

            const res = await apiClient.delete(this.baseUrl + this.authDeletedTask + `/${id}`);

            if (isDev) console.log(' DELETE Response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || res.data.msg || 'Task deleted successfully'
            };
        } catch (err: any) {
            console.error("❌ Delete Task Error:", describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                message: backendMessage || backendError || err.message || "Failed to delete task"
            };
        }
    }

    async createTask(payload: any) {
        return this.addTask(payload);
    }

    async addComment(taskId: string, content: string) {
        try {
            if (isDev) console.log('💾 Adding comment for task:', taskId, content);

            const payload = {
                content: content
                // User info backend में token से automatic add होगी
            };

            const res = await apiClient.post(this.buildCommentsUrl(taskId), payload);

            if (isDev) console.log('✅ Comment add response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || res.data.msg || 'Comment added successfully'
            };
        } catch (error: any) {
            console.error('❌ Error adding comment:', error.response?.data || error.message);
            return {
                success: false,
                data: null,
                message: error.response?.data?.msg || error.response?.data?.message || 'Failed to add comment'
            };
        }
    }

    async fetchComments(taskId: string) {
        try {
            const res = await apiClient.get(this.buildCommentsUrl(taskId));

            if (isDev) console.log('✅ Comments fetch response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: res.data.data || [],
                message: res.data.message || res.data.msg || 'Comments fetched successfully'
            };
        } catch (error: any) {
            console.error('❌ Error fetching comments:', error.response?.data || error.message);
            return {
                success: false,
                data: [],
                message: error.response?.data?.msg || error.response?.data?.message || 'Failed to fetch comments'
            };
        }
    }

    async deleteComment(taskId: string, commentId: string) {
        try {
            if (isDev) console.log('🗑️ Deleting comment:', commentId, 'for task:', taskId);

            const res = await apiClient.delete(this.buildCommentsUrl(taskId, commentId));

            if (isDev) console.log('✅ Comment delete response:', res.data);

            return {
                success: Boolean(res.data.success),
                message: res.data.message || res.data.msg || 'Comment deleted successfully'
            };
        } catch (error: any) {
            console.error('❌ Error deleting comment:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.msg || error.response?.data?.message || 'Failed to delete comment'
            };
        }
    }

    async getTaskHistory(taskId: string) {
        try {
            if (isDev) console.log('📜 Fetching history for task:', taskId);
            const res = await apiClient.get(this.buildHistoryUrl(taskId));

            const entries = (res.data.data || []).map((entry: any) => ({
                ...entry,
                id: entry.id || entry._id,
                timestamp: entry.timestamp || entry.createdAt || new Date().toISOString()
            }));

            if (isDev) console.log('✅ History fetch response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: entries,
                message: res.data.message || res.data.msg || 'History fetched successfully'
            };
        } catch (error: any) {
            console.error('❌ Error fetching history:', error);
            return {
                success: false,
                data: [],
                message: error.response?.data?.msg || error.response?.data?.message || 'Failed to fetch history'
            };
        }
    }

    async addTaskHistory(taskId: string, payload: any) {
        try {
            if (isDev) console.log(' Adding history for task:', taskId);
            const res = await apiClient.post(this.buildHistoryUrl(taskId), payload);

            if (isDev) console.log('✅ History add response:', res.data);

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || res.data.msg || 'History added successfully'
            };
        } catch (error: any) {
            console.error(' Error adding history:', error);
            return {
                success: false,
                data: null,
                message: error.response?.data?.msg || error.response?.data?.message || 'Failed to add history'
            };
        }
    }

    async syncTaskToGoogle(taskId: string) {
        try {
            const res = await apiClient.post(`${this.baseUrl}${taskId}/sync-google`, {});
            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || res.data.msg || 'Synced to Google Tasks successfully'
            };
        } catch (error: any) {
            const backendMessage = error.response?.data?.message || error.response?.data?.msg;
            const backendError = error.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || error.message || 'Failed to sync task to Google Tasks'
            };
        }
    }

    async inviteToTask(taskId: string, email: string, role: string) {
        try {
            const res = await apiClient.post(`${this.baseUrl}${taskId}/invite`, { email, role });

            return {
                success: Boolean(res.data.success),
                data: res.data.data,
                message: res.data.message || 'User invited successfully'
            };
        } catch (error: any) {
            console.error('Error inviting to task:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to invite user'
            };
        }
    }

    async getTaskReviews(params?: { status?: string; reviewed?: boolean }) {
        try {
            const search = new URLSearchParams();
            if (params?.status) search.set('status', String(params.status));
            if (typeof params?.reviewed === 'boolean') search.set('reviewed', String(params.reviewed));

            const qs = search.toString();
            const url = `${this.baseUrl}reviews${qs ? `?${qs}` : ''}`;
            const res = await apiClient.get(url);

            const tasks = (res.data.data || []).map((task: any) => normalizeTask(task));

            return {
                success: Boolean(res.data.success),
                data: tasks,
                message: res.data.message || res.data.msg || 'Reviews fetched successfully'
            };
        } catch (err: any) {
            console.error('❌ Get Reviews Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: [],
                message: backendMessage || backendError || err.message || 'Failed to fetch reviews'
            };
        }
    }

    async getAssignedByMeTasks() {
        try {
            const res = await apiClient.get(`${this.baseUrl}assigned-by-me`);
            const tasks = (res.data.data || []).map((task: any) => normalizeTask(task));
            return { success: true, data: tasks };
        } catch (error: any) {
            return { success: false, message: error?.response?.data?.message || 'Failed to fetch tasks' };
        }
    }

    async getAssignedToMeTasks() {
        try {
            const res = await apiClient.get(`${this.baseUrl}assigned-to-me`);
            const tasks = (res.data.data || []).map((task: any) => normalizeTask(task));
            return { success: true, data: tasks };
        } catch (error: any) {
            return { success: false, message: error?.response?.data?.message || 'Failed to fetch tasks' };
        }
    }

    async submitTaskReview(taskId: string, payload: { reviewStars: number; reviewComment?: string }) {
        try {
            const res = await apiClient.post(`${this.baseUrl}${taskId}/review`, payload);
            const task = res.data.data;
            return {
                success: Boolean(res.data.success),
                data: task ? normalizeTask(task) : null,
                message: res.data.message || res.data.msg || 'Review saved successfully'
            };
        } catch (err: any) {
            console.error('❌ Submit Review Error:', describeAxiosError(err));
            const backendMessage = err.response?.data?.message || err.response?.data?.msg;
            const backendError = err.response?.data?.error;
            return {
                success: false,
                data: null,
                message: backendMessage || backendError || err.message || 'Failed to save review'
            };
        }
    }
}

export const taskService = new TaskService();