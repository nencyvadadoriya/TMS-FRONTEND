import React, { useCallback, useEffect, useMemo, useState, type JSX } from 'react';
import {
    Search,
    Users,
    ChevronDown,
    ChevronUp,
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

const TeamPage: React.FC<TeamPageProps> = (props) => {
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
    }>({
        name: '',
        email: '',
        role: 'assistant',
        password: '',
        department: '',
        position: '',
        phone: '',
        managerId: undefined
    });
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [addingUser, setAddingUser] = useState(false);
    const [filterRole, setFilterRole] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'name' | 'role' | 'tasks' | 'completion'>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [showPassword, setShowPassword] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [, setIsLoadingDetails] = useState(false);

    const openUserDetails = useCallback((userId: string) => {
        setIsLoadingDetails(true);
        // Simulate loading delay for better UX
        setTimeout(() => {
            setSelectedUserId(userId);
            setIsLoadingDetails(false);
        }, 300);
    }, []);

    const currentUserRole = useMemo(() => {
        return (currentUser?.role || '').toLowerCase();
    }, [currentUser]);

    const isCurrentUserAdmin = useMemo(() => {
        return currentUserRole === 'admin';
    }, [currentUserRole]);

    const isCurrentUserManager = useMemo(() => {
        return currentUserRole === 'manager';
    }, [currentUserRole]);

    const canViewTeamPage = useMemo(() => {
        return isCurrentUserAdmin || isCurrentUserManager;
    }, [isCurrentUserAdmin, isCurrentUserManager]);

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

    if (isInitialLoading) {
        return <TeamPageSkeleton />;
    }

    const normalizeRole = useCallback((role: unknown) => {
        return (role || '').toString().trim().toLowerCase();
    }, []);

    const visibleUsers = useMemo(() => {
        if (!canViewTeamPage) return [];
        if (isCurrentUserAdmin) return users;

        if (isCurrentUserManager) {
            const myId = (currentUser?.id || (currentUser as any)?._id || '').toString();
            return users.filter(u => {
                const uid = (u?.id || (u as any)?._id || '').toString();
                if (uid && myId && uid === myId) return true;

                // Managers should be able to see other managers as peers
                if (normalizeRole(u?.role) === 'manager') return true;

                // Keep existing behavior: manager sees their own direct reports
                return (u?.managerId || '').toString() === myId;
            });
        }

        return [];
    }, [canViewTeamPage, currentUser, isCurrentUserAdmin, isCurrentUserManager, users, normalizeRole]);

    // Filter users based on clicked stat
    const getFilteredUsersByRole = useMemo(() => {
        if (filterRole === 'all') return visibleUsers;
         if (filterRole === 'admin') return visibleUsers.filter(u => normalizeRole(u.role) === 'admin'); 
        if (filterRole === 'manager') return visibleUsers.filter(u => normalizeRole(u.role) === 'manager');
        if (filterRole === 'assistant') return visibleUsers.filter(u => normalizeRole(u.role) === 'assistant');
        return visibleUsers;
    }, [visibleUsers, filterRole, normalizeRole]);

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
            case 'admin':
                return 'bg-purple-100 text-purple-800 border border-purple-200';
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
            case 'admin':
                return <Shield className="h-4 w-4" />;
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
        if (!isCurrentUserAdmin) {
            toast.error('Only admins can delete users');
            return;
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
        if (!isCurrentUserAdmin) {
            toast.error('Only admins can edit users');
            return;
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
        if (!canViewTeamPage) {
            toast.error('You do not have permission to add users');
            return;
        }

        const defaultManagerId = isCurrentUserManager ? currentUser.id : undefined;

        setNewUser({
            name: '',
            email: '',
            role: isCurrentUserManager ? 'assistant' : 'user',
            password: '',
            department: '',
            position: '',
            phone: '',
            managerId: defaultManagerId
        });

        setShowPassword(false);
        setShowAddModal(true);
    };

    const handleSaveNewUser = async () => {
        if (!canViewTeamPage) {
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
            const userData = {
                name: newUser.name.trim(),
                email: newUser.email.trim().toLowerCase(),
                password: newUser.password,
                role: isCurrentUserManager ? 'assistant' : newUser.role,
                department: newUser.department || '',
                position: newUser.position || '',
                phone: newUser.phone || '',
                managerId: newUser.managerId
            };
            if (onAddUser) {
                await onAddUser(userData);
            }
            toast.success('User added successfully');
            setShowAddModal(false);
            setNewUser({
                name: '',
                email: '',
                role: isCurrentUserManager ? 'assistant' : 'user',
                password: '',
                department: '',
                position: '',
                phone: '',
                managerId: undefined
            });
            setShowPassword(false);
        } catch (error) {
            console.error('Error adding user:', error);
            toast.error('Failed to add user');
        } finally {
            setAddingUser(false);
        }
    };

    const handleCancelAdd = () => {
        setShowAddModal(false);
        setNewUser({
            name: '',
            email: '',
            role: isCurrentUserManager ? 'assistant' : 'user',
            password: '',
            department: '',
            position: '',
            phone: '',
            managerId: undefined
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

    const getUserAvatar = (user: UserType, size: 'sm' | 'md' | 'lg' = 'md'): JSX.Element => {
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
                    <button
                        onClick={handleAddClick}
                        className="inline-flex items-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                    </button>
                </div>
            </div>

            {/* Stats Cards - Small and Light with Colors */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                    onClick={() => setFilterRole('all')}
                    className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-100'}`}
                >
                    <div className="text-3xl font-bold text-gray-900">{visibleUsers.length}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Members</div>
                </button>
                <button
                    onClick={() => setFilterRole('manager')}
                    className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'manager' ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-100'}`}
                >
                    <div className="text-3xl font-bold text-purple-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'manager').length}</div>
                    <div className="text-sm text-gray-600 mt-1">Managers</div>
                </button>
                <button
                    onClick={() => setFilterRole('assistant')}
                    className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'assistant' ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-green-50 hover:border-green-100'}`}
                >
                    <div className="text-3xl font-bold text-green-700">{visibleUsers.filter(u => normalizeRole(u.role) === 'assistant').length}</div>
                    <div className="text-sm text-gray-600 mt-1">Assistants</div>
                </button>
                <button
                    onClick={() => setFilterRole('admin')}
                    className={`p-5 rounded-xl border text-left transition-all ${filterRole === 'admin' ? 'bg-purple-50 border-purple-200 shadow-sm' : 'bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-100'}`}
                >
                    <div className="text-3xl font-bold text-purple-700">
                        {visibleUsers.filter(u => normalizeRole(u.role) === 'admin').length}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">Admins</div>
                </button>
            </div>

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
                                        {/* Edit/Delete Buttons - Only for Admins */}
                                        {isCurrentUserAdmin && (
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
                                >
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="assistant">Assistant</option>
                                </select>
                            </div>

                            {editingUser?.role === 'assistant' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Manager</label>
                                    <select
                                        value={editingUser?.managerId || ''}
                                        onChange={(e) => setEditingUser(editingUser ? { ...editingUser, managerId: e.target.value || undefined } : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Select a manager</option>
                                        {users.filter(u => u.role === 'manager').map(manager => (
                                            <option key={manager.id} value={manager.id}>
                                                {manager.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                        <select
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="manager">Manager</option>
                                            <option value="assistant">Assistant</option>
                                        </select>
                                    </div>

                                    {newUser.role === 'assistant' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Manager</label>
                                            <select
                                                value={newUser.managerId || ''}
                                                onChange={(e) => setNewUser({ ...newUser, managerId: e.target.value || undefined })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">Select a manager</option>
                                                {users.filter(u => u.role === 'manager').map(manager => (
                                                    <option key={manager.id} value={manager.id}>
                                                        {manager.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
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