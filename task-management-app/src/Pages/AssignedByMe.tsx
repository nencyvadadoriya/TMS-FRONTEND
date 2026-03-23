import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Brand, CommentType, Task, TaskHistory, UserType } from '../Types/Types';
import AllTasksPage from './AllTasksPage';
import { useAppDispatch, useAppSelector } from '../Store/hooks';
import { fetchTasks as fetchTasksThunk, selectAllTasks, selectTasksStatus } from '../Store/tasksSlice';

interface AssignedByMeProps {
  currentUser: UserType;
  users: UserType[];
  brands: Brand[];
  getTaskBorderColor: (task: Task) => string;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  onEditTask?: (task: Task) => void;
  onViewHistory?: (task: Task) => void;
  onOpenComments?: (task: Task) => void;
  onSaveComment: (taskId: string, content: string) => Promise<CommentType>;
  onDeleteComment: (taskId: string, commentId: string) => Promise<void>;
  onFetchTaskComments: (taskId: string) => Promise<CommentType[]>;
  onFetchTaskHistory: (taskId: string) => Promise<TaskHistory[]>;
  onApproveTask: (taskId: string, approve: boolean) => Promise<void>;
  onUpdateTaskApproval: (taskId: string, completedApproval: boolean) => Promise<void>;
  onToggleTaskStatus: (taskId: string, currentStatus: Task['status'], doneByAdmin?: boolean) => Promise<void>;
  advancedFilters?: any;
  onAdvancedFilterChange?: (filterType: string, value: string) => void;
}

const AssignedByMe: React.FC<AssignedByMeProps> = ({
  currentUser,
  users,
  brands,
  getTaskBorderColor,
  formatDate,
  isOverdue,
  onEditTask,
  onSaveComment,
  onDeleteComment,
  onFetchTaskComments,
  onFetchTaskHistory,
  onApproveTask,
  onUpdateTaskApproval,
  onToggleTaskStatus,
  advancedFilters,
  onAdvancedFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const dispatch = useAppDispatch();
  const allTasks = useAppSelector(selectAllTasks);
  const tasksStatus = useAppSelector(selectTasksStatus);

  const effectiveStatusFilter = (advancedFilters?.status ?? statusFilter) as string;
  const effectiveDateFilter = (advancedFilters?.date ?? dateFilter) as string;

  useEffect(() => {
    void dispatch(fetchTasksThunk());
  }, [dispatch]);

  const tasks = useMemo(() => {
    if (!currentUser?.email) return [] as Task[];
    return allTasks.filter((t: Task) => {
      const assignedByEmail = typeof t.assignedBy === 'object' ? t.assignedBy?.email : t.assignedBy;
      return assignedByEmail === currentUser.email;
    });
  }, [allTasks, currentUser?.email]);

  const handleApproveTask = useCallback(async (taskId: string, approve: boolean) => {
    await onApproveTask(taskId, approve);
    void dispatch(fetchTasksThunk({ force: true } as any));
  }, [dispatch, onApproveTask]);

  const handleUpdateTaskApproval = useCallback(async (taskId: string, completedApproval: boolean) => {
    await onUpdateTaskApproval(taskId, completedApproval);
    void dispatch(fetchTasksThunk({ force: true } as any));
  }, [dispatch, onUpdateTaskApproval]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending' || t.status === 'reassigned').length;
    const approvedPending = tasks.filter(t => t.status === 'completed' && !t.completedApproval).length;

    return { total, completed, pending, approvedPending };
  }, [tasks]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (tasksStatus === 'loading' || tasksStatus === 'idle') {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-0 sm:p-6 space-y-4 sm:space-y-6 bg-gray-50 sm:bg-transparent min-h-screen">
      {/* Header - added padding on mobile only */}
      <div className="flex items-center justify-between px-4 sm:px-0 pt-4 sm:pt-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Assigned By Me</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-4 px-4 sm:px-0">
        <div
          onClick={() => {
            if (onAdvancedFilterChange) {
              onAdvancedFilterChange('status', 'completed');
            } else {
              setStatusFilter('completed');
            }
          }}
          className={`bg-white p-3 sm:p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${effectiveStatusFilter === 'completed' ? 'border-green-500 ring-1 ring-green-500' : 'border-gray-100'} flex items-center gap-3 sm:gap-4`}
        >
          <div className="bg-green-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
            <CheckCircle className="h-5 w-5 sm:h-6 sm:h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Completed</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.completed}</h3>
          </div>
        </div>
        <div
          onClick={() => {
            if (onAdvancedFilterChange) {
              onAdvancedFilterChange('status', 'pending');
            } else {
              setStatusFilter('pending');
            }
          }}
          className={`bg-white p-3 sm:p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${effectiveStatusFilter === 'pending' ? 'border-yellow-500 ring-1 ring-yellow-500' : 'border-gray-100'} flex items-center gap-3 sm:gap-4`}
        >
          <div className="bg-yellow-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
            <Clock className="h-5 w-5 sm:h-6 sm:h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Total Pending</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.pending}</h3>
          </div>
        </div>
        <div
          onClick={() => {
            if (onAdvancedFilterChange) {
              onAdvancedFilterChange('status', 'pending-approval');
            } else {
              setStatusFilter('pending-approval');
            }
          }}
          className={`bg-white p-3 sm:p-4 rounded-xl shadow-sm border cursor-pointer transition-all hover:shadow-md ${effectiveStatusFilter === 'pending-approval' ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100'} flex items-center gap-3 sm:gap-4`}
        >
          <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
            <AlertCircle className="h-5 w-5 sm:h-6 sm:h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Pending Approval</p>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.approvedPending}</h3>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white sm:rounded-xl shadow-sm border-y sm:border border-gray-100 overflow-hidden mb-6">
        <div className="p-4 sm:p-4">
          <AllTasksPage
            embedded
            showFiltersInEmbedded
            hideCreateAndBulkActions
            tasks={tasks}
            filter={effectiveStatusFilter}
            setFilter={(value) => {
              if (onAdvancedFilterChange) {
                onAdvancedFilterChange('status', value);
                return;
              }
              setStatusFilter(value);
            }}
            dateFilter={effectiveDateFilter}
            setDateFilter={(value) => {
              if (onAdvancedFilterChange) {
                onAdvancedFilterChange('date', value);
                return;
              }
              setDateFilter(value);
            }}
            assignedFilter={'assigned-by-me'}
            hideAssignBy={true}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            currentUser={currentUser}
            users={users}
            onEditTask={async (taskId: string) => {
              const task = tasks.find((t) => t.id === taskId);
              if (task && onEditTask) onEditTask(task);
              return null;
            }}
            onDeleteTask={async () => undefined}
            formatDate={formatDate}
            isOverdue={isOverdue}
            getTaskBorderColor={getTaskBorderColor}
            openMenuId={openMenuId}
            setOpenMenuId={setOpenMenuId}
            onToggleTaskStatus={onToggleTaskStatus}
            onCreateTask={async () => undefined}
            onReassignTask={async () => undefined}
            onAddTaskHistory={async () => undefined}
            onApproveTask={handleApproveTask}
            onUpdateTaskApproval={handleUpdateTaskApproval}
            onSaveComment={onSaveComment}
            onDeleteComment={onDeleteComment}
            onFetchTaskComments={onFetchTaskComments}
            onFetchTaskHistory={onFetchTaskHistory}
            onBulkCreateTasks={async () => ({ created: [], failures: [] })}
            onMdImpexReassignTask={async () => undefined}
            brands={brands}
            advancedFilters={advancedFilters}
            onAdvancedFilterChange={onAdvancedFilterChange}
            onOpenEditModal={onEditTask ? ((t: Task) => onEditTask(t)) : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default AssignedByMe;
