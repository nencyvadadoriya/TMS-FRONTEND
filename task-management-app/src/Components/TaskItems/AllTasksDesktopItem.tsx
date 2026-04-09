import React, { memo, useMemo } from 'react';
import { Clock, UserPlus, MessageSquare, History, Edit, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import type { Task, UserType, Brand } from '../../Types/Types';

interface DesktopTaskItemProps {
  index: number;
  task: Task;
  isToggling: boolean;
  currentUser: UserType;
  formatDate: (date: string) => string;
  isOverdue: (dueDate: string, status: string) => boolean;
  getTaskStatusIcon: (taskId: string, isCompleted: boolean) => React.ReactNode;
  getUserInfoForDisplay: (userId: any) => { name: string; email: string };
  brandLabel?: string;
  brands?: Brand[];
  onToggleStatus: (taskId: string, originalTask: Task) => Promise<void>;
  onEditTaskClick: (task: Task) => void;
  onOpenCommentSidebar: (task: Task) => Promise<void>;
  onOpenHistoryModal: (task: Task) => Promise<void>;
  onDeleteTask?: (taskId: string) => Promise<void>;
  isTaskCompleted: (taskId: string) => boolean;
  isTaskPermanentlyApproved: (taskId: string) => boolean;
  isTaskAssignee: (task: Task) => boolean;
  isTaskAssigner: (task: Task) => boolean;
  canEditTask?: (task: Task) => boolean;
  onPermanentApproval: (taskId: string, value: boolean) => Promise<void>;
  isUpdatingApproval: boolean;
  showAssignButton?: boolean;
  onAssignClick?: (task: Task) => void;
  disableStatusToggle?: boolean;
  hasUnreadComments?: (taskId: string) => boolean;
  hideAssignBy?: boolean;
  assignedFilter?: string;
}

const DesktopTaskItem = memo(({
  index,
  task,
  isToggling,
  currentUser,
  formatDate,
  isOverdue,
  getTaskStatusIcon,
  getUserInfoForDisplay,
  brandLabel,
  brands,
  onToggleStatus,
  onEditTaskClick,
  onOpenCommentSidebar,
  onOpenHistoryModal,
  onDeleteTask,
  showAssignButton,
  onAssignClick,
  isTaskCompleted,
  isTaskPermanentlyApproved,
  isTaskAssigner,
  canEditTask,
  onPermanentApproval,
  isUpdatingApproval,
  disableStatusToggle,
  hasUnreadComments,
  hideAssignBy,
  assignedFilter
}: DesktopTaskItemProps) => {

  const userInfo = getUserInfoForDisplay(task);
  const assignerInfo = useMemo(() => {
    const assignedByUser: any = (task as any)?.assignedByUser;
    const assignedBy: any = (task as any)?.assignedBy;

    const email = (assignedByUser?.email || (typeof assignedBy === 'string' ? assignedBy : assignedBy?.email) || '').toString();
    const name = (assignedByUser?.name || (typeof assignedBy === 'object' ? assignedBy?.name : '') || '').toString();
    const displayName = (name || (email ? email.split('@')[0] : '') || '').toString();

    return {
      name: displayName || email || '—',
      email: email || ''
    };
  }, [task]);
  
  const isCompleted = isTaskCompleted(task.id);
  const isPermanentlyApproved = isTaskPermanentlyApproved(task.id);
  const userIsAssigner = isTaskAssigner(task);
  const canEditThisTask = typeof canEditTask === 'function' ? canEditTask(task) : userIsAssigner;
  const role = String((currentUser as any)?.role || '').trim().toLowerCase();

  const normalizeEmailSafe = (v: unknown): string => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim().toLowerCase();
    if (typeof v === 'object' && v !== null) {
      const email = (v as any).email;
      if (typeof email === 'string') return email.trim().toLowerCase();
    }
    return String(v).trim().toLowerCase();
  };

  const myEmail = normalizeEmailSafe((currentUser as any)?.email);
  const assignedByEmailForCheck =
    normalizeEmailSafe((task as any)?.assignedBy) ||
    normalizeEmailSafe((task as any)?.assignedByUser?.email);
  const isCreator = Boolean(myEmail && assignedByEmailForCheck && myEmail === assignedByEmailForCheck);

  const canDeleteThisTask = (role === 'admin' || role === 'super_admin' || role === 'manager' || role === 'marketer_manager' || role === 'md_manager' || role === 'ob_manager') && userIsAssigner;

  const canShowEditIcon = Boolean(canEditThisTask || isCreator);
  const canShowDeleteIcon = Boolean(canDeleteThisTask);
  const isOverdueTask = isOverdue(task.dueDate, task.status);
  const statusKey = String(task.status || '').trim().toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
  const isReassignedTask = statusKey === 'reassigned';
  const isInProgressTask = statusKey === 'in-progress';

  const createdAtRaw = (task as any)?.createdAt || (task as any)?.created_at || (task as any)?.timestamp || (task as any)?.createdOn || '';
  const createdAtText = (() => {
    try {
      if (!createdAtRaw) return '—';
      const asDate = new Date(createdAtRaw);
      if (!Number.isFinite(asDate.getTime())) return '—';
      return asDate.toLocaleString();
    } catch {
      return '—';
    }
  })();

  const brandLabelText = useMemo(() => {
    if (brandLabel) return String(brandLabel || '');

    const taskBrandId = (task as any)?.brandId;
    const taskBrandRaw = (task.brand || '').toString();
    const taskBrandKey = taskBrandRaw.trim().toLowerCase();

    const list = brands || [];
    if (!list.length) return taskBrandRaw;

    if (taskBrandId != null && String(taskBrandId).trim()) {
      const idKey = String(taskBrandId).trim();
      const byId = list.find((b) => String((b as any)?._id || (b as any)?.id || '').trim() === idKey);
      if (byId?.name) return String(byId.name);
    }

    if (taskBrandKey) {
      const byName = list.find((b) => String((b as any)?.name || '').trim().toLowerCase() === taskBrandKey);
      if (byName?.name) return String(byName.name);
    }

    return taskBrandRaw;
  }, [brandLabel, brands, task]);

  return (
    <div className={`relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 mb-2 overflow-hidden`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${isCompleted ? 'bg-green-500' :
        isOverdueTask ? 'bg-red-500' :
          isInProgressTask ? 'bg-orange-500' :
            'bg-blue-400'
        }`} />

      <div className="grid grid-cols-11 gap-0.5 p-2.5 items-center pl-2">
        <div className="col-span-1 flex items-center justify-center gap-1">
          <span className="text-xs font-semibold text-[#1e3a8a] tabular-nums w-4 text-right">
            {index}
          </span>
          {disableStatusToggle ? (
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center ${isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}
              title={isCompleted ? 'Completed' : 'Pending'}
            >
              {getTaskStatusIcon(task.id, isCompleted)}
            </div>
          ) : (
            <button
              onClick={() => onToggleStatus(task.id, task)}
              disabled={isToggling}
              className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${isCompleted
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-[#1e3a8a]'
                } disabled:opacity-50`}
              title={isCompleted ? 'Mark as pending' : 'Mark as completed'}
            >
              {getTaskStatusIcon(task.id, isCompleted)}
            </button>
          )}
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <span className="text-[10px] font-medium text-[#1e3a8a] px-2 py-0.5 bg-blue-50 rounded-md truncate max-w-[85px] text-center" title={brandLabelText}>
            {brandLabelText || "—"}
          </span>
        </div>

        <div className={hideAssignBy ? "col-span-3 min-w-0" : "col-span-2 min-w-0"}>
          <div className="flex flex-col gap-0.5">
            <h3 className="font-semibold text-gray-900 text-xs leading-tight break-words" title={task.title}>
              {task.title}
            </h3>
            <div className="flex items-center gap-1">
              {isOverdueTask && !isCompleted && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                  <Clock className="h-2.5 w-2.5" />
                  Overdue
                </span>
              )}
              {isReassignedTask && !isCompleted && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                  <UserPlus className="h-2.5 w-2.5" />
                  Reassigned
                </span>
              )}
            </div>
          </div>
        </div>

        {assignedFilter !== 'assigned-to-me' && (
          <div className="col-span-1 min-w-0 flex items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <span className="text-[9px] font-semibold text-[#1e3a8a]">
                  {userInfo.name ? userInfo.name.charAt(0).toUpperCase() : '—'}
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-700 truncate max-w-[50px]" title={userInfo.email}>
                {userInfo.name || '—'}
              </span>
            </div>
          </div>
        )}

        {!hideAssignBy && (
          <div className="col-span-1 min-w-0 flex items-center justify-center">
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center border border-gray-300 shrink-0">
                <span className="text-[9px] font-semibold text-gray-700">
                  {assignerInfo.name ? assignerInfo.name.charAt(0).toUpperCase() : '—'}
                </span>
              </div>
              <span className="text-[10px] font-medium text-gray-600 truncate max-w-[50px]" title={assignerInfo.email}>
                {assignerInfo.name || '—'}
              </span>
            </div>
          </div>
        )}

        <div className="col-span-1 flex items-center justify-center">
          <div className="text-center">
            <span className="text-[10px] text-gray-600 font-medium block leading-tight" title={createdAtText}>
              {createdAtText}
            </span>
          </div>
        </div>

        <div className="col-span-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className={`text-[10px] font-semibold leading-tight ${isOverdueTask && !isCompleted ? 'text-red-700' : 'text-gray-900'
                }`}>
                {formatDate(task.dueDate)}
              </span>
              {task.priority && (
                <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                  {task.priority.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-2 min-w-0 flex items-center pl-2.5 border-l border-gray-200">
          {(task as any).latestComment ? (
            <div
              className="flex flex-col gap-0.5 cursor-pointer hover:bg-blue-50 p-1 rounded transition-all w-full"
              onClick={() => onOpenCommentSidebar(task)}
              title={(task as any).latestComment.content}
            >
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-semibold text-[#1e3a8a] truncate max-w-[65px]">
                  {(task as any).latestComment.userName}
                </span>
                <span className="text-[8px] text-gray-400 shrink-0">
                  {new Date((task as any).latestComment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-[11px] text-gray-600 line-clamp-1 leading-tight">
                "{(task as any).latestComment.content}"
              </p>
            </div>
          ) : (
            <button
              onClick={() => onOpenCommentSidebar(task)}
              className="text-[9px] text-gray-400 italic hover:text-[#1e3a8a] transition-colors"
            >
              Add comment
            </button>
          )}
        </div>

        <div className="col-span-1 flex items-center justify-end gap-1">
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${isCompleted
            ? (isPermanentlyApproved
              ? 'bg-blue-100 text-[#1e3a8a] border border-blue-200'
              : 'bg-green-100 text-green-800 border border-green-300')
            : isInProgressTask
              ? 'bg-orange-100 text-orange-800 border border-orange-300'
              : isReassignedTask
                ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}>
            {isCompleted ? (isPermanentlyApproved ? 'APR' : 'COM') :
              isInProgressTask ? 'PRG' :
                isReassignedTask ? 'REA' : 'PND'}
          </span>

          <div className="flex items-center">
            {showAssignButton && typeof onAssignClick === 'function' && (
              <button
                onClick={() => onAssignClick(task)}
                className="p-0.5 text-gray-500 hover:text-[#1e3a8a] hover:bg-blue-50 rounded transition-all"
                title="Assign"
              >
                <UserPlus className="h-3 w-3" />
              </button>
            )}
            <button
              onClick={() => onOpenCommentSidebar(task)}
              className="p-0.5 text-gray-500 hover:text-[#1e3a8a] hover:bg-blue-50 rounded transition-all relative"
              title="View comments"
            >
              <MessageSquare className="h-3 w-3" />
              {hasUnreadComments && hasUnreadComments(task.id) && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 rounded-full bg-red-500" />
              )}
            </button>

            <button
              onClick={() => onOpenHistoryModal(task)}
              className="p-0.5 text-gray-500 hover:text-[#1e3a8a] hover:bg-blue-50 rounded transition-all"
              title="View history"
            >
              <History className="h-3 w-3" />
            </button>

            {canShowEditIcon && (
              <button
                onClick={() => onEditTaskClick(task)}
                disabled={isPermanentlyApproved}
                className={`p-0.5 rounded transition-all ${isPermanentlyApproved
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-500 hover:text-[#1e3a8a] hover:bg-blue-50'
                  }`}
                title={isPermanentlyApproved ? "Editing not allowed" : "Edit task"}
              >
                <Edit className="h-3 w-3" />
              </button>
            )}

            {canShowDeleteIcon && typeof onDeleteTask === 'function' && (
              <button
                onClick={() => onDeleteTask(task.id)}
                className="p-0.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}

            {userIsAssigner && isCompleted && (
              <button
                onClick={() => onPermanentApproval(task.id, !isPermanentlyApproved)}
                disabled={isUpdatingApproval}
                className="p-0.5 text-gray-500 hover:text-[#1e3a8a] hover:bg-blue-50 rounded transition-all disabled:opacity-50"
                title={isPermanentlyApproved ? 'Remove Permanent Approval' : 'Permanently Approve'}
              >
                {isUpdatingApproval ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isPermanentlyApproved ? (
                  <EyeOff className="h-3 w-3 text-red-500" />
                ) : (
                  <Eye className="h-3 w-3 text-[#1e3a8a]" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DesktopTaskItem.displayName = 'DesktopTaskItem';

export default DesktopTaskItem;
