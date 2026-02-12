// services/Brand.services.ts
import apiClient from './apiClient';
import type { AxiosRequestConfig } from 'axios';
import type { Brand, CreateBrandDto, UpdateBrandDto } from '../Types/Types';

export const brandService = {
    // Get all brands with optional filtering
    async getBrands(params?: {
        search?: string;
        status?: string;
        company?: string;
        includeDeleted?: boolean; // New parameter
        page?: number;
        limit?: number;
    }): Promise<{ success: boolean; data: Brand[]; total: number }> {
        const response = await apiClient.get('/brands', { params });
        return response.data;
    },

    // Get brands for task creation dropdown (assigned brands for non-admin; all for admin)
    async getAssignedBrands(params?: { page?: number; limit?: number }): Promise<{ success: boolean; data: Brand[]; total: number }> {
        const response = await apiClient.get('/brands/assigned', { params });
        return response.data;
    },

    async getBrandHistoryFeed(params?: {
        includeDeleted?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{ success: boolean; data: any[]; total: number; page: number; limit: number }> {
        const response = await apiClient.get('/brands/history', { params });
        return response.data;
    },

    // Get only active brands (default behavior)
    async getActiveBrands(params?: {
        search?: string;
        status?: string;
        company?: string;
    }): Promise<{ success: boolean; data: Brand[]; total: number }> {
        const response = await apiClient.get('/brands', { 
            params: { ...params, status: 'active' }
        });
        return response.data;
    },

    // Get only deleted brands (for admin)
    async getDeletedBrands(): Promise<{ success: boolean; data: Brand[]; total: number }> {
        const response = await apiClient.get('/brands/admin/deleted');
        return response.data;
    },

    // Get single brand by ID
    async getBrandById(id: string): Promise<{ success: boolean; data: Brand }> {
        const response = await apiClient.get(`/brands/${id}`);
        return response.data;
    },

    // Create new brand
    async createBrand(brandData: CreateBrandDto): Promise<{ success: boolean; data: Brand }> {
        const response = await apiClient.post('/brands', brandData);
        return response.data;
    },

    async bulkUpsertBrands(
        payload: { brands: Array<CreateBrandDto & { clientId?: string }> },
        config?: AxiosRequestConfig
    ): Promise<{ success: boolean; data: Brand[] }> {
        const response = await apiClient.post('/brands/bulk', payload, config);
        return response.data;
    },

    // Update existing brand
    async updateBrand(id: string, brandData: UpdateBrandDto): Promise<{ success: boolean; data: Brand }> {
        const response = await apiClient.put(`/brands/${id}`, brandData);
        return response.data;
    },

    // Delete brand (soft delete)
    async deleteBrand(id: string, reason?: string): Promise<{ success: boolean; message?: string; data?: Brand }> {
        const response = await apiClient.delete(`/brands/${id}`, {
            data: {
                softDelete: true,
                reason: typeof reason === 'string' ? reason : ''
            }
        });
        return response.data;
    },

    // Restore deleted brand
    async restoreBrand(id: string): Promise<{ success: boolean; data: Brand }> {
        const response = await apiClient.put(`/brands/${id}/restore`);
        return response.data;
    },

    // Permanent delete (hard delete) - use with caution
    async permanentDeleteBrand(id: string): Promise<{ success: boolean; message?: string }> {
        const response = await apiClient.delete(`/brands/${id}/permanent`);
        return response.data;
    },

    // Update brand status (alternative to soft delete)
    async updateBrandStatus(id: string, status: 'active' | 'inactive' | 'archived' | 'deleted'): Promise<{ success: boolean; data: Brand }> {
        const response = await apiClient.patch(`/brands/${id}/status`, { status });
        return response.data;
    }
};