import apiClient from './apiClient';

export interface Headline {
  _id: string;
  text: string;
  type: 'holiday' | 'festival' | 'meeting' | 'update' | 'other';
  active: boolean;
  expiresAt?: string;
  bgColor?: string;
  textColor?: string;
  createdBy: any;
  createdAt: string;
  updatedAt: string;
}

export const headlineService = {
  getActiveHeadline: async () => {
    try {
      const response = await apiClient.get('/headline/active');
      return response.data;
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  createHeadline: async (data: { 
    text: string; 
    type?: string; 
    expiresAt?: string; 
    bgColor?: string; 
    textColor?: string; 
  }) => {
    try {
      const response = await apiClient.post('/headline/create', data);
      return response.data;
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  deactivateHeadline: async () => {
    try {
      const response = await apiClient.post('/headline/deactivate', {});
      return response.data;
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }
};
