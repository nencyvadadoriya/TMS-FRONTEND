import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Users,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Shield,
    Mail,
    Save,
    X,
    Eye,
    EyeOff,
    UserCog,
    User,
    Briefcase,
    UserPlus,
} from 'lucide-react';

import type { Task, TaskHistory, UserType } from '../Types/Types';
import toast from 'react-hot-toast';
import TeamDetailsPage from './TeamDetailsPage';
import { TeamPageSkeleton } from '../Components/LoadingSkeletons';
import { authService } from '../Services/User.Services';
import { taskService } from '../Services/Task.services';
import { accessService } from '../Services/Access.Services';
import { companyService, type Company } from '../Services/Company.service';
import { routepath } from '../Routes/route';

interface TeamPageProps {
    users?: UserType[];
    tasks?: Task[];
    onDeleteUser?: (userId: string) => Promise<void>;
    onAddUser?: (newUser: Partial<UserType>) => Promise<void>;
    onUpdateUser?: (userId: string, updatedUser: Partial<UserType>) => Promise<void>;
    isOverdue?: (dueDate: string, status: string) => boolean;
    currentUser?: UserType;
    onFetchTaskHistory?: (taskId: string) => Promise<TaskHistory[]>;
}

type RoleItem = {
    key: string;
    name: string;
};

const TeamPage: React.FC<TeamPageProps> = (props) => {
    const MD_IMPEX_COMPANY_NAME = 'MD Impex';
    const SPEED_E_COM_COMPANY_NAME = 'Speed E Com';
    const navigate = useNavigate();
    const accessDeniedRef = useRef(false);

    const {
        users: usersProp,
        tasks: tasksProp,

        onDeleteUser,
        onAddUser,
        onUpdateUser,
        isOverdue = () => false,
        currentUser: currentUserProp,
        onFetchTaskHistory,
    } = props;

    const hasExternalUsers = typeof usersProp !== 'undefined';
    const hasExternalTasks = typeof tasksProp !== 'undefined';

    const hasExternalCurrentUser = useMemo(() => {
        if (typeof currentUserProp === 'undefined') return false;
        try {
            return Boolean(currentUserProp && Object.keys(currentUserProp).length > 0);
        } catch {
            return false;
        }
    }, [currentUserProp]);

    const [internalUsers, setInternalUsers] = useState<UserType[]>([]);
    const [internalUsersLoading, setInternalUsersLoading] = useState(!hasExternalUsers);
    const [internalTasks, setInternalTasks] = useState<Task[]>([]);
    const [internalTasksLoading, setInternalTasksLoading] = useState(!hasExternalTasks);
    const [internalCurrentUser, setInternalCurrentUser] = useState<UserType | null>(null);
    const [internalCurrentUserLoading, setInternalCurrentUserLoading] = useState(!hasExternalCurrentUser);

    const effectiveCurrentUser = useMemo(() => {
        return (hasExternalCurrentUser ? (currentUserProp || null) : internalCurrentUser) as any;
    }, [currentUserProp, hasExternalCurrentUser, internalCurrentUser]);

    useEffect(() => {
        if (!effectiveCurrentUser) return;
        const name = String((effectiveCurrentUser as any)?.name || '').trim().toLowerCase();
        const email = String((effectiveCurrentUser as any)?.email || '').trim().toLowerCase();
        const id = String((effectiveCurrentUser as any)?.id || (effectiveCurrentUser as any)?._id || '').trim();
        if (!id || !email || name === 'loading...') return;
        const role = String((effectiveCurrentUser as any)?.role || '').toLowerCase();
        if (role === 'admin' || role === 'super_admin') return;
        const perms = (effectiveCurrentUser as any)?.permissions;
        if (!perms || typeof perms !== 'object') return;
        if (typeof perms.team_page === 'undefined') return;
        const teamPermission = String(perms.team_page || '').toLowerCase();
        if (teamPermission === 'deny') {
            if (accessDeniedRef.current) return;
            accessDeniedRef.current = true;
            toast.error('Access denied');
            navigate(routepath.dashboard);
        }
    }, [effectiveCurrentUser, navigate]);

    useEffect(() => {
        const fetchStandaloneCurrentUser = async () => {
            if (hasExternalCurrentUser) return;
            setInternalCurrentUserLoading(true);
            try {
                const res = await authService.getCurrentUser();
                if (res?.success && res.data) {
                    setInternalCurrentUser(res.data as UserType);
                }
            } finally {
                setInternalCurrentUserLoading(false);
            }
        };

        fetchStandaloneCurrentUser();
    }, [hasExternalCurrentUser]);

    useEffect(() => {
        const fetchStandaloneUsers = async () => {
            if (hasExternalUsers) return;
            setInternalUsersLoading(true);
            try {
                const response = await authService.getAllUsers();
                if (!response) return;

                let rawUsers: any[] = [];
                if (Array.isArray(response)) {
                    rawUsers = response;
                } else if (Array.isArray((response as any).data)) {
                    rawUsers = (response as any).data;
                } else if (Array.isArray((response as any).result)) {
                    rawUsers = (response as any).result;
                } else if ((response as any).success && Array.isArray((response as any).data)) {
                    rawUsers = (response as any).data;
                }

                const normalized = (rawUsers || []).map((u: any) => {
                    const id = u?.id || u?._id || u?.userId || u?.userid || '';
                    return { ...u, id } as UserType;
                });

                setInternalUsers(normalized);
            } catch {
                // ignore
            } finally {
                setInternalUsersLoading(false);
            }
        };

        fetchStandaloneUsers();
    }, [hasExternalUsers]);

    useEffect(() => {
        const fetchStandaloneTasks = async () => {
            if (hasExternalTasks) return;
            setInternalTasksLoading(true);
            try {
                const res = await taskService.getAllTasks();
                if (res?.success && Array.isArray(res.data)) {
                    setInternalTasks(res.data as Task[]);
                }
            } finally {
                setInternalTasksLoading(false);
            }
        };

        fetchStandaloneTasks();
    }, [hasExternalTasks]);

    const users = useMemo(() => {
        return hasExternalUsers ? (usersProp || []) : internalUsers;
    }, [hasExternalUsers, internalUsers, usersProp]);

    const tasks = useMemo(() => {
        return hasExternalTasks ? (tasksProp || []) : internalTasks;
    }, [hasExternalTasks, internalTasks, tasksProp]);

    const currentUser = useMemo(() => {
        return hasExternalCurrentUser ? (currentUserProp as UserType) : (internalCurrentUser || ({} as UserType));
    }, [hasExternalCurrentUser, currentUserProp, internalCurrentUser]);

    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState<UserType | null>(null);
    const [newUser, setNewUser] = useState<{
        name: string;
        email: string;
        role: string;
        password: string;
        department: string;
        position: string;
        phone: string;
        managerId?: string;
        companyName?: string;
    }>({
        name: '',
        email: '',
        role: 'assistant',
        password: '',
        department: '',
        position: '',
        phone: '',
        managerId: undefined,
        companyName: ''
    });
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [addingUser, setAddingUser] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterCompany, setFilterCompany] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'tasks' | 'completion'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [, setIsLoadingDetails] = useState(false);

    const [availableRoles, setAvailableRoles] = useState<RoleItem[]>([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [companiesLoading, setCompaniesLoading] = useState(false);

    const [addAdminId, setAddAdminId] = useState<string>('');
    const [addSbmId, setAddSbmId] = useState<string>('');
    const [addRmId, setAddRmId] = useState<string>('');

    const openUserDetails = useCallback((userId: string) => {
        setIsLoadingDetails(true);
        // Simulate loading delay for better UX
        setTimeout(() => {
            setSelectedUserId(userId);
            setIsLoadingDetails(false);
        }, 300);
    }, []);

    const normalizeRole = useCallback((role: unknown) => {
        return (role || '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
    }, []);

    const normalizeText = useCallback((value: unknown) => {
        return (value == null ? '' : String(value))
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ' ');
    }, []);

    const isAdminLikeRole = useCallback((role: unknown) => {
        const r = normalizeRole(role);
        return r === 'admin' || r === 'super_admin';
    }, [normalizeRole]);

    const currentUserRole = useMemo(() => {
        return (currentUser?.role || '').toLowerCase();
    }, [currentUser]);

    const isCurrentUserAdmin = useMemo(() => {
        return isAdminLikeRole(currentUserRole);
    }, [currentUserRole, isAdminLikeRole]);

    useEffect(() => {
        setFilterRole('all');
    }, [filterCompany]);

    useEffect(() => {
        if (isCurrentUserAdmin) return;
        const role = (currentUserRole || '').toString().trim().toLowerCase();
        if (role === 'sbm' || role === 'rm' || role === 'am') return;
        if (filterRole === 'sbm' || filterRole === 'rm' || filterRole === 'am') {
            setFilterRole('all');
        }
    }, [currentUserRole, filterRole, isCurrentUserAdmin]);

    const isCurrentUserSuperAdmin = useMemo(() => {
        return currentUserRole === 'super_admin';
    }, [currentUserRole]);

    const isCurrentUserManager = useMemo(() => {
        return currentUserRole === 'manager';
    }, [currentUserRole]);

    const isCurrentUserMdManager = useMemo(() => {
        return currentUserRole === 'md_manager';
    }, [currentUserRole]);

    const isCurrentUserObManager = useMemo(() => {
        return currentUserRole === 'ob_manager';
    }, [currentUserRole]);

    const isCurrentUserSbm = useMemo(() => {
        return currentUserRole === 'sbm';
    }, [currentUserRole]);

    const isCurrentUserRm = useMemo(() => {
        return currentUserRole === 'rm';
    }, [currentUserRole]);

    const isCurrentUserAm = useMemo(() => {
        return currentUserRole === 'am';
    }, [currentUserRole]);

    const currentUserIdValue = useMemo(() => {
        return (currentUser?.id || (currentUser as any)?._id || '').toString();
    }, [currentUser]);

    const canViewTeamPage = useMemo(() => {
        return isCurrentUserAdmin
            || isCurrentUserMdManager
            || isCurrentUserObManager
            || isCurrentUserManager
            || isCurrentUserSbm
            || isCurrentUserRm
            || isCurrentUserAm;
    }, [isCurrentUserAdmin, isCurrentUserAm, isCurrentUserMdManager, isCurrentUserObManager, isCurrentUserManager, isCurrentUserRm, isCurrentUserSbm]);

    useEffect(() => {
        if (!canViewTeamPage) return;
        if (isCurrentUserAdmin) return;

        const userCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim();
        if (!userCompany) return;

        const currentKey = normalizeText(filterCompany === 'all' ? '' : filterCompany);
        const desiredKey = normalizeText(userCompany);
        if (!desiredKey) return;
        if (currentKey === desiredKey) return;

        setFilterCompany(userCompany);
    }, [canViewTeamPage, currentUser, filterCompany, isCurrentUserAdmin, normalizeText]);

    const canManageUsers = useMemo(() => {
        return isCurrentUserAdmin || isCurrentUserMdManager || isCurrentUserObManager;
    }, [isCurrentUserAdmin, isCurrentUserMdManager, isCurrentUserObManager]);

    const canManageUsersAsManager = useMemo(() => {
        return isCurrentUserManager;
    }, [isCurrentUserManager]);

    const canManageTargetUser = useCallback((target: UserType): boolean => {
        const targetId = (target?.id || (target as any)?._id || '').toString();
        if (!targetId) return false;

        if (isCurrentUserAdmin) return true;

        if (isCurrentUserMdManager) {
            const r = normalizeRole(target?.role);
            if (r === 'manager') return true;
            if (r !== 'assistant') return false;
            return true;
        }

        if (isCurrentUserObManager) {
            const targetRole = normalizeRole(target?.role);
            if (targetRole !== 'assistant') return false;
            return true;
        }

        if (isCurrentUserManager) {
            const targetRole = normalizeRole(target?.role);
            if (targetRole !== 'assistant') return false;
            return true;
        }

        return false;
    }, [currentUserIdValue, isCurrentUserAdmin, isCurrentUserMdManager, normalizeRole]);

    const getUserIdValue = useCallback((value: any): string => {
        return (value?.id || value?._id || value || '').toString();
    }, []);

    const usersById = useMemo(() => {
        const map = new Map<string, UserType>();
        (users || []).forEach((u) => {
            const id = (u?.id || (u as any)?._id || '').toString();
            const oid = ((u as any)?._id || '').toString();
            if (id) map.set(id, u);
            if (oid) map.set(oid, u);
        });
        return map;
    }, [users]);

    const getRoleLabel = useCallback((role: unknown) => {
        const r = normalizeRole(role);
        if (!r) return '';
        if (r === 'super_admin') return 'Super Admin';
        if (r === 'admin') return 'Admin';
        if (r === 'md_manager') return 'MD Manager';
        if (r === 'ob_manager') return 'OB Manager';
        if (r === 'manager') return 'Manager';
        if (r === 'sbm') return 'SBM';
        if (r === 'rm') return 'RM';
        if (r === 'am') return 'AM';
        if (r === 'assistant') return 'Assistant';
        if (r === 'sub_assistance') return 'Sub Assistance';
        return (role || '').toString();
    }, [normalizeRole]);

    const getReportingChain = useCallback((user: UserType) => {
        const chain: UserType[] = [];
        const visited = new Set<string>();
        let currentManagerId = (user?.managerId || '').toString();
        let depth = 0;

        while (currentManagerId && depth < 20) {
            if (visited.has(currentManagerId)) break;
            visited.add(currentManagerId);

            const manager = usersById.get(currentManagerId);
            if (!manager) break;

            chain.push(manager);

            const nextId = (manager?.managerId || '').toString();
            currentManagerId = nextId;
            depth += 1;
        }

        return chain;
    }, [usersById]);

    const selectedAddRoleKey = useMemo(() => {
        return normalizeRole(newUser.role);
    }, [newUser.role, normalizeRole]);

    const canAssignRole = useCallback((roleKey: string) => {
        const requester = normalizeRole(currentUserRole);
        const target = normalizeRole(roleKey);
        if (!target) return false;

        if (target === 'super_admin') return false;
        if (requester === 'super_admin') return true;
        if (requester === 'admin') return target !== 'admin' && target !== 'super_admin';
        if (requester === 'md_manager') return target === 'manager' || target === 'assistant';
        if (requester === 'ob_manager') return target === 'assistant';
        if (requester === 'manager') return target === 'assistant';
        if (requester === 'sbm') return target === 'rm';
        if (requester === 'rm') return target === 'am';
        return false;
    }, [currentUserRole, normalizeRole]);

    const loadRoles = useCallback(async () => {
        setRolesLoading(true);
        try {
            const res = await accessService.getRoles();
            const list = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? (res as any) : [];

            const mapped: RoleItem[] = (list || [])
                .map((r: any) => ({
                    key: String(r?.key || '').trim().toLowerCase(),
                    name: String(r?.name || r?.key || '').trim() || String(r?.key || '').trim(),
                }))
                .filter((r: RoleItem) => Boolean(r.key));

            const fallback: RoleItem[] = [
                { key: 'admin', name: 'Admin' },
                { key: 'md_manager', name: 'MD Manager' },
                { key: 'ob_manager', name: 'OB Manager' },
                { key: 'manager', name: 'Manager' },
                { key: 'sbm', name: 'SBM' },
                { key: 'rm', name: 'RM' },
                { key: 'am', name: 'AM' },
                { key: 'assistant', name: 'Assistant' },
                { key: 'sub_assistance', name: 'Sub Assistance' },
            ];

            const merged = [...fallback, ...mapped];
            const uniq = new Map<string, RoleItem>();
            merged.forEach((r) => {
                const k = normalizeRole(r.key);
                if (!k) return;
                if (!uniq.has(k)) uniq.set(k, { key: k, name: r.name || r.key });
            });

            setAvailableRoles(Array.from(uniq.values()));
        } catch {
            setAvailableRoles([
                { key: 'admin', name: 'Admin' },
                { key: 'md_manager', name: 'MD Manager' },
                { key: 'ob_manager', name: 'OB Manager' },
                { key: 'manager', name: 'Manager' },
                { key: 'sbm', name: 'SBM' },
                { key: 'rm', name: 'RM' },
                { key: 'am', name: 'AM' },
                { key: 'assistant', name: 'Assistant' },
                { key: 'sub_assistance', name: 'Sub Assistance' },
            ]);
        } finally {
            setRolesLoading(false);
        }
    }, [normalizeRole]);

    const loadCompanies = useCallback(async () => {
        setCompaniesLoading(true);
        try {
            const role = normalizeRole(currentUserRole);
            const needsAllowedCompanies = role === 'md_manager' || role === 'ob_manager' || role === 'manager' || role === 'assistant' || role === 'sbm' || role === 'rm' || role === 'am';
            const res = needsAllowedCompanies
                ? await companyService.getAllowedCompanies()
                : await companyService.getCompanies();
            if (res?.success && Array.isArray(res.data)) {
                setCompanies(res.data as Company[]);
            } else {
                setCompanies([]);
            }
        } catch {
            setCompanies([]);
        } finally {
            setCompaniesLoading(false);
        }
    }, [currentUserRole, normalizeRole]);

    useEffect(() => {
        if (!canViewTeamPage) return;
        loadCompanies();
        if (!isCurrentUserAdmin) return;
        loadRoles();
    }, [canViewTeamPage, isCurrentUserAdmin, loadCompanies, loadRoles]);

    const effectiveRoleOptions = useMemo(() => {
        if (!isCurrentUserAdmin) return [];
        const filtered = (availableRoles || []).filter((r) => canAssignRole(r.key));
        const order = ['admin', 'md_manager', 'ob_manager', 'manager', 'sbm', 'rm', 'am', 'assistant'];
        return filtered.sort((a, b) => {
            const ia = order.indexOf(normalizeRole(a.key));
            const ib = order.indexOf(normalizeRole(b.key));
            if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
            return (a.name || a.key).localeCompare(b.name || b.key);
        });
    }, [availableRoles, canAssignRole, isCurrentUserAdmin, normalizeRole]);

    const roleOptionsForAddModal = useMemo(() => {
        if (isCurrentUserAdmin) return effectiveRoleOptions;
        if (normalizeRole(currentUserRole) === 'md_manager') {
            return [{ key: 'manager', name: 'Manager' }, { key: 'assistant', name: 'Assistant' }];
        }
        if (normalizeRole(currentUserRole) === 'ob_manager') {
            return [{ key: 'assistant', name: 'Assistant' }];
        }
        return [{ key: 'assistant', name: 'Assistant' }];
    }, [currentUserRole, effectiveRoleOptions, isCurrentUserAdmin, normalizeRole]);

    const adminCandidates = useMemo(() => {
        const admins = (users || []).filter((u) => normalizeRole(u?.role) === 'admin');
        if (!isCurrentUserSuperAdmin && normalizeRole(currentUserRole) === 'admin') {
            const myId = getUserIdValue(currentUser);
            return admins.filter((u) => getUserIdValue(u) === myId);
        }
        return admins;
    }, [currentUser, currentUserRole, getUserIdValue, isCurrentUserSuperAdmin, normalizeRole, users]);

    const sbmCandidates = useMemo(() => {
        return (users || [])
            .filter((u) => normalizeRole(u?.role) === 'sbm')
            .filter((u) => {
                if (!addAdminId) return true;
                return (u as any)?.managerId?.toString() === addAdminId;
            })
            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [addAdminId, normalizeRole, users]);

    const rmCandidates = useMemo(() => {
        return (users || [])
            .filter((u) => normalizeRole(u?.role) === 'rm')
            .filter((u) => {
                if (!addSbmId) return true;
                return (u as any)?.managerId?.toString() === addSbmId;
            })
            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
    }, [addSbmId, normalizeRole, users]);

    const isInitialLoading = useMemo(() => {
        const name = (currentUser?.name || '').toString().trim().toLowerCase();
        if (name === 'loading...') return true;
        if (!hasExternalCurrentUser && internalCurrentUserLoading) return true;
        if (!hasExternalUsers && internalUsersLoading && users.length === 0) return true;
        if (!hasExternalTasks && internalTasksLoading && tasks.length === 0) return true;
        return false;
    }, [
        currentUser?.name,
        hasExternalCurrentUser,
        hasExternalTasks,
        hasExternalUsers,
        internalCurrentUserLoading,
        internalTasksLoading,
        internalUsersLoading,
        tasks.length,
        users.length,
    ]);

    const companyOptions = useMemo(() => {
        const fromApi = (companies || [])
            .map((c: any) => String(c?.companyName || c?.name || c?.company || '').trim())
            .filter(Boolean);
        const uniq = Array.from(new Set(fromApi));
        return uniq.sort((a, b) => a.localeCompare(b));
    }, [companies, users]);

    const isTeamCompanyForced = useMemo(() => {
        if (isCurrentUserAdmin) return false;
        return companyOptions.length === 1;
    }, [companyOptions.length, isCurrentUserAdmin]);

    useEffect(() => {
        if (!showAddModal) return;
        if (!isTeamCompanyForced) return;
        const only = (companyOptions[0] || '').toString();
        if (!only) return;
        setNewUser((prev) => ({ ...prev, companyName: only }));
    }, [companyOptions, isTeamCompanyForced, showAddModal]);

    if (isInitialLoading) {
        return <TeamPageSkeleton />;
    }

    const visibleUsers = useMemo(() => {
        if (!canViewTeamPage) return [];
        const companyKey = normalizeText(filterCompany);
        const inCompany = (u: any) => {
            if (filterCompany === 'all') return true;
            return normalizeText(u?.companyName || u?.company || '') === companyKey;
        };

        if (isCurrentUserAdmin) return (users || []).filter(inCompany);

        if (isCurrentUserMdManager) {
            const myId = (currentUser?.id || (currentUser as any)?._id || '').toString();
            return (users || []).filter(u => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                if (uid && myId && uid === myId) return true;

                if (normalizeRole(u?.role) === 'manager') {
                    return (u?.managerId || '').toString() === myId;
                }

                if (normalizeRole(u?.role) === 'assistant') return true;

                if (normalizeRole(u?.role) === 'ob_manager') return true;

                return false;
            }).filter(inCompany);
        }

        if (isCurrentUserObManager) {
            const myId = (currentUser?.id || (currentUser as any)?._id || '').toString();
            return (users || []).filter(u => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                if (uid && myId && uid === myId) return true;

                const r = normalizeRole(u?.role);
                if (r === 'assistant') return true;
                if (r === 'manager') return true;
                if (r === 'md_manager') return true;
                if (r === 'ob_manager') return true;
                return false;
            }).filter(inCompany);
        }

        if (isCurrentUserManager) {
            const myId = (currentUser?.id || (currentUser as any)?._id || '').toString();
            return (users || []).filter(u => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                if (uid && myId && uid === myId) return true;

                const r = normalizeRole(u?.role);
                if (r === 'assistant') return true;
                if (r === 'manager') return true;
                return false;
            }).filter(inCompany);
        }

        if (isCurrentUserSbm) {
            const myId = (currentUser?.id || (currentUser as any)?._id || '').toString();
            const rmUsers = (users || []).filter((u: any) => normalizeRole(u?.role) === 'rm' && (u?.managerId || '').toString() === myId);
            const rmIds = new Set(rmUsers.map((u: any) => (u?.id || (u as any)?._id || '').toString()).filter(Boolean));
            const amUsers = (users || []).filter((u: any) => normalizeRole(u?.role) === 'am' && rmIds.has((u?.managerId || '').toString()));
            const self = (users || []).find((u: any) => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                return uid && myId && uid === myId;
            }) || (currentUser as any);

            const list = [self, ...rmUsers, ...amUsers].filter(Boolean);
            const uniq = Array.from(new Map(list.map((u: any) => [String((u?.id || u?._id || '')), u])).values());
            return uniq.filter(inCompany);
        }

        if (isCurrentUserRm) {
            const myId = (currentUser?.id || (currentUser as any)?._id || '').toString();
            const sbmId = (currentUser as any)?.managerId?.toString() || '';
            const sbmUser = (users || []).find((u: any) => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                return uid && sbmId && uid === sbmId;
            });
            const amUsers = (users || []).filter((u: any) => normalizeRole(u?.role) === 'am' && (u?.managerId || '').toString() === myId);
            const self = (users || []).find((u: any) => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                return uid && myId && uid === myId;
            }) || (currentUser as any);

            const list = [sbmUser, self, ...amUsers].filter(Boolean);
            const uniq = Array.from(new Map(list.map((u: any) => [String((u?.id || u?._id || '')), u])).values());
            return uniq.filter(inCompany);
        }

        if (isCurrentUserAm) {
            const myId = (currentUser?.id || (currentUser as any)?._id || '').toString();
            const rmId = (currentUser as any)?.managerId?.toString() || '';
            const rmUser = (users || []).find((u: any) => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                return uid && rmId && uid === rmId;
            });
            const sbmId = (rmUser as any)?.managerId?.toString() || '';
            const sbmUser = (users || []).find((u: any) => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                return uid && sbmId && uid === sbmId;
            });
            const self = (users || []).find((u: any) => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                return uid && myId && uid === myId;
            }) || (currentUser as any);

            const list = [sbmUser, rmUser, self].filter(Boolean);
            const uniq = Array.from(new Map(list.map((u: any) => [String((u?.id || u?._id || '')), u])).values());
            return uniq.filter(inCompany);
        }

        return [];
    }, [canViewTeamPage, currentUser, filterCompany, isCurrentUserAdmin, isCurrentUserAm, isCurrentUserMdManager, isCurrentUserManager, isCurrentUserObManager, isCurrentUserRm, isCurrentUserSbm, users, normalizeRole, normalizeText]);

    useEffect(() => {
        if (!isCurrentUserManager) return;
        if (filterRole !== 'ob_manager' && filterRole !== 'md_manager') return;
        setFilterRole('all');
    }, [filterRole, isCurrentUserManager]);

    const companyScopedUsers = useMemo(() => {
        const selectedCompanyKey = normalizeText(filterCompany === 'all' ? '' : filterCompany);
        const isMdImpexSelected = selectedCompanyKey.includes('impex') || selectedCompanyKey === normalizeText(MD_IMPEX_COMPANY_NAME);
        const isSpeedEComSelected = selectedCompanyKey.includes('speed') && (selectedCompanyKey.includes('com') || selectedCompanyKey.includes('eom'));

        if (isMdImpexSelected) {
            const allowed = new Set(['md_manager', 'ob_manager', 'manager', 'assistant']);
            return visibleUsers.filter((u) => allowed.has(normalizeRole((u as any)?.role)));
        }

        if (isSpeedEComSelected) {
            const allowed = new Set(['sbm', 'rm', 'am']);
            return visibleUsers.filter((u) => allowed.has(normalizeRole((u as any)?.role)));
        }

        return visibleUsers;
    }, [MD_IMPEX_COMPANY_NAME, SPEED_E_COM_COMPANY_NAME, filterCompany, normalizeRole, normalizeText, visibleUsers]);

    // Filter users based on clicked stat
    const getFilteredUsersByRole = useMemo(() => {
        if (filterRole === 'all') return companyScopedUsers;
        if (filterRole === 'super_admin') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'super_admin');
        if (filterRole === 'admin') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'admin');
        if (filterRole === 'md_manager') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'md_manager');
        if (filterRole === 'ob_manager') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'ob_manager');
        if (filterRole === 'manager') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'manager');
        if (filterRole === 'sbm') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'sbm');
        if (filterRole === 'rm') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'rm');
        if (filterRole === 'am') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'am');
        if (filterRole === 'assistant') return companyScopedUsers.filter(u => normalizeRole(u.role) === 'assistant');
        return companyScopedUsers;
    }, [companyScopedUsers, filterRole, normalizeRole]);

    // Calculate tasks for each user
    const getTasksForUser = useCallback((userId: string, userEmail: string) => {
        return tasks.filter(task => {
            const assignedTo = (task as any)?.assignedTo;
            if (typeof assignedTo === 'string') {
                if (assignedTo === userId || assignedTo === userEmail) return true;
            }

            if (assignedTo && typeof assignedTo === 'object') {
                const assignedToId = (assignedTo.id || assignedTo._id || '').toString();
                const assignedToEmail = (assignedTo.email || '').toString();
                if (assignedToId && assignedToId === userId) return true;
                if (assignedToEmail && assignedToEmail === userEmail) return true;
            }

            const assignedToUser = (task as any)?.assignedToUser;
            if (assignedToUser) {
                const assignedToUserId = (assignedToUser.id || assignedToUser._id || '').toString();
                const assignedToUserEmail = (assignedToUser.email || '').toString();
                if (assignedToUserId && assignedToUserId === userId) return true;
                if (assignedToUserEmail && assignedToUserEmail === userEmail) return true;
            }

            return false;
        });
    }, [tasks]);

    const getTasksCreatedByUser = useCallback((userId: string, userEmail: string) => {
        return tasks.filter(task => {
            const assignedBy = (task as any)?.assignedBy;
            if (typeof assignedBy === 'string') {
                if (assignedBy === userId || assignedBy === userEmail) return true;
            }

            if (assignedBy && typeof assignedBy === 'object') {
                const assignedById = (assignedBy.id || assignedBy._id || '').toString();
                const assignedByEmail = (assignedBy.email || '').toString();
                if (assignedById && assignedById === userId) return true;
                if (assignedByEmail && assignedByEmail === userEmail) return true;
            }

            return false;
        });
    }, [tasks]);

    // Get dynamic user stats
    const getUserStats = useCallback((userId: string, userEmail: string) => {
        const assignedTasks = getTasksForUser(userId, userEmail);
        const createdTasks = getTasksCreatedByUser(userId, userEmail);

        const totalAssigned = assignedTasks.length;
        const completed = assignedTasks.filter(t => t.status === 'completed').length;
        const pending = assignedTasks.filter(t =>
            t.status === 'pending' || t.status === 'in-progress'
        ).length;
        const overdue = assignedTasks.filter(t => isOverdue(t.dueDate, t.status)).length;

        return {
            totalAssigned,
            completed,
            pending,
            overdue,
            completionRate: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
            tasksCreated: createdTasks.length
        };
    }, [getTasksForUser, getTasksCreatedByUser, isOverdue]);

    // Filter and sort users
    const filteredAndSortedUsers = useMemo(() => {
        let filtered = getFilteredUsersByRole.filter(user => {
            if (!canViewTeamPage) return false;

            // Search filter
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                return (
                    user.name?.toLowerCase().includes(term) ||
                    user.email?.toLowerCase().includes(term) ||
                    user.role?.toLowerCase().includes(term) ||
                    user.department?.toLowerCase().includes(term) ||
                    user.position?.toLowerCase().includes(term)
                );
            }

            return true;
        });

        // Sort users
        filtered.sort((a, b) => {
            const statsA = getUserStats(a.id, a.email);
            const statsB = getUserStats(b.id, b.email);

            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'role':
                    comparison = (a.role || '').localeCompare(b.role || '');
                    break;
                case 'tasks':
                    comparison = statsA.totalAssigned - statsB.totalAssigned;
                    break;
                case 'completion':
                    comparison = statsA.completionRate - statsB.completionRate;
                    break;
            }

            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [getFilteredUsersByRole, searchTerm, sortBy, sortOrder, canViewTeamPage, getUserStats]);

    // Role badge colors
    const getRoleBadgeColor = (role: string) => {
        const normalizedRole = normalizeRole(role);
        switch (normalizedRole) {
            case 'super_admin':
                return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'admin':
                return 'bg-purple-100 text-purple-800 border border-purple-200';
            case 'md_manager':
                return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'ob_manager':
                return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'manager':
                return 'bg-blue-100 text-blue-800 border border-blue-200';
            case 'assistant':
                return 'bg-green-100 text-green-800 border border-green-200';
            case 'developer':
                return 'bg-green-100 text-green-800 border border-green-200';
            case 'designer':
                return 'bg-pink-100 text-pink-800 border border-pink-200';
            default:
                return 'bg-gray-100 text-gray-800 border border-gray-200';
        }
    };

    // Get role icon
    const getRoleIcon = (role: string) => {
        const normalizedRole = normalizeRole(role);
        switch (normalizedRole) {
            case 'super_admin':
                return <Shield className="h-4 w-4" />;
            case 'admin':
                return <Shield className="h-4 w-4" />;
            case 'md_manager':
                return <UserCog className="h-4 w-4" />;
            case 'ob_manager':
                return <UserCog className="h-4 w-4" />;
            case 'manager':
                return <UserCog className="h-4 w-4" />;
            case 'assistant':
                return <User className="h-4 w-4" />;
            case 'developer':
                return <Briefcase className="h-4 w-4" />;
            case 'designer':
                return <User className="h-4 w-4" />;
            default:
                return <User className="h-4 w-4" />;
        }
    };

    // Delete user function
    const handleDeleteClick = (userId: string) => {
        if (!canManageUsers && !canManageUsersAsManager) {
            toast.error('You do not have permission to delete users');
            return;
        }

        if (currentUserIdValue && userId?.toString() === currentUserIdValue) {
            toast.error('You cannot delete your own account');
            return;
        }

        if (isCurrentUserMdManager) {
            const target = (users || []).find((u) => (u?.id || (u as any)?._id || '').toString() === userId?.toString());
            if (!target || normalizeRole(target?.role) !== 'manager') {
                toast.error('You can only delete manager accounts');
                return;
            }
        }

        if (isCurrentUserManager) {
            const myId = (currentUserIdValue || '').toString();
            const target = (users || []).find((u) => (u?.id || (u as any)?._id || '').toString() === userId?.toString());
            const targetRole = normalizeRole(target?.role);
            const isMyAssistant = targetRole === 'assistant' && (target as any)?.managerId?.toString() === myId;
            if (!isMyAssistant) {
                toast.error('You can only delete your assistant accounts');
                return;
            }
        }

        setUserToDelete(userId);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;

        setDeletingUserId(userToDelete);
        try {
            if (onDeleteUser) {
                await onDeleteUser(userToDelete);
            }
            toast.success('User deleted successfully');
            setShowDeleteModal(false);
            setUserToDelete(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        } finally {
            setDeletingUserId(null);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteModal(false);
        setUserToDelete(null);
    };

    // Edit user function
    const handleEditClick = (user: UserType) => {
        if (!canManageUsers && !canManageUsersAsManager) {
            toast.error('You do not have permission to edit users');
            return;
        }

        const targetId = (user?.id || (user as any)?._id || '').toString();
        if (currentUserIdValue && targetId && targetId === currentUserIdValue) {
            toast.error('You cannot edit your own account');
            return;
        }

        if (isCurrentUserMdManager && normalizeRole(user?.role) !== 'manager') {
            toast.error('You can only edit manager accounts');
            return;
        }

        if (isCurrentUserManager) {
            const myId = (currentUserIdValue || '').toString();
            const targetRole = normalizeRole(user?.role);
            const isMyAssistant = targetRole === 'assistant' && (user as any)?.managerId?.toString() === myId;
            if (!isMyAssistant) {
                toast.error('You can only edit your assistant accounts');
                return;
            }
        }

        setEditingUser({ ...user });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingUser) return;

        setSavingUserId(editingUser.id);
        try {
            if (onUpdateUser) {
                await onUpdateUser(editingUser.id, editingUser);
            }
            toast.success('User updated successfully');
            setShowEditModal(false);
            setEditingUser(null);
        } catch (error) {
            console.error('Error updating user:', error);
            toast.error('Failed to update user');
        } finally {
            setSavingUserId(null);
        }
    };

    const handleCancelEdit = () => {
        setShowEditModal(false);
        setEditingUser(null);
    };

    // Add user function
    const handleAddClick = () => {
        if (!canManageUsers && !canManageUsersAsManager) {
            toast.error('You do not have permission to add users');
            return;
        }

        const defaultRole = (() => {
            if (currentUserRole === 'super_admin') return 'admin';
            if (currentUserRole === 'admin') return 'md_manager';
            if (currentUserRole === 'md_manager') return 'manager';
            return 'assistant';
        })();

        setNewUser({
            name: '',
            email: '',
            role: isCurrentUserManager ? 'assistant' : defaultRole,
            password: '',
            department: '',
            position: '',
            phone: '',
            managerId: undefined,
            companyName: ((currentUser as any)?.companyName || '')
        });

        setAddAdminId(!isCurrentUserSuperAdmin && currentUserRole === 'admin' ? getUserIdValue(currentUser) : '');
        setAddSbmId('');
        setAddRmId('');

        setShowPassword(false);
        setShowAddModal(true);
    };

    const handleSaveNewUser = async () => {
        if (!canManageUsers && !canManageUsersAsManager) {
            toast.error('You do not have permission to add users');
            return;
        }

        // Validation
        if (!newUser.name?.trim() || !newUser.email?.trim() || !newUser.password) {
            toast.error('Please fill in all required fields');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(newUser.email)) {
            toast.error('Please enter a valid email address');
            return;
        }

        if (newUser.password.length < 6) {
            toast.error('Password must be at least 6 characters long');
            return;
        }

        setAddingUser(true);
        try {
            let resolvedManagerId = newUser.managerId;

            if (selectedAddRoleKey === 'sbm') {
                if (!addAdminId) {
                    toast.error('Please select admin');
                    return;
                }
                resolvedManagerId = addAdminId;
            }

            if (selectedAddRoleKey === 'rm') {
                if (!addAdminId) {
                    toast.error('Please select admin');
                    return;
                }
                if (!addSbmId) {
                    toast.error('Please select SBM');
                    return;
                }
                resolvedManagerId = addSbmId;
            }

            if (selectedAddRoleKey === 'am') {
                if (!addAdminId) {
                    toast.error('Please select admin');
                    return;
                }
                if (!addSbmId) {
                    toast.error('Please select SBM');
                    return;
                }
                if (!addRmId) {
                    toast.error('Please select RM');
                    return;
                }
                resolvedManagerId = addRmId;
            }

            if (selectedAddRoleKey === 'assistant') {
                resolvedManagerId = undefined;
            }

            const userData = {
                name: newUser.name.trim(),
                email: newUser.email.trim().toLowerCase(),
                password: newUser.password,
                role: isCurrentUserManager ? 'assistant' : newUser.role,
                department: newUser.department || '',
                position: newUser.position || '',
                phone: newUser.phone || '',
                managerId: resolvedManagerId,
                companyName: (newUser.companyName || '').toString(),
            };
            if (onAddUser) {
                await onAddUser(userData);
            }
            toast.success('User added successfully');
            setShowAddModal(false);
            setAddAdminId('');
            setAddSbmId('');
            setAddRmId('');
            setNewUser({
                name: '',
                email: '',
                role: isCurrentUserManager ? 'assistant' : 'user',
                password: '',
                department: '',
                position: '',
                phone: '',
                managerId: undefined,
                companyName: ''
            });
            setShowPassword(false);
        } catch (error: any) {
            console.error('Error adding user:', error);
            const apiMsg = error?.response?.data?.message || error?.response?.data?.msg;
            const msg = (apiMsg || error?.message || 'Failed to add user').toString();
            toast.error(msg);
        } finally {
            setAddingUser(false);
        }
    };

    const handleCancelAdd = () => {
        setShowAddModal(false);
        setAddAdminId('');
        setAddSbmId('');
        setAddRmId('');
        setNewUser({
            name: '',
            email: '',
            role: isCurrentUserManager ? 'assistant' : 'user',
            password: '',
            department: '',
            position: '',
            phone: '',
            managerId: undefined,
            companyName: ''
        });
        setShowPassword(false);
    };

    const getUserInitials = (name: string | undefined): string => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }

        return name.charAt(0).toUpperCase();
    };

    const getUserAvatar = (user: UserType, size: 'sm' | 'md' | 'lg' = 'md'): React.ReactElement => {
        const initials = getUserInitials(user.name);
        const role = normalizeRole(user.role);

        let gradient = 'from-gray-600 to-gray-800';
        switch (role) {
            case 'admin':
                gradient = 'from-purple-500 to-purple-700';
                break;
            case 'manager':
                gradient = 'from-blue-500 to-blue-700';
                break;
            case 'assistant':
                gradient = 'from-green-500 to-green-700';
                break;
            case 'developer':
                gradient = 'from-green-500 to-green-700';
                break;
            case 'designer':
                gradient = 'from-pink-500 to-pink-700';
                break;
        }

        const sizeClasses = {
            sm: 'h-10 w-10 text-sm',
            md: 'h-12 w-12 text-base',
            lg: 'h-14 w-14 text-lg'
        };

        return (
            <div className="flex-shrink-0">
                <div className={`rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold ${sizeClasses[size]}`}>
                    {initials}
                </div>
            </div>
        );
    };

    const selectedUser = useMemo(() => {
        if (!selectedUserId) return null;
        return visibleUsers.find(u => u.id === selectedUserId) || null;
    }, [selectedUserId, visibleUsers]);

    // If not admin or manager, show limited view message
    if (!canViewTeamPage) {
        return (
            <div className="space-y-8">
                <div className="md:flex md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                                <Shield className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Management</h1>
                                <p className="mt-1 text-sm text-gray-500">This page is available to administrators and managers only</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-8">
                    <div className="max-w-xl">
                        <div className="text-lg font-semibold text-gray-900">Access denied</div>
                        <div className="mt-2 text-sm text-gray-600">
                            Your account does not have permission to view team members.
                        </div>
                        <div className="mt-4 text-sm text-gray-600">
                            If you believe this is a mistake, contact an administrator.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (selectedUser) {
        return (
            <TeamDetailsPage
                user={selectedUser}
                tasks={tasks}
                users={users}
                onBack={() => setSelectedUserId(null)}
                onEditUser={handleEditClick}
                onDeleteUser={handleDeleteClick}
                onFetchTaskHistory={onFetchTaskHistory}
                isOverdue={isOverdue}
                currentUser={currentUser}
            />
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="md:flex md:items-center md:justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                        <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                            <Shield className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Team Management</h1>
                            <p className="mt-1 text-sm text-gray-500">Manage your team members and their tasks</p>
                        </div>
                    </div>
                </div>
                <div className="mt-4 md:mt-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {isCurrentUserAdmin && (
                            <select
                                value={filterCompany}
                                onChange={(e) => setFilterCompany(e.target.value)}
                                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">All Companies</option>
                                {companyOptions.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        )}
                        {(canManageUsers || canManageUsersAsManager) && (
                            <button
                                onClick={handleAddClick}
                                className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add User
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards - Small and Light with Colors */}
            {(() => {
                const selectedCompanyKey = normalizeText(filterCompany === 'all' ? '' : filterCompany);
                const isMdImpexSelected = selectedCompanyKey.includes('impex') || selectedCompanyKey === normalizeText(MD_IMPEX_COMPANY_NAME);
                const isSpeedEComSelected = selectedCompanyKey.includes('speed') && (selectedCompanyKey.includes('com') || selectedCompanyKey.includes('eom'));

                if (isCurrentUserAdmin && isMdImpexSelected) {
                    return (
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                            <button
                                onClick={() => setFilterRole('all')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-100'}`}
                            >
                                <div className="text-3xl font-bold text-gray-900">{companyScopedUsers.length}</div>
                                <div className="text-sm text-gray-600 mt-1">Total Members</div>
                            </button>
                            {!isCurrentUserManager && (
                                <button
                                    onClick={() => setFilterRole('md_manager')}
                                    className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'md_manager' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-100'}`}
                                >
                                    <div className="text-3xl font-bold text-indigo-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'md_manager').length}</div>
                                    <div className="text-sm text-gray-600 mt-1">MD Manager</div>
                                </button>
                            )}
                            {!isCurrentUserManager && (
                                <button
                                    onClick={() => setFilterRole('ob_manager')}
                                    className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'ob_manager' ? 'bg-violet-50 border-violet-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-violet-50 hover:border-violet-100'}`}
                                >
                                    <div className="text-3xl font-bold text-violet-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'ob_manager').length}</div>
                                    <div className="text-sm text-gray-600 mt-1">OB Manager</div>
                                </button>
                            )}
                            <button
                                onClick={() => setFilterRole('manager')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'manager' ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-100'}`}
                            >
                                <div className="text-3xl font-bold text-purple-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'manager').length}</div>
                                <div className="text-sm text-gray-600 mt-1">Managers</div>
                            </button>
                            <button
                                onClick={() => setFilterRole('assistant')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'assistant' ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-green-50 hover:border-green-100'}`}
                            >
                                <div className="text-3xl font-bold text-green-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'assistant').length}</div>
                                <div className="text-sm text-gray-600 mt-1">Assistants</div>
                            </button>
                        </div>
                    );
                }

                if (isCurrentUserAdmin && isSpeedEComSelected) {
                    return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                onClick={() => setFilterRole('all')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-100'}`}
                            >
                                <div className="text-3xl font-bold text-gray-900">{companyScopedUsers.length}</div>
                                <div className="text-sm text-gray-600 mt-1">Total Members</div>
                            </button>
                            <button
                                onClick={() => setFilterRole('sbm')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'sbm' ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-amber-50 hover:border-amber-100'}`}
                            >
                                <div className="text-3xl font-bold text-amber-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'sbm').length}</div>
                                <div className="text-sm text-gray-600 mt-1">SBM</div>
                            </button>
                            <button
                                onClick={() => setFilterRole('rm')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'rm' ? 'bg-cyan-50 border-cyan-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-cyan-50 hover:border-cyan-100'}`}
                            >
                                <div className="text-3xl font-bold text-cyan-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'rm').length}</div>
                                <div className="text-sm text-gray-600 mt-1">RM</div>
                            </button>
                            <button
                                onClick={() => setFilterRole('am')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'am' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-emerald-50 hover:border-emerald-100'}`}
                            >
                                <div className="text-3xl font-bold text-emerald-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'am').length}</div>
                                <div className="text-sm text-gray-600 mt-1">AM</div>
                            </button>
                        </div>
                    );
                }

                if (isSpeedEComSelected) {
                    return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <button
                                onClick={() => setFilterRole('all')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-100'}`}
                            >
                                <div className="text-3xl font-bold text-gray-900">{companyScopedUsers.length}</div>
                                <div className="text-sm text-gray-600 mt-1">Total Members</div>
                            </button>
                            <button
                                onClick={() => setFilterRole('sbm')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'sbm' ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-amber-50 hover:border-amber-100'}`}
                            >
                                <div className="text-3xl font-bold text-amber-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'sbm').length}</div>
                                <div className="text-sm text-gray-600 mt-1">SBM</div>
                            </button>
                            <button
                                onClick={() => setFilterRole('rm')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'rm' ? 'bg-cyan-50 border-cyan-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-cyan-50 hover:border-cyan-100'}`}
                            >
                                <div className="text-3xl font-bold text-cyan-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'rm').length}</div>
                                <div className="text-sm text-gray-600 mt-1">RM</div>
                            </button>
                            <button
                                onClick={() => setFilterRole('am')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'am' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-emerald-50 hover:border-emerald-100'}`}
                            >
                                <div className="text-3xl font-bold text-emerald-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'am').length}</div>
                                <div className="text-sm text-gray-600 mt-1">AM</div>
                            </button>
                        </div>
                    );
                }

                if (isMdImpexSelected) {
                    return (
                        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
                            <button
                                onClick={() => setFilterRole('all')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-100'}`}
                            >
                                <div className="text-3xl font-bold text-gray-900">{companyScopedUsers.length}</div>
                                <div className="text-sm text-gray-600 mt-1">Total Members</div>
                            </button>
                            {!isCurrentUserManager && (
                                <button
                                    onClick={() => setFilterRole('md_manager')}
                                    className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'md_manager' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-100'}`}
                                >
                                    <div className="text-3xl font-bold text-indigo-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'md_manager').length}</div>
                                    <div className="text-sm text-gray-600 mt-1">MD Manager</div>
                                </button>
                            )}
                            {!isCurrentUserManager && (
                                <button
                                    onClick={() => setFilterRole('ob_manager')}
                                    className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'ob_manager' ? 'bg-violet-50 border-violet-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-violet-50 hover:border-violet-100'}`}
                                >
                                    <div className="text-3xl font-bold text-violet-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'ob_manager').length}</div>
                                    <div className="text-sm text-gray-600 mt-1">OB Manager</div>
                                </button>
                            )}
                            <button
                                onClick={() => setFilterRole('manager')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'manager' ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-100'}`}
                            >
                                <div className="text-3xl font-bold text-purple-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'manager').length}</div>
                                <div className="text-sm text-gray-600 mt-1">Managers</div>
                            </button>
                            <button
                                onClick={() => setFilterRole('assistant')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'assistant' ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-green-50 hover:border-green-100'}`}
                            >
                                <div className="text-3xl font-bold text-green-700">{companyScopedUsers.filter(u => normalizeRole(u.role) === 'assistant').length}</div>
                                <div className="text-sm text-gray-600 mt-1">Assistants</div>
                            </button>
                        </div>
                    );
                }

                return (
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
                        <button
                            onClick={() => setFilterRole('all')}
                            className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-100'}`}
                        >
                            <div className="text-3xl font-bold text-gray-900">{visibleUsers.length}</div>
                            <div className="text-sm text-gray-600 mt-1">Total Members</div>
                        </button>
                        {!isCurrentUserManager && (
                            <button
                                onClick={() => setFilterRole('md_manager')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'md_manager' ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-indigo-50 hover:border-indigo-100'}`}
                            >
                                <div className="text-3xl font-bold text-indigo-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'md_manager').length}</div>
                                <div className="text-sm text-gray-600 mt-1">MD Manager</div>
                            </button>
                        )}
                        {!isCurrentUserManager && (
                            <button
                                onClick={() => setFilterRole('ob_manager')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'ob_manager' ? 'bg-violet-50 border-violet-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-violet-50 hover:border-violet-100'}`}
                            >
                                <div className="text-3xl font-bold text-violet-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'ob_manager').length}</div>
                                <div className="text-sm text-gray-600 mt-1">OB Manager</div>
                            </button>
                        )}
                        <button
                            onClick={() => setFilterRole('manager')}
                            className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'manager' ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-100'}`}
                        >
                            <div className="text-3xl font-bold text-purple-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'manager').length}</div>
                            <div className="text-sm text-gray-600 mt-1">Managers</div>
                        </button>
                        {isCurrentUserAdmin && (
                            <button
                                onClick={() => setFilterRole('sbm')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'sbm' ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-amber-50 hover:border-amber-100'}`}
                            >
                                <div className="text-3xl font-bold text-amber-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'sbm').length}</div>
                                <div className="text-sm text-gray-600 mt-1">SBM</div>
                            </button>
                        )}
                        {isCurrentUserAdmin && (
                            <button
                                onClick={() => setFilterRole('rm')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'rm' ? 'bg-cyan-50 border-cyan-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-cyan-50 hover:border-cyan-100'}`}
                            >
                                <div className="text-3xl font-bold text-cyan-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'rm').length}</div>
                                <div className="text-sm text-gray-600 mt-1">RM</div>
                            </button>
                        )}
                        {isCurrentUserAdmin && (
                            <button
                                onClick={() => setFilterRole('am')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'am' ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-emerald-50 hover:border-emerald-100'}`}
                            >
                                <div className="text-3xl font-bold text-emerald-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'am').length}</div>
                                <div className="text-sm text-gray-600 mt-1">AM</div>
                            </button>
                        )}
                        <button
                            onClick={() => setFilterRole('assistant')}
                            className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'assistant' ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-green-50 hover:border-green-100'}`}
                        >
                            <div className="text-3xl font-bold text-green-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'assistant').length}</div>
                            <div className="text-sm text-gray-600 mt-1">Assistants</div>
                        </button>
                        {isCurrentUserAdmin && (
                            <button
                                onClick={() => setFilterRole('admin')}
                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'admin' ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-100'}`}
                            >
                                <div className="text-3xl font-bold text-purple-700">
                                    {visibleUsers.filter(u => normalizeRole(u.role) === 'admin').length}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">Admins</div>
                            </button>
                        )}
                    </div>
                );
            })()}

            {/* Search and Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                    <div className="flex-1 max-w-lg">
                        <div className="relative">
                            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="search"
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Search users by name, email, or role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-600">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="name">Name</option>
                                <option value="role">Role</option>
                                <option value="tasks">Tasks</option>
                                <option value="completion">Completion</option>
                            </select>
                        </div>
                        <button
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                            className="p-2 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            {sortOrder === 'asc' ? (
                                <ChevronUp className="h-4 w-4 text-gray-600" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Users List */}
                <div>
                    {filteredAndSortedUsers.length === 0 ? (
                        <div className="text-center py-8">
                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <div className="text-lg font-semibold text-gray-900">No users found</div>
                            <div className="mt-1 text-sm text-gray-600">Try changing the filters or search term</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredAndSortedUsers.map((user) => {
                                const stats = getUserStats(user.id, user.email);
                                const targetId = (user?.id || (user as any)?._id || '').toString();
                                const isSelf = Boolean(currentUserIdValue && targetId && targetId === currentUserIdValue);
                                const chain = getReportingChain(user);
                                const topDownChain = chain.slice().reverse();

                                const shouldShowHierarchy = normalizeRole(user?.role) !== 'assistant';

                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => openUserDetails(user.id)}
                                        className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                {getUserAvatar(user, 'lg')}
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-bold text-gray-900 truncate text-lg">{user.name}</h3>
                                                        <span className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 ${getRoleBadgeColor(user.role)}`}>
                                                            {getRoleIcon(user.role)}
                                                            {user.role || 'User'}
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-sm text-gray-600 flex items-center gap-2 min-w-0">
                                                        <Mail className="h-4 w-4 text-gray-400" />
                                                        <span className="truncate">{user.email}</span>
                                                    </div>
                                                    {(user.department || user.position) && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            {user.department && (
                                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                                                    {user.department}
                                                                </span>
                                                            )}
                                                            {user.position && (
                                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                                                    {user.position}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {shouldShowHierarchy && (
                                                        <div className="mt-3">
                                                            <div className="text-xs font-semibold text-gray-700">Hierarchy</div>
                                                            {topDownChain.length > 0 ? (
                                                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                                                    {topDownChain.map((u, idx) => (
                                                                        <React.Fragment key={(u?.id || u?.email || idx) as any}>
                                                                            {idx > 0 && <ChevronRight className="h-4 w-4 text-gray-300" />}
                                                                            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${getRoleBadgeColor(u?.role || '')}`}>
                                                                                {getRoleIcon(u?.role || '')}
                                                                                <span className="whitespace-nowrap">
                                                                                    {getRoleLabel(u?.role)}
                                                                                </span>
                                                                                <span className="text-gray-700 font-medium">:</span>
                                                                                <span className="whitespace-nowrap font-bold text-gray-900">
                                                                                    {u?.name || ''}
                                                                                </span>
                                                                            </span>
                                                                        </React.Fragment>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="mt-1 text-xs text-gray-500">Unassigned</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium text-gray-600">Total Tasks</div>
                                                <div className="text-xl font-bold text-gray-900">{stats.totalAssigned}</div>
                                            </div>
                                        </div>

                                        {/* Task Stats Grid */}
                                        <div className="grid grid-cols-4 gap-3 mt-5">
                                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                                                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Total</div>
                                                <div className="text-lg font-bold text-gray-900 mt-1">{stats.totalAssigned}</div>
                                            </div>
                                            <div className="text-center p-3 bg-green-50 rounded-lg">
                                                <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Completed</div>
                                                <div className="text-lg font-bold text-gray-900 mt-1">{stats.completed}</div>
                                            </div>
                                            <div className="text-center p-3 bg-amber-50 rounded-lg">
                                                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Pending</div>
                                                <div className="text-lg font-bold text-gray-900 mt-1">{stats.pending}</div>
                                            </div>
                                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                                <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Overdue</div>
                                                <div className="text-lg font-bold text-gray-900 mt-1">{stats.overdue}</div>
                                            </div>
                                        </div>
                                        {/* Edit/Delete Buttons */}
                                        {(canManageUsers || canManageUsersAsManager) && !isSelf && canManageTargetUser(user) && (
                                            <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-gray-100">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleEditClick(user); }}
                                                    className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(user.id); }}
                                                    className="px-4 py-2 text-sm font-medium bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancelDelete} />
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                            <button onClick={handleCancelDelete} className="text-gray-400 hover:text-gray-600" disabled={!!deletingUserId}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="text-sm text-gray-600">
                                Are you sure you want to delete this user?
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={handleCancelDelete}
                                    className="px-4 py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    disabled={!!deletingUserId}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-2.5 text-sm font-medium bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                                    disabled={!!deletingUserId}
                                >
                                    {deletingUserId ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancelEdit} />
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
                            <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600" disabled={!!savingUserId}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={editingUser?.name || ''}
                                    onChange={(e) => setEditingUser(editingUser ? { ...editingUser, name: e.target.value } : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={editingUser?.email || ''}
                                    onChange={(e) => setEditingUser(editingUser ? { ...editingUser, email: e.target.value } : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <select
                                    value={editingUser?.role || 'user'}
                                    onChange={(e) => setEditingUser(editingUser ? { ...editingUser, role: e.target.value } : null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled
                                >
                                    <option value="admin">Admin</option>
                                    <option value="md_manager">MD Manager</option>
                                    <option value="manager">Manager</option>
                                    <option value="assistant">Assistant</option>
                                </select>
                            </div>

                            {editingUser?.role === 'assistant' && (
                                null
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                    <input
                                        type="text"
                                        value={editingUser?.department || ''}
                                        onChange={(e) => setEditingUser(editingUser ? { ...editingUser, department: e.target.value } : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Department"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                                    <input
                                        type="text"
                                        value={editingUser?.position || ''}
                                        onChange={(e) => setEditingUser(editingUser ? { ...editingUser, position: e.target.value } : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Position"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={!!savingUserId}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveEdit}
                                disabled={!!savingUserId}
                                className="px-4 py-2.5 text-sm font-medium bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {savingUserId ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancelAdd} />
                    <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">{isCurrentUserManager ? 'Add Assistant' : 'Add Member'}</h3>
                            <button onClick={handleCancelAdd} className="text-gray-400 hover:text-gray-600" disabled={addingUser}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter full name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Enter email address"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newUser.password}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                                        placeholder="At least 6 characters"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            {!isCurrentUserManager && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                                        <select
                                            value={(newUser.companyName || '').toString()}
                                            onChange={(e) => setNewUser({ ...newUser, companyName: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={companiesLoading || isTeamCompanyForced}
                                        >
                                            <option value="">Select team</option>
                                            {companyOptions.map((name) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => {
                                                const nextRole = e.target.value;
                                                setNewUser({ ...newUser, role: nextRole, managerId: undefined });
                                                setAddAdminId(!isCurrentUserSuperAdmin && currentUserRole === 'admin' ? getUserIdValue(currentUser) : '');
                                                setAddSbmId('');
                                                setAddRmId('');
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={isCurrentUserAdmin ? rolesLoading : false}
                                        >
                                            {roleOptionsForAddModal.map((r) => (
                                                <option key={r.key} value={r.key}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {selectedAddRoleKey === 'sbm' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                                            <select
                                                value={addAdminId}
                                                onChange={(e) => {
                                                    const next = e.target.value;
                                                    setAddAdminId(next);
                                                    setNewUser({ ...newUser, managerId: next || undefined });
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">Select admin</option>
                                                {adminCandidates.map((u) => (
                                                    <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                        {u.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {selectedAddRoleKey === 'rm' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                                                <select
                                                    value={addAdminId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddAdminId(next);
                                                        setAddSbmId('');
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Select admin</option>
                                                    {adminCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">SBM</label>
                                                <select
                                                    value={addSbmId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddSbmId(next);
                                                        setNewUser({ ...newUser, managerId: next || undefined });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Select SBM</option>
                                                    {sbmCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {selectedAddRoleKey === 'am' && (
                                        <>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Admin</label>
                                                <select
                                                    value={addAdminId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddAdminId(next);
                                                        setAddSbmId('');
                                                        setAddRmId('');
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Select admin</option>
                                                    {adminCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">SBM</label>
                                                <select
                                                    value={addSbmId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddSbmId(next);
                                                        setAddRmId('');
                                                        setNewUser({ ...newUser, managerId: undefined });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Select SBM</option>
                                                    {sbmCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">RM</label>
                                                <select
                                                    value={addRmId}
                                                    onChange={(e) => {
                                                        const next = e.target.value;
                                                        setAddRmId(next);
                                                        setNewUser({ ...newUser, managerId: next || undefined });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                >
                                                    <option value="">Select RM</option>
                                                    {rmCandidates.map((u) => (
                                                        <option key={getUserIdValue(u)} value={getUserIdValue(u)}>
                                                            {u.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}

                                    {selectedAddRoleKey === 'assistant' && (
                                        null
                                    )}
                                </>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={handleCancelAdd}
                                className="px-4 py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                disabled={addingUser}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNewUser}
                                className="px-4 py-2.5 text-sm font-medium bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                disabled={addingUser}
                            >
                                {addingUser ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamPage;