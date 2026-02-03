import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X as XIcon, Pencil, Trash2, Shield, UserPlus, Users, ChevronRight, Filter, Search, RefreshCw, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserType } from '../Types/Types';
import { accessService } from '../Services/Access.Services';

type PermissionValue = 'allow' | 'deny';

type AccessRow = {
    id: string;
    module: string;
    admin: PermissionValue;
    manager: PermissionValue;
    assistant: PermissionValue;
};

type UserAccess = {
    userId: string;
    moduleId: string;
    value: PermissionValue;
};

type RoleItem = {
    key: string;
    name: string;
};

const normalizeRole = (role: unknown) => (role || '').toString().trim().toLowerCase();

const randomId = () => {
    return `access_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

const permissionLabel: Record<PermissionValue, string> = {
    allow: 'Yes',
    deny: 'No',
};

const normalizePermission = (value: unknown): PermissionValue => {
    const v = String(value ?? '').trim().toLowerCase();
    if (v === 'allow' || v === 'deny') {
        return v;
    }
    if (v === 'own') return 'deny';
    if (v === 'team') return 'deny';
    return 'deny';
};

const PermissionChoice: React.FC<{
    value: PermissionValue;
    selected: PermissionValue;
    onSelect: (next: PermissionValue) => void;
    disabled?: boolean;
}> = ({ value, selected, onSelect, disabled }) => {
    const isSelected = selected === value;

    const getButtonStyles = () => {
        const base = 'inline-flex items-center justify-center px-3 py-2 rounded-lg border text-sm font-medium  ';

        if (disabled) {
            return `${base} opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200`;
        }

        if (isSelected) {
            const colorMap: Record<PermissionValue, string> = {
                allow: 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm shadow-emerald-100',
                deny: 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm shadow-rose-100',
            };
            return `${base} ${colorMap[value]}`;
        }

        return `${base} bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm`;
    };

    return (
        <button
            type="button"
            onClick={() => {
                if (disabled) return;
                onSelect(value);
            }}
            disabled={disabled}
            className={getButtonStyles()}
        >
            <span className={`mr-2 inline-flex items-center justify-center h-4 w-4 rounded border transition-colors ${
                isSelected
                    ? value === 'allow' ? 'border-emerald-400 bg-emerald-200' :
                        'border-rose-400 bg-rose-200'
                    : 'border-gray-300 bg-white'
                }`}
            >
                {isSelected ? (
                    <Check className={`h-3 w-3 ${
                        value === 'allow' ? 'text-emerald-600' :
                            'text-rose-600'
                        }`}
                    />
                ) : null}
            </span>
            {permissionLabel[value]}
        </button>
    );
};

const PermissionSelect: React.FC<{
    value: PermissionValue;
    onChange: (next: PermissionValue) => void;
}> = ({ value, onChange }) => {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value as PermissionValue)}
            className="w-full px-4 py-2.5 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-300 shadow-sm"
        >
            <option value="allow" className="text-emerald-600">Allow</option>
            <option value="deny" className="text-rose-600">Deny</option>
        </select>
    );
};

type AccessPageProps = {
    currentUser: UserType;
    users: UserType[];
    onAddUser?: (newUser: Partial<UserType>) => Promise<UserType | void>;
    onRefreshCurrentUser?: () => Promise<void> | void;
};

const AccessPage: React.FC<AccessPageProps> = ({ currentUser, users, onAddUser, onRefreshCurrentUser }) => {

    const accessPermission = ((currentUser as any)?.permissions?.access_management || 'deny').toString().toLowerCase();
    const currentRole = normalizeRole((currentUser as any)?.role);
    const isAdminUser = currentRole === 'admin' || currentRole === 'super_admin';
    const canOpenAccessPage = isAdminUser && accessPermission !== 'deny';

    if (!canOpenAccessPage) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 p-8">
                <div className="text-lg font-semibold text-gray-900">Access denied</div>
                <div className="mt-2 text-sm text-gray-600">
                    You do not have permission to view this page.
                </div>
            </div>
        );
    }

    const [rows, setRows] = useState<AccessRow[]>([]);
    const [access, setAccess] = useState<UserAccess[]>([]);
    const [roles, setRoles] = useState<RoleItem[]>([]);

    const [search, setSearch] = useState('');

    const [selectedRoleTemplate, setSelectedRoleTemplate] = useState<string>('assistant');
    const [selectedUserId, setSelectedUserId] = useState<string>('');

    const [showModuleForm, setShowModuleForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [formModule, setFormModule] = useState('');
    const [formAdmin, setFormAdmin] = useState<PermissionValue>('allow');
    const [formManager, setFormManager] = useState<PermissionValue>('deny');
    const [formAssistant, setFormAssistant] = useState<PermissionValue>('deny');

    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [addingUser, setAddingUser] = useState(false);

    const [showAddRoleModal, setShowAddRoleModal] = useState(false);
    const [addingRole, setAddingRole] = useState(false);
    const [newRole, setNewRole] = useState({ key: '', name: '' });

    const [showEditRoleModal, setShowEditRoleModal] = useState(false);
    const [editingRole, setEditingRole] = useState<{ key: string; name: string }>({ key: '', name: '' });
    const [savingRoleEdit, setSavingRoleEdit] = useState(false);

    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        role: 'assistant',
        password: '',
        department: '',
        position: '',
        phone: '',
    });

    const [applyingTemplate, setApplyingTemplate] = useState(false);

    const [savingPermission, setSavingPermission] = useState<{ userId: string; moduleId: string } | null>(null);

    const loadModules = useCallback(async () => {
        try {
            const res = await accessService.getModules();
            let list: any[] = [];
            if (Array.isArray(res)) {
                list = res as any[];
            } else if (Array.isArray((res as any)?.data)) {
                list = (res as any).data;
            } else if (Array.isArray((res as any)?.modules)) {
                list = (res as any).modules;
            } else if (Array.isArray((res as any)?.result)) {
                list = (res as any).result;
            } else if ((res as any)?.success && Array.isArray((res as any)?.data)) {
                list = (res as any).data;
            }

            const mapped: AccessRow[] = (list || [])
                .map((m: any) => ({
                    id: String(m?.moduleId || ''),
                    module: String(m?.name || m?.moduleId || ''),
                    admin: normalizePermission(m?.defaults?.admin),
                    manager: normalizePermission(m?.defaults?.manager),
                    assistant: normalizePermission(m?.defaults?.assistant),
                }))
                .filter((r: any) => Boolean(r?.id));

            const hasReportsAnalytics = mapped.some((r) => String(r?.id || '').trim().toLowerCase() === 'reports_analytics');
            if (!hasReportsAnalytics) {
                const analyzeRow = mapped.find((r) => String(r?.id || '').trim().toLowerCase() === 'analyze_page');
                mapped.push({
                    id: 'reports_analytics',
                    module: 'Reports / Analytics',
                    admin: analyzeRow?.admin || 'allow',
                    manager: analyzeRow?.manager || 'deny',
                    assistant: analyzeRow?.assistant || 'deny',
                });
            }

            setRows(mapped);
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to load modules'}`);
            setRows([]);
        }
    }, []);

    const loadRoles = useCallback(async () => {
        try {
            const res = await accessService.getRoles();
            const list = Array.isArray((res as any)?.data) ? (res as any).data : [];
            const mapped: RoleItem[] = list
                .map((r: any) => ({
                    key: String(r?.key || '').trim().toLowerCase(),
                    name: String(r?.name || r?.key || '').trim(),
                }))
                .filter((r: RoleItem) => Boolean(r.key));

            const fallback: RoleItem[] = [
                { key: 'admin', name: 'Administrator' },
                { key: 'manager', name: 'Manager' },
                { key: 'assistant', name: 'Assistant' },
            ];

            const merged = [...fallback, ...mapped];
            const uniq = new Map<string, RoleItem>();
            merged.forEach(r => {
                const k = (r.key || '').toLowerCase();
                if (!k) return;
                if (!uniq.has(k)) uniq.set(k, r);
            });

            setRoles(Array.from(uniq.values()));
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to load roles'}`);
            setRoles([
                { key: 'admin', name: 'Administrator' },
                { key: 'manager', name: 'Manager' },
                { key: 'assistant', name: 'Assistant' },
            ]);
        }
    }, []);

    const loadUserPermissions = useCallback(async (userId: string) => {
        try {
            const res = await accessService.getUserPermissions(userId);
            const map = ((res as any)?.data && typeof (res as any).data === 'object') ? (res as any).data : {};
            const entries: UserAccess[] = Object.keys(map).map((moduleId) => ({
                userId,
                moduleId,
                value: normalizePermission(map[moduleId]),
            }));
            setAccess(entries);
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to load permissions'}`);
        }
    }, []);

    useEffect(() => {
        if (!canOpenAccessPage) return;
        loadModules();
        loadRoles();
    }, [canOpenAccessPage, loadModules, loadRoles]);

    const effectiveUsers = useMemo(() => {
        if (Array.isArray(users) && users.length > 0) return users;
        return [currentUser];
    }, [currentUser, users]);

    const filteredUsersByRole = useMemo(() => {
        const targetRole = normalizeRole(selectedRoleTemplate);
        return (effectiveUsers || []).filter(u => normalizeRole((u as any)?.role) === targetRole);
    }, [effectiveUsers, selectedRoleTemplate]);

    useEffect(() => {
        if (roles.length === 0) return;
        const exists = roles.some(r => normalizeRole(r.key) === normalizeRole(selectedRoleTemplate));
        if (!exists) {
            setSelectedRoleTemplate('assistant');
        }
    }, [roles, selectedRoleTemplate]);

    useEffect(() => {
        if (filteredUsersByRole.length === 0) {
            setSelectedUserId('');
            return;
        }

        const isValid = filteredUsersByRole.some(u => {
            const uid = (u?.id || (u as any)?._id || '').toString();
            return uid && uid === selectedUserId;
        });

        if (!selectedUserId || !isValid) {
            const firstId = (filteredUsersByRole[0]?.id || (filteredUsersByRole[0] as any)?._id || '').toString();
            setSelectedUserId(firstId);
        }
    }, [filteredUsersByRole, selectedUserId]);

    useEffect(() => {
        if (selectedUserId) return;
        const meId = (currentUser?.id || (currentUser as any)?._id || '').toString();
        if (meId) setSelectedUserId(meId);
    }, [currentUser, selectedUserId]);

    const filteredRows = useMemo(() => {
        const term = search.trim().toLowerCase();
        const hiddenModuleIds = new Set(['dashboard_view', 'view_all_tasks', 'view_assigned_tasks', 'assign_task']);
        const base = (rows || []).filter(r => !hiddenModuleIds.has((r?.id || '').toLowerCase()));

        const normalizeLabel = (value: unknown) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const isBrandsCompaniesReport = (label: unknown) => {
            const text = normalizeLabel(label);
            return text.includes('brand') && text.includes('compan') && text.includes('report');
        };

        const seenBrandsCompaniesReport = new Set<string>();
        const dedupedBase = base.filter((r) => {
            if (!isBrandsCompaniesReport(r?.module)) return true;
            const key = normalizeLabel(r?.module);
            if (seenBrandsCompaniesReport.has(key)) return false;
            seenBrandsCompaniesReport.add(key);
            return true;
        });

        if (!term) return dedupedBase;
        return dedupedBase.filter(r => (r.module || '').toLowerCase().includes(term));
    }, [rows, search]);

    const groupedRows = useMemo(() => {
        const groups: Record<'page' | 'task' | 'brand' | 'other', AccessRow[]> = {
            page: [],
            task: [],
            brand: [],
            other: [],
        };

        (filteredRows || []).forEach((r) => {
            const key = `${r.id} ${r.module}`.toLowerCase();
            const name = (r.module || '').toLowerCase();
            const moduleId = (r.id || '').toLowerCase();
            if (name.includes('reports') || name.includes('analytics') || name.includes('dashboard')) {
                groups.page.push(r);
                return;
            }
            if (moduleId === 'access_management' || moduleId === 'brands_page') {
                groups.page.push(r);
                return;
            }
            if (moduleId === 'tasks_page') {
                groups.page.push(r);
                return;
            }
            if (key.includes('brand')) {
                groups.brand.push(r);
            } else if (key.includes('task')) {
                groups.task.push(r);
            } else if (key.includes('page')) {
                groups.page.push(r);
            } else {
                groups.other.push(r);
            }
        });

        return groups;
    }, [filteredRows]);

    const canManageAccess = isAdminUser && canOpenAccessPage;

    const selectedUser = useMemo(() => {
        const uid = selectedUserId.toString();
        return filteredUsersByRole.find(u => (u.id || (u as any)._id || '').toString() === uid) || null;
    }, [filteredUsersByRole, selectedUserId]);

    useEffect(() => {
        const uid = (selectedUser?.id || (selectedUser as any)?._id || '').toString();
        if (!uid) return;
        loadUserPermissions(uid);
    }, [loadUserPermissions, selectedUser]);

    const isSelectedUserEditable = useMemo(() => {
        if (!selectedUser) return false;
        return true;
    }, [selectedUser]);

    const getUserModuleValue = useCallback((userId: string, moduleId: string): PermissionValue => {
        const found = access.find(a => a.userId === userId && a.moduleId === moduleId);
        if (found?.value) return normalizePermission(found.value);

        return 'deny';
    }, [access]);

    const setUserModuleValue = async (userId: string, moduleId: string, value: PermissionValue) => {
        if (!canManageAccess) return;

        const meId = (currentUser?.id || (currentUser as any)?._id || '').toString();
        if (meId && meId === userId) {
            const ok = window.confirm(
                'You are changing your own access permissions. This may affect what you can access in the system. Do you want to continue?'
            );
            if (!ok) return;
        }

        setAccess((prev) => {
            const list = Array.isArray(prev) ? [...prev] : [];
            const idx = list.findIndex(a => a.userId === userId && a.moduleId === moduleId);
            if (idx >= 0) {
                list[idx] = { ...list[idx], value };
                return list;
            }
            list.push({ userId, moduleId, value });
            return list;
        });

        setSavingPermission({ userId, moduleId });
        try {
            await accessService.setUserPermission(userId, moduleId, value);
            await loadUserPermissions(userId);

            if (meId && meId === userId && onRefreshCurrentUser) {
                await onRefreshCurrentUser();
            }
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to update permission'}`);
            await loadUserPermissions(userId);
        } finally {
            setSavingPermission(null);
        }
    };

    const applyTemplateToSelectedUser = async (options?: { overwrite?: boolean }) => {
        if (!selectedUser) {
            toast.error('Select a user first');
            return;
        }
        if (!isSelectedUserEditable) {
            toast.error('You do not have permission to edit this user');
            return;
        }

        const uid = (selectedUser.id || (selectedUser as any)._id || '').toString();
        if (!uid) {
            toast.error('Invalid user');
            return;
        }

        const meId = (currentUser?.id || (currentUser as any)?._id || '').toString();
        if (meId && meId === uid) {
            const ok = window.confirm(
                'You are applying a permission template to your own account. This can change multiple permissions and may affect what you can access. Do you want to continue?'
            );
            if (!ok) return;
        }

        setApplyingTemplate(true);
        try {
            const overwrite = Boolean(options?.overwrite);
            if (overwrite) {
                const ok = window.confirm('Overwrite ALL existing permissions for this user with the selected role template?');
                if (!ok) {
                    setApplyingTemplate(false);
                    return;
                }
            }

            await accessService.applyTemplate(uid, selectedRoleTemplate, { overwrite });
            toast.success(overwrite ? 'Template applied (overwritten)' : 'Template applied');
            await loadUserPermissions(uid);

            if (meId && meId === uid && onRefreshCurrentUser) {
                await onRefreshCurrentUser();
            }
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to apply template'}`);
        } finally {
            setApplyingTemplate(false);
        }
    };

    const openAddRole = () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        setNewRole({ key: '', name: '' });
        setShowAddRoleModal(true);
    };

    const saveNewRole = async () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const key = (newRole.key || '').trim().toLowerCase();
        const name = (newRole.name || '').trim();

        if (!key || !name) {
            toast.error('Role key and name are required');
            return;
        }

        if (!/^[a-z0-9_-]+$/.test(key)) {
            toast.error('Role key can contain only a-z, 0-9, _ and -');
            return;
        }

        const exists = roles.some(r => normalizeRole(r.key) === key);
        if (exists) {
            toast.error('This role already exists');
            return;
        }

        setAddingRole(true);
        try {
            await accessService.createRole({ key, name });
            toast.success('Role added');
            setShowAddRoleModal(false);
            await loadRoles();
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to add role'}`);
        } finally {
            setAddingRole(false);
        }
    };

    const openEditRole = (roleItem: RoleItem) => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const key = normalizeRole(roleItem?.key);
        if (!key) return;

        if (key === 'admin' || key === 'manager' || key === 'assistant') {
            toast.error('Core roles cannot be edited');
            return;
        }

        setEditingRole({ key, name: String(roleItem?.name || roleItem?.key || '').trim() });
        setShowEditRoleModal(true);
    };

    const saveRoleEdit = async () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const key = normalizeRole(editingRole?.key);
        const name = String(editingRole?.name || '').trim();
        if (!key || !name) {
            toast.error('Role name is required');
            return;
        }

        setSavingRoleEdit(true);
        try {
            await accessService.updateRole(key, { name });
            toast.success('Role updated');
            setShowEditRoleModal(false);
            await loadRoles();
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to update role'}`);
        } finally {
            setSavingRoleEdit(false);
        }
    };

    const deleteRole = async (roleKey: string) => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const key = normalizeRole(roleKey);
        if (!key) return;
        if (key === 'admin' || key === 'manager' || key === 'assistant') {
            toast.error('Core roles cannot be deleted');
            return;
        }

        const ok = window.confirm(`Delete role "${key}"? Users with this role will be moved to assistant.`);
        if (!ok) return;

        setSavingRoleEdit(true);
        try {
            await accessService.deleteRole(key);
            toast.success('Role deleted');
            await loadRoles();

            if (normalizeRole(selectedRoleTemplate) === key) {
                setSelectedRoleTemplate('assistant');
            }
        } catch (e: any) {
            const status = e?.response?.status;
            const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
            toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to delete role'}`);
        } finally {
            setSavingRoleEdit(false);
        }
    };

    const openAddUser = () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        setNewUser({
            name: '',
            email: '',
            role: 'assistant',
            password: '',
            department: '',
            position: '',
            phone: '',
        });
        setShowAddUserModal(true);
    };

    const saveNewUser = async () => {
        if (!onAddUser) {
            toast.error('Add user is not configured');
            return;
        }
        if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password) {
            toast.error('Please fill all required fields');
            return;
        }

        setAddingUser(true);
        try {
            const payload: Partial<UserType> = {
                name: newUser.name.trim(),
                email: newUser.email.trim().toLowerCase(),
                password: newUser.password,
                role: newUser.role,
                department: newUser.department,
                position: newUser.position,
                phone: newUser.phone,
            };
            await onAddUser(payload);
            toast.success('User added');
            setShowAddUserModal(false);
        } catch (e: any) {
            toast.error(e?.message || 'Failed to add user');
        } finally {
            setAddingUser(false);
        }
    };


    const onSave = () => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }

        const moduleName = formModule.trim();
        if (!moduleName) {
            toast.error('Module name is required');
            return;
        }

        const duplicate = rows.some(r => r.module.trim().toLowerCase() === moduleName.toLowerCase() && r.id !== (editingId || ''));
        if (duplicate) {
            toast.error('This module already exists');
            return;
        }

        if (editingId) {
            accessService.updateModule(editingId, {
                name: moduleName,
                defaults: { admin: formAdmin, manager: formManager, assistant: formAssistant },
            })
                .then(() => {
                    toast.success('Access rule updated');
                    loadModules();
                })
                .catch((e: any) => {
                    const status = e?.response?.status;
                    const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
                    toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to update module'}`);
                });
        } else {
            const moduleId = randomId();
            accessService.createModule({
                moduleId,
                name: moduleName,
                defaults: { admin: formAdmin, manager: formManager, assistant: formAssistant },
            })
                .then(() => {
                    toast.success('Access rule added');
                    loadModules();
                })
                .catch((e: any) => {
                    const status = e?.response?.status;
                    const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
                    toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to create module'}`);
                });
        }

        setShowModuleForm(false);
    };

    const openEdit = (row: AccessRow) => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        setEditingId(row.id);
        setFormModule(row.module);
        setFormAdmin(row.admin);
        setFormManager(row.manager);
        setFormAssistant(row.assistant);
        setShowModuleForm(true);
    };

    const onDelete = (row: AccessRow) => {
        if (!canManageAccess) {
            toast.error('Access denied');
            return;
        }
        const ok = window.confirm(`Delete access rule for "${row.module}"?`);
        if (!ok) return;
        accessService.deleteModule(row.id)
            .then(() => {
                toast.success('Access rule deleted');
                loadModules();
            })
            .catch((e: any) => {
                const status = e?.response?.status;
                const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
                toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to delete module'}`);
            });
    };

    const roleOptions = useMemo(() => {
        const list = roles.length > 0 ? roles : [
            { key: 'admin', name: 'Administrator' },
            { key: 'manager', name: 'Manager' },
            { key: 'assistant', name: 'Assistant' },
        ];
        return list.map(r => ({ value: r.key, label: r.name || r.key, disabled: false }));
    }, [roles]);

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 md:p-6">
            <div className="w-full">
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Shield className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Access Management</h1>
                                </div>
                                <p className="text-gray-600">Fine-grained control over user permissions and system access</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search modules..."
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
                                />
                            </div>

                            {canManageAccess && (
                                <button
                                    onClick={openAddUser}
                                    className="inline-flex items-center px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-semibold rounded-xl"
                                >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Add User
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mb-8 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-white to-transparent">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-indigo-600 uppercase">Role &amp; User Selection</p>
                                <p className="text-sm text-gray-600 mt-1">Choose a role template and target user to quickly apply permission presets.</p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Shield className="h-4 w-4 text-indigo-500" />
                                {selectedUser && (
                                    <span className="hidden sm:inline">
                                        Applying to <span className="font-semibold text-gray-800">{selectedUser.name || selectedUser.email || 'Selected user'}</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            <div className="lg:col-span-4">
                                <label className="block text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
                                    <Filter className="h-4 w-4 text-indigo-600" />
                                    Select Role Template
                                </label>
                                <p className="text-xs text-gray-500 mb-3">Step 1: Pick a base role whose permissions you want to start from.</p>
                                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-3">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {(roles.length > 0 ? roles : [{ key: 'admin', name: 'Administrator' }, { key: 'manager', name: 'Manager' }, { key: 'assistant', name: 'Assistant' }]).map((r) => {
                                            const key = normalizeRole(r.key);
                                            const isCore = key === 'admin' || key === 'manager' || key === 'assistant';
                                            return (
                                                <div key={r.key}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedRoleTemplate(r.key)}
                                                        className={`group relative w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${canManageAccess && !isCore ? 'pr-16' : ''} ${normalizeRole(selectedRoleTemplate) === normalizeRole(r.key)
                                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 border border-indigo-600'
                                                            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-indigo-200'
                                                            }`}
                                                    >
                                                        <span className="capitalize  ">{(r.name || r.key)}</span>

                                                    {canManageAccess && !isCore && (
                                                        <span className="absolute top-1 right-1 flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    openEditRole(r);
                                                                }}
                                                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/80 hover:bg-white border border-gray-200 text-indigo-600"
                                                                title="Edit role"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    void deleteRole(r.key);
                                                                }}
                                                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/80 hover:bg-white border border-gray-200 text-rose-600"
                                                                title="Delete role"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </span>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-8">
                                <label className="block text-sm font-semibold text-gray-900 flex items-center gap-2 mb-1">
                                    <Users className="h-4 w-4 text-indigo-600" />
                                    Select User
                                </label>
                                <p className="text-xs text-gray-500 mb-3">Step 2: Select the user who should receive these permissions and apply the template.</p>
                                <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <div className="relative flex-1">
                                            <ChevronRight className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-indigo-600" />
                                            <select
                                                value={selectedUserId}
                                                onChange={(e) => setSelectedUserId(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            >
                                                {filteredUsersByRole.map(u => {
                                                    const uid = (u.id || (u as any)._id || '').toString();
                                                    return (
                                                        <option key={uid} value={uid}>
                                                            {u.name || 'User'} ({u.email || '-'})
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                        </div>

                                        {canManageAccess && (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => applyTemplateToSelectedUser({ overwrite: false })}
                                                    disabled={applyingTemplate || !selectedUser}
                                                    className={`inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${applyingTemplate || !selectedUser
                                                        ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
                                                        }`}
                                                >
                                                    {applyingTemplate ? (
                                                        <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Applying...</span>
                                                    ) : 'Apply'}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">Permission Matrix</h3>
                            <span className="text-sm text-gray-500">{filteredRows.length} modules</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Feature / Module</th>
                                    <th className="text-center px-6 py-4 text-sm font-semibold text-gray-900 uppercase tracking-wider">Permission</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td className="px-6 py-12 text-center" colSpan={2}>
                                            <p className="text-gray-500">No modules found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    ([
                                        { key: 'page' as const, title: 'Page Access' },
                                        { key: 'task' as const, title: 'Task Access' },
                                        { key: 'brand' as const, title: 'Brand Access' },
                                        { key: 'other' as const, title: 'Other' },
                                    ]).map((section) => (
                                        groupedRows[section.key].length > 0 ? (
                                            <React.Fragment key={section.key}>
                                                <tr className="bg-gray-50">
                                                    <td colSpan={2} className="px-6 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                                        {section.title}
                                                    </td>
                                                </tr>
                                                {groupedRows[section.key].map((row) => (
                                                    <tr key={row.id} className="hover:bg-gray-50 transition-all duration-200">
                                                        <td className="px-6 py-5 font-medium text-gray-900">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <span>{row.module}</span>
                                                                {canManageAccess && (
                                                                    <div className="flex items-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                openEdit(row);
                                                                            }}
                                                                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-indigo-600"
                                                                            title="Edit module"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                onDelete(row);
                                                                            }}
                                                                            className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-rose-600"
                                                                            title="Delete module"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-5">
                                                            {selectedUser ? (
                                                                <div className="max-w-md mx-auto">
                                                                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                                                                        {(['allow', 'deny'] as PermissionValue[]).map((v) => (
                                                                            <PermissionChoice
                                                                                key={v}
                                                                                value={v}
                                                                                selected={getUserModuleValue((selectedUser.id || (selectedUser as any)._id || '').toString(), row.id)}
                                                                                disabled={!isSelectedUserEditable || (savingPermission?.userId === (selectedUser.id || (selectedUser as any)._id || '').toString() && savingPermission?.moduleId === row.id)}
                                                                                onSelect={(next) => {
                                                                                    if (!isSelectedUserEditable) {
                                                                                        toast.error('You do not have permission to edit this user');
                                                                                        return;
                                                                                    }
                                                                                    const uid = (selectedUser.id || (selectedUser as any)._id || '').toString();
                                                                                    void setUserModuleValue(uid, row.id, next);
                                                                                }}
                                                                            />
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="text-gray-400 text-sm">Select a user to configure permissions</div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ) : null
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showModuleForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/30" onClick={() => setShowModuleForm(false)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white/20 rounded-xl">
                                            <Shield className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">{editingId ? 'Edit Module' : 'Add Module'}</h3>
                                            <p className="text-sm text-indigo-100/90 mt-0.5">Set default access levels per role</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowModuleForm(false)} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-xl">
                                        <XIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="px-6 py-6 space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-900">Module Name<span className="text-rose-600 ml-1">*</span></label>
                                    <input
                                        value={formModule}
                                        onChange={(e) => setFormModule(e.target.value)}
                                        placeholder="e.g., tasks"
                                        className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Admin Default</label>
                                        <PermissionSelect value={formAdmin} onChange={setFormAdmin} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Manager Default</label>
                                        <PermissionSelect value={formManager} onChange={setFormManager} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Assistant Default</label>
                                        <PermissionSelect value={formAssistant} onChange={setFormAssistant} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-2">
                                    <button onClick={() => setShowModuleForm(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">Cancel</button>
                                    <button onClick={onSave} className="px-5 py-2.5 text-sm font-medium rounded-xl shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
                                        {editingId ? 'Update' : 'Create'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showAddUserModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddUserModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white/20 rounded-xl">
                                            <Users className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">Add New User</h3>
                                            <p className="text-sm text-blue-100/90 mt-0.5">Create a user and assign permissions</p>
                                        </div>
                                    </div>
                                    {canManageAccess && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowAddUserModal(false);
                                                openAddRole();
                                            }}
                                            className="hidden sm:inline-flex items-center px-3 py-2 bg-white/15 hover:bg-white/20 text-white text-sm font-medium rounded-xl"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Role
                                        </button>
                                    )}
                                    <button onClick={() => setShowAddUserModal(false)} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-xl">
                                        <XIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="px-6 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Full Name<span className="text-rose-600 ml-1">*</span></label>
                                        <input value={newUser.name} onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))} placeholder="John Doe" className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Email Address<span className="text-rose-600 ml-1">*</span></label>
                                        <input type="email" value={newUser.email} onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))} placeholder="john@example.com" className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Password<span className="text-rose-600 ml-1">*</span></label>
                                        <input type="password" value={newUser.password} onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))} placeholder="Temporary password" className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Role<span className="text-rose-600 ml-1">*</span></label>
                                        <select value={newUser.role} onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))} className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                                            {roleOptions.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-8">
                                    <button onClick={() => setShowAddUserModal(false)} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50">Cancel</button>
                                    <button onClick={saveNewUser} disabled={addingUser} className={`px-5 py-2.5 text-sm font-medium rounded-xl shadow-lg ${addingUser ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'}`}>
                                        {addingUser ? (
                                            <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Creating...</span>
                                        ) : 'Create User'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showAddRoleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/30" onClick={() => { if (addingRole) return; setShowAddRoleModal(false); }} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white/20 rounded-xl">
                                            <Users className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">Add Role</h3>
                                            <p className="text-sm text-emerald-100/90 mt-0.5">Create a new role (saved permanently)</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { if (addingRole) return; setShowAddRoleModal(false); }} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-xl">
                                        <XIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="px-6 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Role Key<span className="text-rose-600 ml-1">*</span></label>
                                        <input
                                            value={newRole.key}
                                            onChange={(e) => setNewRole(prev => ({ ...prev, key: e.target.value }))}
                                            placeholder="e.g., designer"
                                            disabled={addingRole}
                                            className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                        <div className="text-xs text-gray-500">Allowed: a-z, 0-9, _ and -</div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Display Name<span className="text-rose-600 ml-1">*</span></label>
                                        <input
                                            value={newRole.name}
                                            onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Designer"
                                            disabled={addingRole}
                                            className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3 pt-6">
                                    <button onClick={() => setShowAddRoleModal(false)} disabled={addingRole} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                                    <button onClick={saveNewRole} disabled={addingRole} className={`px-5 py-2.5 text-sm font-medium rounded-xl shadow-lg ${addingRole ? 'bg-emerald-300 text-white cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'}`}>
                                        {addingRole ? (
                                            <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Saving...</span>
                                        ) : 'Create Role'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showEditRoleModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/30" onClick={() => { if (savingRoleEdit) return; setShowEditRoleModal(false); }} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-white/20 rounded-xl">
                                            <Users className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">Edit Role</h3>
                                            <p className="text-sm text-indigo-100/90 mt-0.5">Update role display name</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { if (savingRoleEdit) return; setShowEditRoleModal(false); }}
                                        className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-xl"
                                    >
                                        <XIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                            <div className="px-6 py-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Role Key</label>
                                        <input
                                            value={editingRole.key}
                                            disabled
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm opacity-80 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-900">Display Name<span className="text-rose-600 ml-1">*</span></label>
                                        <input
                                            value={editingRole.name}
                                            onChange={(e) => setEditingRole(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Designer"
                                            disabled={savingRoleEdit}
                                            className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-6">
                                    <button
                                        onClick={() => setShowEditRoleModal(false)}
                                        disabled={savingRoleEdit}
                                        className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => void saveRoleEdit()}
                                        disabled={savingRoleEdit}
                                        className={`px-5 py-2.5 text-sm font-medium rounded-xl shadow-lg ${savingRoleEdit ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700'}`}
                                    >
                                        {savingRoleEdit ? (
                                            <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Saving...</span>
                                        ) : 'Save'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccessPage;