import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import {

    Search,

    Users,

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

import { userAvatarUrl } from '../utils/avatar';

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

    const [sortBy,] = useState<'name' | 'role' | 'tasks' | 'completion'>('name');

    const [sortOrder,] = useState<'asc' | 'desc'>('asc');

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

        return isCurrentUserManager || isCurrentUserSbm || isCurrentUserRm;

    }, [isCurrentUserManager, isCurrentUserSbm, isCurrentUserRm]);



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

            const isAssistantLike = targetRole === 'assistant'
                || targetRole === 'assistance'
                || targetRole === 'assistence'
                || targetRole === 'assistece'
                || targetRole === 'sub_assistance'
                || targetRole === 'sub_assistence'
                || targetRole === 'sub_assistece'
                || targetRole === 'sub_assist'
                || targetRole === 'sub_assistant'
                || targetRole.includes('assistant');

            if (!isAssistantLike) return false;

            return true;

        }



        if (isCurrentUserManager) {

            const targetRole = normalizeRole(target?.role);

            if (targetRole !== 'assistant') return false;

            return true;

        }



        if (isCurrentUserSbm) {

            const targetRole = normalizeRole(target?.role);

            if (targetRole !== 'rm' && targetRole !== 'am') return false;

            return true;

        }



        if (isCurrentUserRm) {

            const targetRole = normalizeRole(target?.role);

            if (targetRole !== 'am') return false;

            return true;

        }



        return false;

    }, [currentUserIdValue, isCurrentUserAdmin, isCurrentUserMdManager, isCurrentUserObManager, isCurrentUserManager, isCurrentUserRm, isCurrentUserSbm, normalizeRole]);



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



    const getRoleBadgeColor = useCallback((role: unknown) => {

        const r = normalizeRole(role);

        switch (r) {

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

            case 'sbm':

                return 'bg-amber-100 text-amber-800 border border-amber-200';

            case 'rm':

                return 'bg-amber-100 text-amber-800 border border-amber-200';

            case 'am':

                return 'bg-amber-100 text-amber-800 border border-amber-200';

            case 'assistant':

                return 'bg-green-100 text-green-800 border border-green-200';

            case 'sub_assistance':

                return 'bg-green-100 text-green-800 border border-green-200';

            default:

                return 'bg-gray-100 text-gray-800 border border-gray-200';

        }

    }, [normalizeRole]);



    const getRoleIcon = useCallback((role: unknown) => {

        const r = normalizeRole(role);

        if (r === 'super_admin' || r === 'admin') return <Shield className="h-3.5 w-3.5" />;

        if (r === 'md_manager' || r === 'ob_manager' || r === 'manager') return <UserCog className="h-3.5 w-3.5" />;

        if (r === 'sbm' || r === 'rm' || r === 'am') return <Briefcase className="h-3.5 w-3.5" />;

        if (r === 'assistant' || r === 'sub_assistance') return <User className="h-3.5 w-3.5" />;

        return <User className="h-3.5 w-3.5" />;

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



    const companyOptions = useMemo(() => {

        const fromCompanies = (companies || [])

            .map((c) => (c?.name || '').toString().trim())

            .filter(Boolean);

        const fromUsers = (users || [])

            .map((u) => ((u as any)?.companyName || (u as any)?.company || '').toString().trim())

            .filter(Boolean);

        const merged = [...fromCompanies, ...fromUsers];

        const uniq = new Map<string, string>();

        merged.forEach((name) => {

            const key = normalizeText(name);

            if (!key) return;

            if (!uniq.has(key)) uniq.set(key, name);

        });

        return Array.from(uniq.values()).sort((a, b) => a.localeCompare(b));

    }, [companies, normalizeText, users]);



    const isTeamCompanyForced = useMemo(() => {

        if (isCurrentUserAdmin) return false;

        const companyName = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim();

        return Boolean(companyName);

    }, [currentUser, isCurrentUserAdmin]);



    const companyScopedUsers = useMemo(() => {

        const companyKey = normalizeText(filterCompany === 'all' ? '' : filterCompany);

        if (!companyKey) return (users || []);

        return (users || []).filter((u) => normalizeText((u as any)?.companyName || (u as any)?.company || '') === companyKey);

    }, [filterCompany, normalizeText, users]);



    const visibleUsers = useMemo(() => {

        const roleKey = normalizeRole(filterRole);

        if (!roleKey || roleKey === 'all') return companyScopedUsers;

        return companyScopedUsers.filter((u) => normalizeRole(u?.role) === roleKey);

    }, [companyScopedUsers, filterRole, normalizeRole]);



    const getUserStats = useCallback((userId: string, userEmail: string) => {

        const uid = (userId || '').toString();

        const mail = (userEmail || '').toString().trim().toLowerCase();

        const list = Array.isArray(tasks) ? tasks : [];

        let totalAssigned = 0;

        let completed = 0;

        let pending = 0;

        let overdue = 0;

        for (const t of list) {

            const assignedTo: any = (t as any)?.assignedTo;

            let assignedId = '';

            let assignedEmail = '';

            if (typeof assignedTo === 'string') {

                assignedId = assignedTo;

            } else if (assignedTo && typeof assignedTo === 'object') {

                assignedId = (assignedTo?.id || assignedTo?._id || '').toString();

                assignedEmail = (assignedTo?.email || '').toString().trim().toLowerCase();

            }

            if (!assignedEmail) {

                const assignedToUser: any = (t as any)?.assignedToUser;

                if (assignedToUser && typeof assignedToUser === 'object') {

                    assignedEmail = (assignedToUser?.email || '').toString().trim().toLowerCase();

                    if (!assignedId) assignedId = (assignedToUser?.id || assignedToUser?._id || '').toString();

                }

            }

            const matches = (uid && assignedId && assignedId.toString() === uid)

                || (mail && assignedEmail && assignedEmail === mail)

                || (mail && typeof assignedTo === 'string' && assignedTo.toString().trim().toLowerCase() === mail);

            if (!matches) continue;

            totalAssigned += 1;

            const status = ((t as any)?.status || '').toString();

            if (status === 'completed') completed += 1;

            if (status === 'pending') pending += 1;

            if (isOverdue((t as any)?.dueDate, status)) overdue += 1;

        }

        const completion = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

        return { totalAssigned, completed, pending, overdue, completion };

    }, [isOverdue, tasks]);



    const filteredAndSortedUsers = useMemo(() => {

        const term = (searchTerm || '').toString().trim().toLowerCase();

        const base = Array.isArray(visibleUsers) ? visibleUsers : [];

        const filtered = !term

            ? base

            : base.filter((u) => {

                const name = (u?.name || '').toString().toLowerCase();

                const email = (u?.email || '').toString().toLowerCase();

                const role = (u?.role || '').toString().toLowerCase();

                return name.includes(term) || email.includes(term) || role.includes(term);

            });

        const direction = sortOrder === 'asc' ? 1 : -1;

        const sorted = filtered.slice().sort((a, b) => {

            if (sortBy === 'name') {

                return direction * (a.name || '').localeCompare(b.name || '');

            }

            if (sortBy === 'role') {

                return direction * normalizeRole(a.role).localeCompare(normalizeRole(b.role));

            }

            if (sortBy === 'tasks') {

                const sa = getUserStats(a.id, a.email).totalAssigned;

                const sb = getUserStats(b.id, b.email).totalAssigned;

                return direction * (sa - sb);

            }

            if (sortBy === 'completion') {

                const sa = getUserStats(a.id, a.email).completion;

                const sb = getUserStats(b.id, b.email).completion;

                return direction * (sa - sb);

            }

            return 0;

        });

        return sorted;

    }, [getUserStats, normalizeRole, searchTerm, sortBy, sortOrder, visibleUsers]);



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

        const sorted = filtered.sort((a, b) => {

            const ia = order.indexOf(normalizeRole(a.key));

            const ib = order.indexOf(normalizeRole(b.key));

            if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);

            return (a.name || a.key).localeCompare(b.name || b.key);

        });

        return sorted;

    }, [currentUserRole, isCurrentUserAdmin, normalizeRole, availableRoles, canAssignRole]);



    const roleOptionsForAddModal = useMemo(() => {

        const role = normalizeRole(currentUserRole);

        if (isCurrentUserAdmin) return effectiveRoleOptions;

        if (role === 'md_manager') {

            return [
                { key: 'md_manager', name: 'MD Manager' },
                { key: 'ob_manager', name: 'OB Manager' },
                { key: 'assistant', name: 'Assistant' },
                { key: 'sub_assistance', name: 'Sub Assistance' },
            ];

        }

        if (role === 'ob_manager') {

            return [
                { key: 'assistant', name: 'Assistant' },
                { key: 'sub_assistance', name: 'Sub Assistance' },
            ];

        }

        if (role === 'sbm') {

            return [{ key: 'rm', name: 'RM' }, { key: 'am', name: 'AM' }];

        }

        if (role === 'rm') {

            return [{ key: 'am', name: 'AM' }];

        }

        return [{ key: 'assistant', name: 'Assistant' }];

    }, [currentUserRole, effectiveRoleOptions, isCurrentUserAdmin, normalizeRole]);



    const addModalUserPool = useMemo(() => {

        const companyKey = normalizeText((newUser.companyName || '').toString());

        if (!companyKey) return (users || []);

        return (users || []).filter((u) => normalizeText((u as any)?.companyName || (u as any)?.company || '') === companyKey);

    }, [newUser.companyName, normalizeText, users]);



    const adminCandidates = useMemo(() => {

        const admins = (addModalUserPool || []).filter((u) => normalizeRole(u?.role) === 'admin');

        if (!isCurrentUserSuperAdmin && normalizeRole(currentUserRole) === 'admin') {

            const myId = getUserIdValue(currentUser);

            return admins.filter((u) => getUserIdValue(u) === myId);

        }

        return admins;

    }, [addModalUserPool, currentUser, currentUserRole, getUserIdValue, isCurrentUserSuperAdmin, normalizeRole]);



    const sbmCandidates = useMemo(() => {

        return (addModalUserPool || [])

            .filter((u) => normalizeRole(u?.role) === 'sbm')

            .filter((u) => {

                if (!addAdminId) return true;

                return (u as any)?.managerId?.toString() === addAdminId;

            })

            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));

    }, [addAdminId, addModalUserPool, normalizeRole]);



    const rmCandidates = useMemo(() => {

        return (addModalUserPool || [])

            .filter((u) => normalizeRole(u?.role) === 'rm')

            .filter((u) => {

                if (!addSbmId) return true;

                return (u as any)?.managerId?.toString() === addSbmId;

            })

            .sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));

    }, [addModalUserPool, addSbmId, normalizeRole]);



    const handleAddClick = () => {

        if (!canManageUsers && !canManageUsersAsManager) {

            toast.error('You do not have permission to add users');

            return;

        }



        const defaultRole = (() => {

            if (currentUserRole === 'super_admin') return 'admin';

            if (currentUserRole === 'admin') return 'md_manager';

            if (currentUserRole === 'md_manager') return 'ob_manager';

            return 'assistant';

        })();



        const allowedRoleKeys = (roleOptionsForAddModal || []).map((r) => normalizeRole(r.key)).filter(Boolean);

        const defaultNormalized = normalizeRole(defaultRole);

        const initialRole = isCurrentUserManager

            ? 'assistant'

            : (allowedRoleKeys.includes(defaultNormalized)

                ? defaultRole

                : ((roleOptionsForAddModal?.[0]?.key as any) || defaultRole));



        const resolvedDefaultCompany = (() => {

            const fromUser = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();

            if (fromUser) return fromUser;

            if (filterCompany && filterCompany !== 'all') return String(filterCompany).toString().trim();

            return '';

        })();

        const resolvedDefaultCompanyFromOptions = (() => {

            const raw = (resolvedDefaultCompany || '').toString().trim();
            if (!raw) return '';

            const key = normalizeText(raw);
            if (!key) return raw;

            const match = (companyOptions || []).find((name) => normalizeText(name) === key);
            return match || raw;

        })();

        setNewUser({

            name: '',

            email: '',

            role: initialRole,

            password: '',

            department: '',

            position: '',

            phone: '',

            managerId: undefined,

            companyName: (resolvedDefaultCompanyFromOptions as any)

        });



        setAddAdminId(!isCurrentUserSuperAdmin && currentUserRole === 'admin' ? getUserIdValue(currentUser) : '');

        setAddSbmId('');

        setAddRmId('');



        setShowPassword(false);

        setShowAddModal(true);

    };



    useEffect(() => {

        if (!showAddModal) return;

        setNewUser((prev) => {

            const existingRaw = ((prev as any)?.companyName || '').toString().trim();

            const options = Array.isArray(companyOptions) ? companyOptions : [];

            // If user is company-forced and only one option exists, always force it.
            if (isTeamCompanyForced && options.length === 1) {
                const only = (options[0] || '').toString();
                if (only && only !== existingRaw) return { ...prev, companyName: only as any };
                if (only) return prev;
            }

            // If there is already a value, try to reconcile it to an exact option string.
            if (existingRaw) {
                if (options.includes(existingRaw)) return prev;
                const key = normalizeText(existingRaw);
                const match = key ? options.find((name) => normalizeText(name) === key) : '';
                if (match && match !== existingRaw) return { ...prev, companyName: match as any };
                return prev;
            }

            const fromUser = ((currentUser as any)?.companyName || (currentUser as any)?.company || '').toString().trim();
            const raw = fromUser || (filterCompany && filterCompany !== 'all' ? String(filterCompany).toString().trim() : '');
            if (!raw) return prev;

            const key = normalizeText(raw);
            const match = key ? options.find((name) => normalizeText(name) === key) : '';
            const next = match || raw;

            if (!next) return prev;

            return { ...prev, companyName: next as any };

        });

    }, [companyOptions, currentUser, filterCompany, isTeamCompanyForced, normalizeText, showAddModal]);



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



    const handleEditClick = (user: UserType) => {

        if (!canManageUsers && !canManageUsersAsManager) {

            toast.error('You do not have permission to edit users');

            return;

        }

        if (!canManageTargetUser(user)) {

            toast.error('You do not have permission to edit this user');

            return;

        }

        setEditingUser({ ...user });

        setShowEditModal(true);

    };



    const handleCancelEdit = () => {

        if (savingUserId) return;

        setShowEditModal(false);

        setEditingUser(null);

    };



    const handleSaveEdit = async () => {

        if (!editingUser) return;

        if (!canManageUsers && !canManageUsersAsManager) {

            toast.error('You do not have permission to edit users');

            return;

        }

        if (!canManageTargetUser(editingUser)) {

            toast.error('You do not have permission to edit this user');

            return;

        }

        const userId = getUserIdValue(editingUser);

        if (!userId) {

            toast.error('Invalid user');

            return;

        }

        if (!editingUser.name?.trim() || !editingUser.email?.trim()) {

            toast.error('Please fill in all required fields');

            return;

        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(editingUser.email)) {

            toast.error('Please enter a valid email address');

            return;

        }

        setSavingUserId(userId);

        try {

            const payload: Partial<UserType> = {

                name: editingUser.name,

                email: editingUser.email,

                department: editingUser.department,

                position: editingUser.position,

                phone: (editingUser as any)?.phone,

            };

            if (onUpdateUser) {

                await onUpdateUser(userId, payload);

            } else {

                const res = await authService.updateUser(userId, payload);

                if (!(res as any)?.success) {

                    const msg = ((res as any)?.message || (res as any)?.msg || 'Failed to update user').toString();

                    toast.error(msg);

                    return;

                }

            }

            if (!hasExternalUsers) {

                setInternalUsers((prev) => prev.map((u) => {

                    if (getUserIdValue(u) !== userId) return u;

                    return { ...u, ...payload } as UserType;

                }));

            }

            toast.success('User updated successfully');

            setShowEditModal(false);

            setEditingUser(null);

        } catch (error: any) {

            const apiMsg = error?.response?.data?.message || error?.response?.data?.msg;

            const msg = (apiMsg || error?.message || 'Failed to update user').toString();

            toast.error(msg);

        } finally {

            setSavingUserId(null);

        }

    };



    const handleDeleteClick = (userId: string) => {

        if (!canManageUsers && !canManageUsersAsManager) {

            toast.error('You do not have permission to delete users');

            return;

        }

        const target = usersById.get(userId) || usersById.get(String(userId));

        if (target && !canManageTargetUser(target)) {

            toast.error('You do not have permission to delete this user');

            return;

        }

        setUserToDelete(userId);

        setShowDeleteModal(true);

    };



    const handleCancelDelete = () => {

        if (deletingUserId) return;

        setShowDeleteModal(false);

        setUserToDelete(null);

    };



    const handleConfirmDelete = async () => {

        if (!userToDelete) return;

        if (!canManageUsers && !canManageUsersAsManager) {

            toast.error('You do not have permission to delete users');

            return;

        }

        const target = usersById.get(userToDelete) || usersById.get(String(userToDelete));

        if (target && !canManageTargetUser(target)) {

            toast.error('You do not have permission to delete this user');

            return;

        }

        setDeletingUserId(userToDelete);

        try {

            if (onDeleteUser) {

                await onDeleteUser(userToDelete);

            } else {

                const res = await authService.deleteUser(userToDelete);

                if (!(res as any)?.success) {

                    const msg = ((res as any)?.message || (res as any)?.msg || 'Failed to delete user').toString();

                    toast.error(msg);

                    return;

                }

            }

            if (!hasExternalUsers) {

                setInternalUsers((prev) => prev.filter((u) => getUserIdValue(u) !== userToDelete));

            }

            if (selectedUserId === userToDelete) {

                setSelectedUserId(null);

            }

            toast.success('User deleted successfully');

            setShowDeleteModal(false);

            setUserToDelete(null);

        } catch (error: any) {

            const apiMsg = error?.response?.data?.message || error?.response?.data?.msg;

            const msg = (apiMsg || error?.message || 'Failed to delete user').toString();

            toast.error(msg);

        } finally {

            setDeletingUserId(null);

        }

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

        const avatarUrl = userAvatarUrl(user);

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

        if (avatarUrl) {
            const imgSizeClasses = {
                sm: 'h-10 w-10',
                md: 'h-12 w-12',
                lg: 'h-14 w-14'
            };

            return (
                <div className="flex-shrink-0">
                    <img
                        src={avatarUrl}
                        alt={user?.name || 'User'}
                        className={`rounded-full object-cover border border-gray-200 ${imgSizeClasses[size]}`}
                        loading="lazy"
                    />
                </div>
            );
        }

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



    const isInitialLoading = internalUsersLoading || internalTasksLoading || internalCurrentUserLoading;

    if (isInitialLoading) {

        return <TeamPageSkeleton />;

    }

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

                const baseUsers = companyScopedUsers;

                const selectedCompanyKey = normalizeText(filterCompany === 'all' ? '' : filterCompany);
                const speedCompanyKey = normalizeText('Speed Ecom');
                const isSpeedEcomSelected = Boolean(selectedCompanyKey)
                    && (selectedCompanyKey === speedCompanyKey
                        || (selectedCompanyKey.includes('speed') && selectedCompanyKey.includes('ecom')));

                const uniqueKeyForUser = (u: any) => String(u?.id || u?._id || u?.email || '').trim();

                const uniqueUsersMap = new Map<string, UserType>();

                for (const u of baseUsers || []) {

                    const key = uniqueKeyForUser(u);

                    if (!key) continue;

                    if (!uniqueUsersMap.has(key)) uniqueUsersMap.set(key, u);

                }

                const uniqueUsers = Array.from(uniqueUsersMap.values());

                const countByRole = (roleKey: string) => uniqueUsers.filter((u) => normalizeRole((u as any)?.role) === roleKey).length;

                const speedHierarchyRoles = new Set(['sbm', 'rm', 'am']);
                const speedHierarchyUsers = uniqueUsers.filter((u) => speedHierarchyRoles.has(normalizeRole((u as any)?.role)));
                const speedHierarchyUserIds = new Set(speedHierarchyUsers.map((u) => uniqueKeyForUser(u)).filter(Boolean));
                const speedHierarchyCount = Array.from(speedHierarchyUserIds).length;

                const totalCount = isSpeedEcomSelected ? speedHierarchyCount : uniqueUsers.length;

                const roleOrder = ['md_manager', 'ob_manager', 'manager', 'sbm', 'rm', 'am', 'assistant', 'sub_assistance'];

                const roleLabels: Record<string, string> = {
                    md_manager: 'MD Manager',
                    ob_manager: 'OB Manager',
                    manager: 'Managers',
                    sbm: 'SBM',
                    rm: 'RM',
                    am: 'AM',
                    assistant: 'Assistants',
                    sub_assistance: 'Sub Assistance'
                };

                const roleCardClass: Record<string, string> = {
                    md_manager: 'bg-indigo-50 border-indigo-200',
                    ob_manager: 'bg-violet-50 border-violet-200',
                    manager: 'bg-purple-50 border-purple-200',
                    sbm: 'bg-amber-50 border-amber-200',
                    rm: 'bg-cyan-50 border-cyan-200',
                    am: 'bg-emerald-50 border-emerald-200',
                    assistant: 'bg-green-50 border-green-200',
                    sub_assistance: 'bg-green-50 border-green-200'
                };

                const roleTextClass: Record<string, string> = {
                    md_manager: 'text-indigo-700',
                    ob_manager: 'text-violet-700',
                    manager: 'text-purple-700',
                    sbm: 'text-amber-700',
                    rm: 'text-cyan-700',
                    am: 'text-emerald-700',
                    assistant: 'text-green-700',
                    sub_assistance: 'text-green-700'
                };

                const isRoleVisible = (roleKey: string) => {

                    if (isCurrentUserAdmin) return true;

                    if (roleKey === 'md_manager') return isCurrentUserMdManager;

                    if (roleKey === 'ob_manager') return isCurrentUserMdManager || isCurrentUserObManager || isCurrentUserManager;

                    if (roleKey === 'manager') return isCurrentUserMdManager || isCurrentUserObManager || isCurrentUserManager;

                    if (roleKey === 'sbm' || roleKey === 'rm' || roleKey === 'am') return isCurrentUserSbm || isCurrentUserRm || isCurrentUserAm;

                    if (roleKey === 'assistant' || roleKey === 'sub_assistance') return true;

                    return false;

                };

                const rolesToRender = roleOrder
                    .filter((r) => isRoleVisible(r))
                    .filter((r) => countByRole(r) > 0);

                const gridCols = rolesToRender.length + 1;

                const gridClass = gridCols <= 4
                    ? 'grid grid-cols-2 md:grid-cols-4 gap-4'
                    : 'grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4';

                return (

                    <div className={gridClass}>

                        <button

                            onClick={() => setFilterRole('all')}

                            className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-100'}`}

                        >

                            <div className="text-3xl font-bold text-gray-900">{totalCount}</div>

                            <div className="text-sm text-gray-600 mt-1">Total Members</div>

                        </button>

                        {rolesToRender.map((roleKey) => (

                            <button

                                key={roleKey}

                                onClick={() => setFilterRole(roleKey)}

                                className={`p-5 rounded-xl border text-left transition-all ${filterRole === roleKey ? `${roleCardClass[roleKey]} shadow-sm` : `bg-white border-gray-200 hover:${roleCardClass[roleKey]}`}`}

                            >

                                <div className={`text-3xl font-bold ${roleTextClass[roleKey]}`}>{countByRole(roleKey)}</div>

                                <div className="text-sm text-gray-600 mt-1">{roleLabels[roleKey] || roleKey}</div>

                            </button>

                        ))}

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