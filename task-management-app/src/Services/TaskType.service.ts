import apiClient from './apiClient';

export type TaskTypeItem = {
  id: string;
  _id?: string;
  companyId?: string | null;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const taskTypeService = {
  async getTaskTypes(params?: { companyName?: string; companyId?: string }): Promise<{ success: boolean; data: TaskTypeItem[] }> {
    const query: any = {};
    const companyName = (params?.companyName || '').toString().trim();
    const companyId = (params?.companyId || '').toString().trim();
    if (companyName) query.companyName = companyName;
    if (companyId) query.companyId = companyId;

    const response = await apiClient.get('/task-types', { params: query });
    return response.data;
  },

  async createTaskType(payload: { name: string; companyName?: string; companyId?: string }): Promise<{ success: boolean; data: TaskTypeItem }> {
    const response = await apiClient.post('/task-types', payload);
    return response.data;
  },

  async bulkUpsertTaskTypes(payload: { types: Array<{ name: string; clientId?: string } | string>; companyName?: string; companyId?: string }): Promise<{ success: boolean; data: TaskTypeItem[] }> {
    const response = await apiClient.post('/task-types/bulk', payload);
    return response.data;
  },

  async deleteTaskType(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/task-types/${id}`);
    return response.data;
  },
};
