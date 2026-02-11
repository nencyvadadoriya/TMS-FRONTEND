import apiClient from './apiClient';

export type CompanyBrandTaskTypeTaskType = {
  id: string;
  _id?: string;
  name: string;
};

export type CompanyBrandTaskTypeMapping = {
  id: string;
  companyName: string;
  brandId: string;
  brandName: string;
  taskTypes: CompanyBrandTaskTypeTaskType[];
};

export type CompanyTaskTypesResponse = {
  companyName: string;
  taskTypes: CompanyBrandTaskTypeTaskType[];
};

export const companyBrandTaskTypeService = {
  async getMapping(params: {
    companyName: string;
    brandId?: string;
    brandName?: string;
  }): Promise<{ success: boolean; data: CompanyBrandTaskTypeMapping | null }> {
    const response = await apiClient.get('/company-brand-task-types', { params });
    return response.data;
  },

  async getCompanyTaskTypes(params: {
    companyName: string;
  }): Promise<{ success: boolean; data: CompanyTaskTypesResponse }> {
    const response = await apiClient.get('/company-brand-task-types/company-task-types', { params });
    return response.data;
  },

  async upsertMapping(payload: {
    companyName: string;
    brandId: string;
    brandName: string;
    taskTypeIds: string[];
  }): Promise<{ success: boolean; data: CompanyBrandTaskTypeMapping }> {
    const response = await apiClient.post('/company-brand-task-types', payload);
    return response.data;
  }
};
