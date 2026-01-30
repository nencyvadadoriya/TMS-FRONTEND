import apiClient from './apiClient';

export type AssignUserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  companyName: string;
};

export type UserBrandTaskTypeMapping = {
  id: string;
  companyName: string;
  userId: string;
  brandId: string;
  brandName: string;
  taskTypeIds: string[];
  taskTypes?: Array<{ id: string; name: string }>;
};

export type CompanyBrandTaskTypeMappingRow = {
  id: string;
  companyName: string;
  userId: string;
  brandId: string;
  brandName: string;
  taskTypeIds: string[];
};

export type MdManagerCompanyAssignResult = {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: string;
  assignedCompanyIds: string[];
};

export type ObManagerCompanyAssignResult = MdManagerCompanyAssignResult;
export type SbmCompanyAssignResult = MdManagerCompanyAssignResult;

export const assignService = {
  async getCompanyUsers(params: { companyName: string }): Promise<{ success: boolean; data: AssignUserItem[] }> {
    const response = await apiClient.get('/assign/users', { params });
    return response.data;
  },

  async assignCompaniesToMdManager(payload: { mdManagerId: string; companyIds: string[] }): Promise<{ success: boolean; data: MdManagerCompanyAssignResult; message?: string }> {
    const response = await apiClient.post('/assign/md-manager-companies', payload);
    return response.data;
  },

  async assignCompaniesToObManager(payload: { obManagerId: string; companyIds: string[] }): Promise<{ success: boolean; data: ObManagerCompanyAssignResult; message?: string }> {
    const response = await apiClient.post('/assign/ob-manager-companies', payload);
    return response.data;
  },

  async assignCompaniesToSbm(payload: { sbmId: string; companyIds: string[] }): Promise<{ success: boolean; data: SbmCompanyAssignResult; message?: string }> {
    const response = await apiClient.post('/assign/sbm-companies', payload);
    return response.data;
  },

  async getUserMappings(params: { companyName: string; userId: string }): Promise<{ success: boolean; data: UserBrandTaskTypeMapping[] }> {
    const response = await apiClient.get('/assign/mappings', { params });
    return response.data;
  },

  async getCompanyMappings(params: { companyName: string }): Promise<{ success: boolean; data: CompanyBrandTaskTypeMappingRow[] }> {
    const response = await apiClient.get('/assign/company-mappings', { params });
    return response.data;
  },

  async upsertUserMapping(payload: {
    companyName: string;
    userId: string;
    brandId: string;
    brandName: string;
    taskTypeIds: string[];
  }): Promise<{ success: boolean; data: UserBrandTaskTypeMapping }> {
    const response = await apiClient.post('/assign/mappings', payload);
    return response.data;
  },

  async bulkUpsertUserMappings(payload: {
    companyName: string;
    userId: string;
    mappings: Array<{
      brandId: string;
      brandName: string;
      taskTypeIds: string[];
    }>;
  }): Promise<{ success: boolean; data: { matchedCount?: number; modifiedCount?: number; upsertedCount?: number } }> {
    const response = await apiClient.post('/assign/mappings/bulk', payload);
    return response.data;
  }
};
