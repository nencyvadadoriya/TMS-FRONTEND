import apiClient from './apiClient';

export type PermissionValue = 'allow' | 'deny' | 'own' | 'team';

export type RoleDto = {
    _id?: string;
    key: string;
    name: string;
};

export type AccessModuleDto = {
    _id?: string;
    moduleId: string;
    name: string;
    defaults: {
        admin: PermissionValue;
        manager: PermissionValue;
        assistant: PermissionValue;
    };
};

class AccessService {
    base = '/access';

    async getModules() {
        const res = await apiClient.get(`${this.base}/modules`);
        return res.data;
    }

    async getRoles() {
        const res = await apiClient.get(`${this.base}/roles`);
        return res.data;
    }

    async createRole(payload: { key: string; name: string }) {
        const res = await apiClient.post(`${this.base}/roles`, payload);
        return res.data;
    }

    async updateRole(key: string, payload: { name: string }) {
        const res = await apiClient.put(`${this.base}/roles/${encodeURIComponent(key)}`, payload);
        return res.data;
    }

    async deleteRole(key: string) {
        const res = await apiClient.delete(`${this.base}/roles/${encodeURIComponent(key)}`);
        return res.data;
    }

    async createModule(payload: { moduleId: string; name: string; defaults?: AccessModuleDto['defaults'] }) {
        const res = await apiClient.post(`${this.base}/modules`, payload);
        return res.data;
    }

    async updateModule(moduleId: string, payload: { name?: string; defaults?: AccessModuleDto['defaults'] }) {
        const res = await apiClient.put(`${this.base}/modules/${moduleId}`, payload);
        return res.data;
    }

    async deleteModule(moduleId: string) {
        const res = await apiClient.delete(`${this.base}/modules/${moduleId}`);
        return res.data;
    }

    async getUserPermissions(userId: string) {
        const res = await apiClient.get(`${this.base}/users/${userId}/permissions`);
        return res.data;
    }

    async setUserPermission(userId: string, moduleId: string, value: PermissionValue) {
        const res = await apiClient.put(`${this.base}/users/${userId}/permissions/${moduleId}`, { value });
        return res.data;
    }

    async applyTemplate(userId: string, templateRole: string, options?: { overwrite?: boolean }) {
        const overwrite = Boolean(options?.overwrite);
        const res = await apiClient.post(`${this.base}/users/${userId}/apply-template`, { templateRole, overwrite });
        return res.data;
    }
}

export const accessService = new AccessService();
