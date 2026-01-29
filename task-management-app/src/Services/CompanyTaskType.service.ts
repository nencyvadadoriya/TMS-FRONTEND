import apiClient from './apiClient';

export type CompanyTaskTypeTaskType = {
  id: string;
  _id?: string;
  name: string;
};

export type CompanyTaskTypesResponse = {
  id?: string;
  companyName: string;
  taskTypes: CompanyTaskTypeTaskType[];
};

export type AllCompanyTaskTypesResponse = CompanyTaskTypesResponse[];

export const companyTaskTypeService = {
  async getAllCompanyTaskTypes(): Promise<{ success: boolean; data: AllCompanyTaskTypesResponse }> {
    const response = await apiClient.get('/company-task-types/all');
    return response.data;
  },

  async getCompanyTaskTypes(params: {
    companyName: string;
  }): Promise<{ success: boolean; data: CompanyTaskTypesResponse }> {
    const response = await apiClient.get('/company-task-types', { params });
    return response.data;
  },

  async upsertCompanyTaskTypes(payload: {
    companyName: string;
    taskTypeIds?: string[];
    taskTypeNames?: string[];
  }): Promise<{ success: boolean; data: CompanyTaskTypesResponse }> {
    const response = await apiClient.post('/company-task-types', payload);
    return response.data;
  }
};
