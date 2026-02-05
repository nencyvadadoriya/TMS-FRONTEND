import React, { useCallback, useMemo, useState } from 'react';
import {
    Search,
    ArrowLeft,
    Calendar,
    History,
    Shield,
    Mail,
    UserCog,
    User,
    Briefcase,
    Activity,
    Edit,
    CheckCircle,
    FileText,
    MessageSquare,
    Tag,
    UserCheck,
} from 'lucide-react';

import type { Task, TaskHistory, UserType } from '../Types/Types';
import toast from 'react-hot-toast';
import { userAvatarUrl } from '../utils/avatar';

interface TeamDetailsPageProps {
    user: UserType;
    tasks: Task[];
    users: UserType[];
    onBack: () => void;
    onEditUser?: (user: UserType) => void;
    onDeleteUser?: (userId: string) => void;
    onFetchTaskHistory?: (taskId: string) => Promise<TaskHistory[]>;
    isOverdue?: (dueDate: string, status: string) => boolean;
    currentUser?: UserType;
}

const TeamDetailsPage: React.FC<TeamDetailsPageProps> = ({
    user,
    tasks = [],
    users = [],
    onBack,
    onFetchTaskHistory,
    isOverdue = () => false,
}) => {
    const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');
    const [detailsTab, setDetailsTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
    const [taskSearch, setTaskSearch] = useState('');
    const [historyByTaskId, setHistoryByTaskId] = useState<Record<string, TaskHistory[]>>({});
    const [historyLoadingByTaskId, setHistoryLoadingByTaskId] = useState<Record<string, boolean>>({});
    const [, setEmailHistory] = useState<any[]>([]);
    const [, setLoadingEmailHistory] = useState(false);
    const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<string | null>(null);
    // Get tasks for this user
    const getTasksForUser = useMemo(() => {
        return (userId: string, userEmail: string) => {
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
        };
    }, [tasks]);

    // Get tasks created by this user
    const getTasksCreatedByUser = useMemo(() => {
        return (userId: string, userEmail: string) => {
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
        };
    }, [tasks]);

    // Get all tasks for this user
    const allTasks = useMemo(() => {
        return getTasksForUser(user.id, user.email);
    }, [getTasksForUser, user]);

    // Get user stats
    const getUserStats = useMemo(() => {
        const assignedTasks = allTasks;
        const createdTasks = getTasksCreatedByUser(user.id, user.email);

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
    }, [allTasks, getTasksCreatedByUser, user, isOverdue]);

    // Resolve user label for display
    const resolveUserLabel = useCallback((value: any): string => {
        if (!value) return 'Unknown';
        if (typeof value === 'string') {
            if (value.includes('@')) return value;
            const u = users.find(x => x.id === value || (x as any)._id === value || x.email === value);
            return u?.email || u?.name || value;
        }
        if (typeof value === 'object') {
            return value.email || value.name || value.id || value._id || 'Unknown';
        }
        return 'Unknown';
    }, [users]);

    // Get specific task history (when a task is selected)
    const selectedTaskHistory = useMemo(() => {
        if (!selectedTaskForHistory) return [];

        const task = allTasks.find(t => t.id === selectedTaskForHistory);
        if (!task) return [];

        const taskHistory: any[] = [];

        // Derived overdue timeline item
        try {
            const due = new Date(task.dueDate);
            const now = new Date();
            const isOverdue = task.status !== 'completed' && !Number.isNaN(due.getTime()) && due < now;
            if (isOverdue) {
                const overdueDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                const msg = (task.message || task.description || '').toString().trim();
                taskHistory.push({
                    id: `task-overdue-${task.id}`,
                    action: 'overdue',
                    description: `Task is overdue (Due: ${due.toLocaleDateString()} • ${overdueDays} day${overdueDays === 1 ? '' : 's'} late)${msg ? ` • ${msg}` : ''}`,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskStatus: task.status,
                    userName: 'System',
                    timestamp: task.dueDate,
                });
            }
        } catch {
            // ignore
        }

        // Add REAL task history only (from backend)
        const rawExistingHistory = historyByTaskId[selectedTaskForHistory] || (task as any).history || [];
        const existingHistory = Array.isArray(rawExistingHistory) ? rawExistingHistory : [];

        taskHistory.push(
            ...existingHistory
                .map((hist: any, idx: number) => {
                    const timestamp = hist?.timestamp || hist?.createdAt || hist?.updatedAt;
                    const action = (hist?.action || '').toString().trim();
                    const message = (hist?.message || hist?.description || '').toString().trim();

                    const userName =
                        (hist?.userName || hist?.user?.userName || hist?.user?.name || '').toString().trim();
                    const userEmail =
                        (hist?.userEmail || hist?.user?.userEmail || hist?.user?.email || '').toString().trim();
                    const userRole =
                        (hist?.userRole || hist?.user?.userRole || hist?.user?.role || '').toString().trim();

                    return {
                        ...hist,
                        id: (hist?.id || hist?._id || `history-${task.id}-${idx}`).toString(),
                        action,
                        description: message,
                        userName,
                        userEmail,
                        userRole,
                        timestamp,
                        taskId: task.id,
                        taskTitle: task.title,
                        taskStatus: task.status,
                    };
                })
                .filter((x: any) => {
                    if (!x?.action) return false;
                    if (!x?.timestamp) return false;
                    if (!x?.description) return false;
                    const d = new Date(x.timestamp);
                    if (Number.isNaN(d.getTime())) return false;
                    return true;
                })
        );

        return taskHistory.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [selectedTaskForHistory, allTasks, historyByTaskId, resolveUserLabel]);

    // Load task history
    const loadTaskHistory = useCallback(async (taskId: string) => {
        if (!onFetchTaskHistory) {
            toast.error('History is not available');
            return;
        }

        if (historyByTaskId[taskId]) {
            setSelectedTaskForHistory(taskId);
            setActiveTab('history');
            return;
        }

        if (historyLoadingByTaskId[taskId]) return;

        setHistoryLoadingByTaskId(prev => ({ ...prev, [taskId]: true }));
        try {
            const history = await onFetchTaskHistory(taskId);
            setHistoryByTaskId(prev => ({ ...prev, [taskId]: history }));
            setSelectedTaskForHistory(taskId);
            setActiveTab('history');
        } catch (error) {
            console.error('Error fetching task history:', error);
            toast.error('Failed to load task history');
        } finally {
            setHistoryLoadingByTaskId(prev => ({ ...prev, [taskId]: false }));
        }
    }, [historyByTaskId, historyLoadingByTaskId, onFetchTaskHistory]);

    // Load email history (mock implementation)
    const loadEmailHistory = useCallback(async () => {
        setLoadingEmailHistory(true);
        try {
            // Mock email history - in real implementation, this would fetch from API
            const mockEmailHistory = [
                {
                    id: '1',
                    type: 'task_assignment',
                    subject: 'New Task Assigned: Website Redesign',
                    recipient: user.email,
                    sender: 'system@company.com',
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'delivered',
                    preview: 'You have been assigned a new task: Website Redesign...'
                },
                {
                    id: '2',
                    type: 'task_reminder',
                    subject: 'Reminder: Task Due Tomorrow',
                    recipient: user.email,
                    sender: 'system@company.com',
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'delivered',
                    preview: 'Your task "Mobile App Development" is due tomorrow...'
                },
                {
                    id: '3',
                    type: 'task_completed',
                    subject: 'Task Completed: Database Migration',
                    recipient: user.email,
                    sender: 'system@company.com',
                    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    status: 'delivered',
                    preview: 'Great job! You have completed the Database Migration task...'
                }
            ];
            setEmailHistory(mockEmailHistory);
        } catch (error) {
            console.error('Error fetching email history:', error);
            toast.error('Failed to load email history');
        } finally {
            setLoadingEmailHistory(false);
        }
    }, [user.email]);

    // Load email history on component mount
    React.useEffect(() => {
        loadEmailHistory();
    }, [loadEmailHistory]);

    // Filter and sort tasks
    const filteredTasks = allTasks
        .filter(t => {
            const term = taskSearch.trim().toLowerCase();
            if (!term) return true;
            const title = (t.title || '').toString().toLowerCase();
            const msg = ((t as any).message || (t as any).description || '').toString().toLowerCase();
            const company = ((t as any).company || (t as any).companyName || '').toString().toLowerCase();
            const brand = ((t as any).brand || '').toString().toLowerCase();
            const type = ((t as any).taskType || (t as any).type || '').toString().toLowerCase();
            return title.includes(term) || msg.includes(term) || company.includes(term) || brand.includes(term) || type.includes(term);
        })
        .filter(t => {
            const status = (t.status || '').toString().toLowerCase();
            const overdue = isOverdue(t.dueDate, t.status);
            if (detailsTab === 'all') return true;
            if (detailsTab === 'completed') return status === 'completed';
            if (detailsTab === 'overdue') return overdue;
            return status === 'pending' || status === 'in-progress';
        })
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Get role badge color
    const getRoleBadgeColor = (role: string) => {
        switch (role?.toLowerCase()) {
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
        switch (role?.toLowerCase()) {
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

    // Get action icon
    const getActionIcon = useCallback((action: string) => {
        switch (action) {
            case 'task_created': return <FileText className="h-4 w-4" />;
            case 'task_completed': return <CheckCircle className="h-4 w-4" />;
            case 'task_updated': return <Edit className="h-4 w-4" />;
            case 'status_changed': return <Activity className="h-4 w-4" />;
            case 'comment_added': return <MessageSquare className="h-4 w-4" />;
            default: return <Activity className="h-4 w-4" />;
        }
    }, []);

    // Format date time safe
    const formatDateTimeSafe = useCallback((value: any): string => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        const datePart = d.toLocaleDateString();
        const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${datePart} at ${timePart}`;
    }, []);

    // Get actor label
    const getActorLabel = useCallback((item: any): string => {
        const name = (item?.userName || '').toString().trim();
        if (name) return name;
        const email = (item?.userEmail || '').toString().trim();
        if (email) return email;
        const nestedName = (item?.user?.userName || item?.user?.name || '').toString().trim();
        if (nestedName) return nestedName;
        const nestedEmail = (item?.user?.userEmail || item?.user?.email || '').toString().trim();
        if (nestedEmail) return nestedEmail;
        const userId = (item?.userId || '').toString().trim();
        if (userId) return userId;
        return 'System';
    }, []);

    // Get action label
    const getActionLabel = useCallback((action: any): string => {
        const a = (action || '').toString().trim();
        if (!a) return '';
        return a.replace(/_/g, ' ');
    }, []);

    const formatDateDMY = useCallback((value: any): string => {
        if (!value) return '';
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-GB');
    }, []);

    // Get status color
    const getStatusColor = useCallback((status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800 border-green-200';
            case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }, []);

    // Get priority color
    const getPriorityColor = useCallback((priority: string | undefined) => {
        switch (priority) {
            case 'high': return 'bg-red-100 text-red-800 border-red-200';
            case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200'; // default for undefined
        }
    }, []);

    // Get assigned to name
    const getAssignedToName = useCallback((task: Task): string => {
        if (task.assignedToUser?.name) {
            return task.assignedToUser.name;
        }

        if (typeof task.assignedTo === 'object' && task.assignedTo !== null) {
            return (task.assignedTo as any).name || 'Unknown';
        }

        if (typeof task.assignedTo === 'string') {
            const user = users.find(u => u.email === task.assignedTo || u.id === task.assignedTo);
            if (user) return user.name;
            return task.assignedTo?.split('@')[0] || 'Unknown';
        }

        return 'Unknown';
    }, [users]);

    // Get assigned by name
    const getAssignedByName = useCallback((task: Task): string => {
        if ((task as any).assignedByName) {
            return (task as any).assignedByName;
        }

        if (typeof task.assignedBy === 'object' && task.assignedBy !== null) {
            return (task.assignedBy as any).name || 'Unknown';
        }

        if (typeof task.assignedBy === 'string') {
            const user = users.find(u => u.email === task.assignedBy || u.id === task.assignedBy);
            if (user) return user.name;
            return task.assignedBy?.split('@')[0] || 'Unknown';
        }

        return 'Unknown';
    }, [users]);

    // Get user initials
    const getUserInitials = (name: string | undefined): string => {
        if (!name) return 'U';
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
        }
        return name.charAt(0).toUpperCase();
    };

    // Get user avatar
    const getUserAvatar = (user: UserType, size: 'sm' | 'md' | 'lg' = 'md') => {
        const initials = getUserInitials(user.name);
        const avatarUrl = userAvatarUrl(user);

        let gradient = 'from-gray-600 to-gray-800';
        switch (user.role?.toLowerCase()) {
            case 'admin':
                gradient = 'from-purple-600 to-purple-800';

                break;
            case 'manager':
                gradient = 'from-blue-600 to-blue-800';
                break;
            case 'assistant':
            case 'developer':
                gradient = 'from-green-600 to-green-800';
                break;
            case 'designer':
                gradient = 'from-pink-600 to-pink-800';
                break;
        }

        const sizeClasses = {
            sm: 'h-10 w-10 text-base',
            md: 'h-14 w-14 text-lg',
            lg: 'h-16 w-16 text-xl'
        };

        return (
            <div className="flex-shrink-0">
                <div className={`rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold ${sizeClasses[size]} overflow-hidden`}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={user?.name || 'User'}
                            className="h-full w-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        initials
                    )}
                </div>
            </div>
        );
    };

    const stats = getUserStats;
    const reportingToName =
        user.role?.toLowerCase() === 'assistant'
            ? user.managerId
                ? (users.find(m => m.id === user.managerId || (m as any)._id === user.managerId)?.name || 'Unknown Manager')
                : 'Unassigned'
            : '';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <button
                    onClick={onBack}
                    className="inline-flex items-center px-4 py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Team
                </button>
            </div>

            {/* User Profile Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex items-center gap-4 min-w-0">
                        {getUserAvatar(user)}
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
                                <span className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 ${getRoleBadgeColor(user.role)}`}>
                                    {getRoleIcon(user.role)}
                                    {user.role || 'User'}
                                </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600 flex items-center gap-2 min-w-0">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            {reportingToName && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                    <div className="text-xs text-blue-600 mb-1">Reporting to:</div>
                                    <div className="text-sm font-medium text-gray-900">{reportingToName}</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-600">Tasks Created</div>
                        <div className="text-lg font-bold text-gray-900">{stats.tasksCreated}</div>
                    </div>
                </div>

                {/* Task Stats Cards - Clickable */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <button
                        onClick={() => setDetailsTab('all')}
                        className={`bg-blue-50 rounded-xl p-4 border text-left transition-all ${detailsTab === 'all' ? 'border-blue-300 shadow-sm' : 'border-blue-100 hover:border-blue-200'}`}
                    >
                        <div className="text-xs font-medium text-blue-700">Total Tasks</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalAssigned}</div>
                    </button>
                    <button
                        onClick={() => setDetailsTab('completed')}
                        className={`bg-green-50 rounded-xl p-4 border text-left transition-all ${detailsTab === 'completed' ? 'border-green-300 shadow-sm' : 'border-green-100 hover:border-green-200'}`}
                    >
                        <div className="text-xs font-medium text-green-700">Completed</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{stats.completed}</div>
                    </button>
                    <button
                        onClick={() => setDetailsTab('pending')}
                        className={`bg-amber-50 rounded-xl p-4 border text-left transition-all ${detailsTab === 'pending' ? 'border-amber-300 shadow-sm' : 'border-amber-100 hover:border-amber-200'}`}
                    >
                        <div className="text-xs font-medium text-amber-700">Pending</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</div>
                    </button>
                    <button
                        onClick={() => setDetailsTab('overdue')}
                        className={`bg-red-50 rounded-xl p-4 border text-left transition-all ${detailsTab === 'overdue' ? 'border-red-300 shadow-sm' : 'border-red-100 hover:border-red-200'}`}
                    >
                        <div className="text-xs font-medium text-red-700">Overdue</div>
                        <div className="text-2xl font-bold text-gray-900 mt-1">{stats.overdue}</div>
                    </button>
                </div>
            </div>

            {/* Tasks Section - Updated to show active tab */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="p-6">
                    {activeTab === 'tasks' ? (
                        <div className="w-full">
                            {/* Filters Section */}
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
                                <div className="flex-1 max-w-lg">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search tasks..."
                                            value={taskSearch}
                                            onChange={(e) => setTaskSearch(e.target.value)}
                                            className="pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tasks Grid */}
                            {filteredTasks.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {filteredTasks.map((task) => (
                                        <div
                                            key={task.id}
                                            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900 mb-2 text-lg line-clamp-1">{task.title}</h3>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => loadTaskHistory(task.id)}
                                                        className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="View History"
                                                    >
                                                        <History className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mb-5">
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(task.status)}`}>
                                                    {task.status}
                                                </span>
                                                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getPriorityColor(task.priority || 'low')}`}>
                                                    {task.priority}
                                                </span>
                                                {task.taskType && (
                                                    <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 flex items-center gap-1">
                                                        <Tag className="h-3 w-3" />
                                                        {task.taskType}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-auto pt-4 border-t border-gray-100">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                                        <UserCheck className="h-4 w-4" />
                                                        <span className="font-medium">{getAssignedToName(task)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
                                    <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-medium text-gray-900 mb-2">No tasks found</h3>
                                    <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
                                    <button
                                        onClick={() => {
                                            setTaskSearch('');
                                            setDetailsTab('all');
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Clear All Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // History Tab - Full Width History View
                        <div>
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-900">
                                            Task History
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {selectedTaskForHistory
                                                ? `Complete history for "${allTasks.find(t => t.id === selectedTaskForHistory)?.title || 'selected task'}"`
                                                : 'Select a task to view its complete history'
                                            }
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {selectedTaskForHistory && (
                                            <button
                                                onClick={() => setActiveTab('tasks')}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                                            >
                                                <ArrowLeft className="h-4 w-4" />
                                                Back to Tasks
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6">
                                {selectedTaskForHistory ? (
                                    <>
                                        {/* Task Details Card */}
                                        {(() => {
                                            const task = allTasks.find(t => t.id === selectedTaskForHistory);
                                            if (!task) return null;

                                            // Calculate overdue days
                                            const now = new Date();
                                            const dueDate = new Date(task.dueDate);
                                            const isOverdue = task.status !== 'completed' && dueDate < now;
                                             isOverdue ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

                                            // Calculate time taken if completed
                                            const createdTime = task.createdAt ? new Date(task.createdAt).getTime() : null;
                                            void createdTime;

                                            return (
                                                <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Task Basic Info */}
                                                    <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                            <FileText className="h-5 w-5 text-blue-600" />
                                                            Task Information
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Task Title:</span>
                                                                <span className="text-sm font-medium text-gray-900">{task.title}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Task Type:</span>
                                                                <span className="text-sm font-medium text-gray-900">{task.taskType || 'Not specified'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Brand:</span>
                                                                <span className="text-sm font-medium text-gray-900">{(task as any).brand || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Company:</span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {(task as any).companyName || (task as any).company || 'N/A'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Task Status & Timing */}
                                                    <div className="bg-green-50 p-5 rounded-xl border border-green-100">
                                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                            <Calendar className="h-5 w-5 text-green-600" />
                                                            Status & Timing
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Current Status:</span>
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                                                                    {task.status}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Priority:</span>
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                                    {task.priority}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Created On:</span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {task.createdAt ? new Date(task.createdAt).toLocaleString() : 'Unknown'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Last Updated:</span>
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {task.updatedAt ? new Date(task.updatedAt).toLocaleString() : 'Never'}
                                                                </span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Due Date:</span>
                                                                <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                                                    {formatDateDMY(task.dueDate) || ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* People Involved */}
                                                    <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
                                                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                                            <UserCheck className="h-5 w-5 text-purple-600" />
                                                            People Involved
                                                        </h4>
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Assigned By:</span>
                                                                <span className="text-sm font-medium text-gray-900">{getAssignedByName(task)}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className="text-sm text-gray-600">Assigned To:</span>
                                                                <span className="text-sm font-medium text-gray-900">{getAssignedToName(task)}</span>
                                                            </div>
                                                            {task.status === 'completed' && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-sm text-gray-600">Completed By:</span>
                                                                    <span className="text-sm font-medium text-gray-900">{getAssignedToName(task)}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {/* Activity Timeline Header */}
                                        <div className="mb-6 flex items-center justify-between">
                                            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                                <History className="h-5 w-5" />
                                                Activity Timeline
                                            </h4>
                                            <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                                                {selectedTaskHistory.length} {selectedTaskHistory.length === 1 ? 'activity' : 'activities'}
                                            </div>
                                        </div>

                                        {/* Task History List */}
                                        <div className="space-y-6">
                                            {selectedTaskHistory.length > 0 ? (
                                                selectedTaskHistory.map((item, index) => (
                                                    <div key={`${item.id}-${index}`} className="relative pb-6 pl-10">
                                                        <div className="absolute left-4 top-3 h-6 w-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center">
                                                            {getActionIcon(item.action)}
                                                        </div>
                                                        {index < selectedTaskHistory.length - 1 && (
                                                            <div className="absolute left-[27px] top-9 bottom-0 w-0.5 bg-gray-200"></div>
                                                        )}

                                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-medium text-gray-900">{getActorLabel(item)}</span>
                                                                        {getActionLabel(item?.action) && (
                                                                            <>
                                                                                <span className="text-xs text-gray-500">•</span>
                                                                                <div className={`px-2 py-1 rounded text-xs font-medium ${item.action === 'task_created' ? 'bg-green-100 text-green-600' : item.action === 'task_completed' ? 'bg-blue-100 text-blue-600' : item.action === 'overdue' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                                    {getActionLabel(item?.action)}
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {formatDateTimeSafe(item?.timestamp) && (
                                                                        <>
                                                                            <Calendar className="h-3 w-3 text-gray-400" />
                                                                            <span className="text-xs text-gray-500">
                                                                                {formatDateTimeSafe(item?.timestamp)}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {item.description && (
                                                                <p className="text-sm text-gray-700 mb-3">{item.description}</p>
                                                            )}
                                                            {item.action === 'task_completed' && (
                                                                <div className="text-xs text-green-600 mt-2 font-medium">
                                                                    ✓ Task was marked as completed
                                                                </div>
                                                            )}
                                                            {item.action === 'status_changed' && (
                                                                <div className="text-xs text-blue-600 mt-2">
                                                                    Status changed by {item.userName}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-12">
                                                    <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                                    <h4 className="text-lg font-medium text-gray-900 mb-2">No activity history</h4>
                                                    <p className="text-gray-500">This task doesn't have any recorded activity yet</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    /* No Task Selected State */
                                    <div className="text-center py-16">
                                        <History className="h-20 w-20 text-gray-300 mx-auto mb-6" />
                                        <h4 className="text-xl font-medium text-gray-900 mb-3">No Task Selected</h4>
                                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                                            Click on the "View History" button on any task to see its complete history including timeline, people involved, and status details
                                        </p>
                                        <button
                                            onClick={() => setActiveTab('tasks')}
                                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                            Back to Tasks
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamDetailsPage;