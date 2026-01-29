import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, MoreVertical, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import type { Task, TaskStatus, UserType } from '../Types/Types';
import apiClient from '../Services/apiClient';
import { taskService } from '../Services/Task.services';
import { authService } from '../Services/User.Services';
import { CalendarPageSkeleton } from '../Components/LoadingSkeletons';
import { useNavigate } from 'react-router-dom';
import { routepath } from '../Routes/route';

interface CalendarViewProps {
  tasks?: Task[];
  currentUser?: UserType;
  handleToggleTaskStatus?: (taskId: string, currentStatus: TaskStatus) => Promise<void>;
  handleDeleteTask?: (taskId: string) => Promise<void>;
  handleUpdateTask?: (taskId: string, updatedData: Partial<Task>) => Promise<void>;
  refreshTasks?: () => Promise<void>;
  canEditDeleteTask?: (task: Task) => boolean;
  canEditTask?: (task: Task) => boolean;
  canDeleteTaskForTask?: (task: Task) => boolean;
  canDeleteTask?: boolean;
  canMarkTaskDone?: (task: Task) => boolean;
  getAssignedUserInfo?: (task: Task) => { name: string; email: string };
  formatDate?: (dateString: string) => string;
  isOverdue?: (dueDate: string, status: string) => boolean;
  isSidebarCollapsed?: boolean;
}

type AssignmentFilterMode = 'all' | 'assigned_to_me' | 'assigned_by_me';

type StatusFilterMode = 'all' | 'pending' | 'completed' | 'overdue';

type PriorityFilterMode = 'all' | 'high' | 'medium' | 'low' | 'urgent';

const CalendarView: React.FC<CalendarViewProps> = (props) => {
  const navigate = useNavigate();
  const accessDeniedRef = useRef(false);

  const {
    tasks: tasksProp,
    currentUser: currentUserProp,
    handleToggleTaskStatus,
    handleDeleteTask,
    handleUpdateTask,
    refreshTasks,
    canEditDeleteTask = () => false,
    canEditTask,
    canDeleteTaskForTask,
    canDeleteTask = true,
    canMarkTaskDone = () => false,
    getAssignedUserInfo = () => ({ name: '', email: '' }),
    formatDate = (dateString: string) => dateString,
    isOverdue = () => false,
  } = props;

  const canEditTaskEffective = useMemo(() => {
    return (typeof canEditTask === 'function' ? canEditTask : canEditDeleteTask) as (task: Task) => boolean;
  }, [canEditDeleteTask, canEditTask]);

  const canDeleteTaskForTaskEffective = useMemo(() => {
    return (typeof canDeleteTaskForTask === 'function' ? canDeleteTaskForTask : canEditDeleteTask) as (task: Task) => boolean;
  }, [canEditDeleteTask, canDeleteTaskForTask]);

  const hasExternalTasks = typeof tasksProp !== 'undefined';

  const hasExternalCurrentUser = useMemo(() => {
    if (typeof currentUserProp === 'undefined') return false;
    try {
      return Boolean(currentUserProp && Object.keys(currentUserProp).length > 0);
    } catch {
      return false;
    }
  }, [currentUserProp]);

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
    if (typeof perms.calendar_page === 'undefined') return;
    const perm = String(perms.calendar_page || '').toLowerCase();
    if (perm === 'deny') {
      if (accessDeniedRef.current) return;
      accessDeniedRef.current = true;
      toast.error('Access denied');
      navigate(routepath.dashboard);
    }
  }, [effectiveCurrentUser, navigate]);

  useEffect(() => {
    const fetchStandaloneTasks = async () => {
      if (hasExternalTasks) return;
      try {
        const res = await taskService.getAllTasks();
        if (res?.success && Array.isArray(res.data)) {
          setInternalTasks(res.data as Task[]);
        } else {
          toast.error(res?.message || 'Failed to load tasks');
        }
      } catch {
        toast.error('Failed to load tasks');
      } finally {
        setInternalTasksLoading(false);
      }
    };

    fetchStandaloneTasks();
  }, [hasExternalTasks]);

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

  const tasks = useMemo(() => {
    return hasExternalTasks ? (tasksProp || []) : internalTasks;
  }, [hasExternalTasks, internalTasks, tasksProp]);

  const currentUser = useMemo(() => {
    return hasExternalCurrentUser ? (currentUserProp as UserType) : (internalCurrentUser || ({} as UserType));
  }, [hasExternalCurrentUser, currentUserProp, internalCurrentUser]);

  const isInitialLoading = useMemo(() => {
    if (!hasExternalTasks && internalTasksLoading) return true;
    if (!hasExternalCurrentUser && internalCurrentUserLoading) return true;
    const name = (currentUser?.name || '').toString().trim().toLowerCase();
    if (name === 'loading...') return true;
    return false;
  }, [currentUser?.name, hasExternalCurrentUser, hasExternalTasks, internalCurrentUserLoading, internalTasksLoading]);

  const [googleStatusLoading, setGoogleStatusLoading] = useState(false);
  const [googleActionLoading, setGoogleActionLoading] = useState(false);
  const [googleImportLoading, setGoogleImportLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const [syncingTaskIds, setSyncingTaskIds] = useState<Record<string, boolean>>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilterMode>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterMode>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterMode>('all');

  const [reminderDaysWindow, setReminderDaysWindow] = useState<number>(() => {
    const raw = localStorage.getItem('calendarReminderDaysWindow');
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 3;
  });

  const [dismissedReminderTaskIds, setDismissedReminderTaskIds] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('calendarDismissedReminderTaskIds');
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const [snoozedReminderUntilByTaskId, setSnoozedReminderUntilByTaskId] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('calendarSnoozedReminderUntilByTaskId');
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  });

  const [reminderNotificationsEnabled, setReminderNotificationsEnabled] = useState<boolean>(() => {
    const raw = localStorage.getItem('calendarReminderNotificationsEnabled');
    return raw === 'true';
  });

  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const toLocalDateOnlyString = useCallback((d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('calendarReminderDaysWindow', String(reminderDaysWindow));
    } catch {
      // ignore
    }
  }, [reminderDaysWindow]);

  useEffect(() => {
    try {
      localStorage.setItem('calendarDismissedReminderTaskIds', JSON.stringify(dismissedReminderTaskIds));
    } catch {
      // ignore
    }
  }, [dismissedReminderTaskIds]);

  useEffect(() => {
    try {
      localStorage.setItem('calendarSnoozedReminderUntilByTaskId', JSON.stringify(snoozedReminderUntilByTaskId));
    } catch {
      // ignore
    }
  }, [snoozedReminderUntilByTaskId]);

  useEffect(() => {
    try {
      localStorage.setItem('calendarReminderNotificationsEnabled', String(reminderNotificationsEnabled));
    } catch {
      // ignore
    }
  }, [reminderNotificationsEnabled]);

  const getTaskDateOnly = useCallback(
    (value: unknown): string | null => {
      if (!value) return null;
      const raw = String(value).trim();
      if (!raw) return null;

      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      if (raw.includes('T')) {
        const [datePart] = raw.split('T');
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
      }

      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return null;
      return toLocalDateOnlyString(d);
    },
    [toLocalDateOnlyString]
  );

  const localTasks = useMemo(() => {
    return (tasks || []).filter((t) => !String(t?.id || '').startsWith('google-'));
  }, [tasks]);

  const normalizeEmail = useCallback((email: unknown) => {
    return (email || '').toString().trim().toLowerCase();
  }, []);

  const getTaskEmail = useCallback(
    (value: unknown) => {
      if (!value) return '';
      if (typeof value === 'string') return normalizeEmail(value);
      if (typeof value === 'object') {
        const maybeEmail = (value as any)?.email;
        return normalizeEmail(maybeEmail);
      }
      return '';
    },
    [normalizeEmail]
  );

  const currentUserEmail = useMemo(() => normalizeEmail((currentUser as any)?.email), [currentUser, normalizeEmail]);

  const fetchGoogleStatus = useCallback(async () => {
    setGoogleStatusLoading(true);
    try {
      const res = await apiClient.get('/google/status');
      setGoogleConnected(Boolean(res?.data?.connected));
      setGoogleError(null);
    } catch (e: any) {
      setGoogleConnected(false);
      setGoogleError(e?.response?.data?.message || e?.message || 'Failed to load Google status');
    } finally {
      setGoogleStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  const handleConnectGoogle = useCallback(async () => {
    setGoogleActionLoading(true);
    try {
      const res = await apiClient.get('/google/auth-url');
      const url = res?.data?.url;
      if (url && typeof url === 'string') {
        window.location.href = url;
      }
    } catch (e: any) {
      setGoogleError(e?.response?.data?.message || e?.message || 'Failed to start Google connection');
    } finally {
      setGoogleActionLoading(false);
    }
  }, []);

  const handleDisconnectGoogle = useCallback(async () => {
    setGoogleActionLoading(true);
    try {
      await apiClient.post('/google/disconnect', {});
      await fetchGoogleStatus();
    } catch (e: any) {
      setGoogleError(e?.response?.data?.message || e?.message || 'Failed to disconnect Google');
    } finally {
      setGoogleActionLoading(false);
    }
  }, [fetchGoogleStatus]);

  const handleSyncTask = useCallback(async (taskId: string) => {
    setSyncingTaskIds((prev) => ({ ...prev, [taskId]: true }));
    try {
      const res = await taskService.syncTaskToGoogle(taskId);
      if (!res.success) {
        setGoogleError(res.message || 'Failed to sync task');
        toast.error(res.message || 'Failed to sync task to Google');
      } else {
        setGoogleError(null);
        toast.success(res.message || 'Task synced to Google successfully');
      }
    } finally {
      setSyncingTaskIds((prev) => ({ ...prev, [taskId]: false }));
    }
  }, []);

  const handleViewInGoogleTasks = useCallback(
    async (task: Task) => {
      const taskId = String(task?.id || '').trim();

      if (taskId && !taskId.startsWith('google-')) {
        if (!googleConnected) {
          toast.error('Connect Google to view tasks in Google Tasks');
          return;
        }
        await handleSyncTask(taskId);
      }

      window.open('https://tasks.google.com', '_blank', 'noopener,noreferrer');
    },
    [googleConnected, handleSyncTask]
  );

  const handleSyncAll = useCallback(async () => {
    // const total = localTasks.length;
    let synced = 0;
    let failed = 0;
    for (const t of localTasks) {
      const id = String(t.id || '').trim();
      if (!id) continue;
      // eslint-disable-next-line no-await-in-loop
      await handleSyncTask(id);
      synced += 1;
    }
    if (synced > 0 && failed === 0) {
      toast.success(`Synced ${synced} task${synced > 1 ? 's' : ''} to Google`);
    } else if (failed > 0) {
      toast.error(`Failed to sync ${failed} task${failed > 1 ? 's' : ''}`);
    }
  }, [handleSyncTask, localTasks]);

  const handleSyncNow = useCallback(async () => {
    if (!googleConnected) return;
    setGoogleImportLoading(true);
    try {
      const res = await apiClient.post('/google/sync-tasks-now', {});
      const ok = Boolean(res?.data?.success);
      if (!ok) {
        const msg = res?.data?.message || res?.data?.msg || 'Failed to sync tasks now';
        setGoogleError(msg);
        toast.error(msg);
        return;
      }

      setGoogleError(null);
      toast.success('Google tasks synced');
      await refreshTasks?.();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to sync tasks now';
      setGoogleError(msg);
      toast.error(msg);
    } finally {
      setGoogleImportLoading(false);
    }
  }, [googleConnected, refreshTasks]);

  const mergedTasks = useMemo(() => tasks || [], [tasks]);

  const filteredTasks = useMemo(() => {
    if (!Array.isArray(mergedTasks)) return [];
    let base = mergedTasks;

    if (assignmentFilter !== 'all' && currentUserEmail) {
      if (assignmentFilter === 'assigned_to_me') {
        base = base.filter((t) => getTaskEmail((t as any)?.assignedTo) === currentUserEmail);
      } else {
        base = base.filter((t) => getTaskEmail((t as any)?.assignedBy) === currentUserEmail);
      }
    }

    if (statusFilter === 'all') return base;

    if (statusFilter === 'overdue') {
      return base.filter((t) => {
        const status = String((t as any)?.status || '').toLowerCase();
        if (status === 'completed') return false;
        return isOverdue(String((t as any)?.dueDate || ''), status);
      });
    }

    if (statusFilter === 'completed') {
      return base.filter((t) => String((t as any)?.status || '').toLowerCase() === 'completed');
    }

    if (statusFilter === 'pending') {
      base = base.filter((t) => String((t as any)?.status || '').toLowerCase() === 'pending');
    }

    if (priorityFilter !== 'all') {
      base = base.filter((t) => String((t as any)?.priority || '').toLowerCase() === priorityFilter);
    }

    return base;
  }, [assignmentFilter, currentUserEmail, getTaskEmail, isOverdue, mergedTasks, priorityFilter, statusFilter]);

  const handleDismissReminder = useCallback((taskId: string) => {
    setDismissedReminderTaskIds((prev) => ({ ...prev, [taskId]: true }));
  }, []);

  const handleSnoozeReminderUntilTomorrow = useCallback(
    (taskId: string) => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const until = toLocalDateOnlyString(tomorrow);
      setSnoozedReminderUntilByTaskId((prev) => ({ ...prev, [taskId]: until }));
    },
    [toLocalDateOnlyString]
  );

  const reminders = useMemo(() => {
    if (!currentUserEmail) return [];

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayMs = startOfToday.getTime();

    const todayOnly = toLocalDateOnlyString(startOfToday);

    const dayMs = 24 * 60 * 60 * 1000;

    return (mergedTasks || [])
      .filter((t) => {
        const assignedTo = getTaskEmail((t as any)?.assignedTo);
        const status = String((t as any)?.status || '').toLowerCase();
        const id = String((t as any)?.id || (t as any)?._id || '').trim();
        if (!id) return false;
        if (dismissedReminderTaskIds[id]) return false;
        const snoozedUntil = snoozedReminderUntilByTaskId[id];
        if (snoozedUntil && snoozedUntil > todayOnly) return false;
        return assignedTo === currentUserEmail && status === 'pending';
      })
      .map((t) => {
        const dueOnly = getTaskDateOnly((t as any)?.dueDate);
        if (!dueOnly) return null;
        const due = new Date(`${dueOnly}T00:00:00`);
        if (Number.isNaN(due.getTime())) return null;
        const daysLeft = Math.round((due.getTime() - todayMs) / dayMs);
        return { task: t as Task, dueOnly, due, daysLeft };
      })
      .filter((x): x is { task: Task; dueOnly: string; due: Date; daysLeft: number } => Boolean(x))
      .filter((x) => x.daysLeft >= 0 && x.daysLeft <= reminderDaysWindow)
      .sort((a, b) => a.daysLeft - b.daysLeft);

  }, [currentUserEmail, dismissedReminderTaskIds, getTaskDateOnly, getTaskEmail, mergedTasks, reminderDaysWindow, snoozedReminderUntilByTaskId, toLocalDateOnlyString]);

  const playReminderBeep = useCallback(() => {
    try {
      const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextCtor) return;
      const ctx = new AudioContextCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.06;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 180);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!reminderNotificationsEnabled) return;
    const dueToday = reminders.filter((r) => r.daysLeft === 0);
    if (dueToday.length === 0) return;

    const todayOnly = toLocalDateOnlyString(new Date());
    const lastNotified = localStorage.getItem('calendarReminderLastNotified');
    if (lastNotified === todayOnly) return;

    const notify = async () => {
      try {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        if (Notification.permission !== 'granted') return;
        const topTitles = dueToday.slice(0, 3).map((x) => x.task.title).join(', ');
        new Notification('Tasks due today', {
          body: topTitles,
        });
        playReminderBeep();
        localStorage.setItem('calendarReminderLastNotified', todayOnly);
      } catch {
        // ignore
      }
    };

    notify();
  }, [playReminderBeep, reminderNotificationsEnabled, reminders, toLocalDateOnlyString]);

  // Days of week
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    return { firstDay, lastDay, daysInMonth, startingDay };
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleSelectDate = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      if (date.getFullYear() !== currentMonth.getFullYear() || date.getMonth() !== currentMonth.getMonth()) {
        setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      }
    },
    [currentMonth]
  );

  const handleJumpToToday = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  }, []);

  const handlePrevDay = useCallback(() => {
    const base = selectedDate || new Date();
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - 1);
    handleSelectDate(d);
  }, [handleSelectDate, selectedDate]);

  const handleNextDay = useCallback(() => {
    const base = selectedDate || new Date();
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + 1);
    handleSelectDate(d);
  }, [handleSelectDate, selectedDate]);

  const handleCalendarTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartX(e.touches[0]?.clientX ?? null);
  }, []);

  const handleCalendarTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartX === null) return;
      const endX = e.changedTouches[0]?.clientX ?? null;
      if (endX === null) return;
      const delta = endX - touchStartX;
      setTouchStartX(null);
      if (Math.abs(delta) < 60) return;
      if (delta > 0) {
        prevMonth();
      } else {
        nextMonth();
      }
    },
    [nextMonth, prevMonth, touchStartX]
  );

  // Get tasks for a specific date
  const getTasksForDate = (date: Date) => {
    const dateStr = toLocalDateOnlyString(date);

    return filteredTasks.filter((task) => {
      const dueDateOnly = getTaskDateOnly((task as any)?.dueDate);
      return dueDateOnly === dateStr;
    });
  };

  // Format month and year
  const monthYear = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);

  const calendarDays: Date[] = [];

  const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();
  for (let i = 0; i < startingDay; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, prevMonthLastDay - i);
    calendarDays.unshift(date);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
    calendarDays.push(date);
  }

  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i);
    calendarDays.push(date);
  }

  const getPriorityColor = (priority: string | undefined) => {
    switch (String(priority || '').toLowerCase()) {
      case 'high':
        return 'bg-rose-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-emerald-500';
      case 'urgent':
        return 'bg-fuchsia-500';
      default:
        return 'bg-sky-500';
    }
  };

  const getPriorityBadgeClasses = (priority: string | undefined) => {
    switch (String(priority || '').toLowerCase()) {
      case 'high':
        return 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200';
      case 'medium':
        return 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200';
      case 'low':
        return 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200';
      case 'urgent':
        return 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200';
      default:
        return 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (String(status || '').toLowerCase()) {
      case 'completed':
        return 'bg-green-50 text-green-800 ring-1 ring-inset ring-green-200';
      case 'in-progress':
      case 'in progress':
        return 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-200';
      default:
        return 'bg-gray-50 text-gray-800 ring-1 ring-inset ring-gray-200';
    }
  };

  // Selected date tasks
  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  // Handle edit task
  const handleEditTask = (task: Task) => {
    handleUpdateTask?.(task.id, task as Task);
  };

  // Handle delete task with confirmation
  const handleDeleteWithConfirmation = async (taskId: string) => {
    if (taskId.startsWith('google-')) {
      return;
    }

    if (!canDeleteTask) {
      toast.error('You do not have permission to delete tasks');
      return;
    }
    if (window.confirm('Are you sure you want to delete this task?')) {
      await handleDeleteTask?.(taskId);
    }
  };

  // Handle toggle task status
  const handleToggleStatus = async (task: Task) => {
    await handleToggleTaskStatus?.(task.id, task.status as TaskStatus);
  };

  if (isInitialLoading) {
    return <CalendarPageSkeleton />;
  }

  return (
    <div className="space-y-6 rounded-xl bg-gradient-to-br from-slate-50 to-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar View</h1>
          <p className="text-gray-500">Manage your tasks schedule visually</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value as AssignmentFilterMode)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All</option>
              <option value="assigned_to_me">Assigned to me</option>
              <option value="assigned_by_me">Assigned by me</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilterMode)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityFilterMode)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="all">All priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="text-sm text-gray-600">
            Logged in as: <span className="font-semibold">{currentUser?.name || 'User'}</span>
          </div>
        </div>
      </div>

      {/* Google Tasks Sync Status */}
      <div className="bg-white shadow rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${googleConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className="text-sm font-medium text-gray-700">Google Tasks</span>
            </div>
            {googleStatusLoading ? (
              <span className="text-xs text-gray-500">Checking...</span>
            ) : googleConnected ? (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Connected</span>
            ) : (
              <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">Disconnected</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchGoogleStatus}
              disabled={googleStatusLoading}
              className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${googleStatusLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            {googleConnected && (
              <button
                onClick={handleSyncNow}
                disabled={googleImportLoading}
                className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${googleImportLoading ? 'animate-spin' : ''}`} />
                Sync Now
              </button>
            )}

            {googleConnected ? (
              <button
                onClick={handleDisconnectGoogle}
                disabled={googleActionLoading}
                className="px-4 py-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                Disconnect Google
              </button>
            ) : (
              <button
                onClick={handleConnectGoogle}
                disabled={googleActionLoading}
                className="px-4 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                Connect Google
              </button>
            )}

            {googleConnected && localTasks.length > 0 && (
              <button
                onClick={handleSyncAll}
                disabled={googleActionLoading}
                className="px-4 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Sync All Tasks
              </button>
            )}
          </div>
        </div>

        {googleError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{googleError}</p>
          </div>
        )}
      </div>

      {reminders.length > 0 && (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-gray-900">Reminders</div>
              <div className="text-xs text-gray-500">Pending tasks due in the next {reminderDaysWindow} days</div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={String(reminderDaysWindow)}
                onChange={(e) => setReminderDaysWindow(Number(e.target.value))}
                className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="3">Next 3 days</option>
                <option value="7">Next 7 days</option>
                <option value="14">Next 14 days</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={reminderNotificationsEnabled}
                  onChange={(e) => setReminderNotificationsEnabled(e.target.checked)}
                />
                Notify today
              </label>
              <div className="text-xs text-gray-500">{reminders.length} task{reminders.length > 1 ? 's' : ''}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {reminders.slice(0, 6).map(({ task, dueOnly, daysLeft }) => (
              <button
                key={task.id}
                type="button"
                onClick={() => handleSelectDate(new Date(`${dueOnly}T00:00:00`))}
                className="w-full text-left rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{task.title}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? 'Due tomorrow' : `Due in ${daysLeft} days`}
                      {' • '}
                      {new Date(`${dueOnly}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSnoozeReminderUntilTomorrow(String(task.id || '').trim());
                        }}
                        className="text-[11px] px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissReminder(String(task.id || '').trim());
                        }}
                        className="text-[11px] px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                  <span className={`shrink-0 px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadgeClasses((task as any)?.priority)}`}
                  >
                    {String((task as any)?.priority || 'medium')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-sm rounded-xl border border-gray-200">
            {/* Calendar Header */}
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{monthYear}</h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevDay}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleJumpToToday}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNextDay}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Days of Week */}
              <div className="grid grid-cols-7 mt-6">
                {daysOfWeek.map(day => (
                  <div key={day} className="text-center py-2 text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div
                className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden"
                onTouchStart={handleCalendarTouchStart}
                onTouchEnd={handleCalendarTouchEnd}
              >
                {calendarDays.slice(0, 42).map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                  const isToday = date.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                  const dateTasks = getTasksForDate(date);

                  return (
                    <div
                      key={index}
                      className={`min-h-32 bg-white p-2 cursor-pointer transition-all duration-200 ${!isCurrentMonth ? 'bg-gray-50' : ''
                        } ${isSelected ? 'ring-2 ring-blue-500 shadow-sm' : ''
                        } ${isToday ? 'bg-blue-50' : ''
                        } hover:bg-gray-50 hover:shadow-sm`}
                      onClick={() => handleSelectDate(date)}
                    >
                      <div className="flex justify-between items-start">
                        <span
                          className={`text-sm font-medium ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                            } ${isToday ? 'text-blue-600 font-bold' : ''}`}
                        >
                          {date.getDate()}
                        </span>
                        {dateTasks.length > 0 && (
                          <span className="text-[10px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
                            {dateTasks.length} task{dateTasks.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Task Indicators */}
                      <div className="mt-2 space-y-1">
                        {dateTasks.slice(0, 3).map(task => (
                          <div
                            key={task.id}
                            className={`text-xs px-2 py-1 rounded-md truncate ${getPriorityBadgeClasses((task as any)?.priority)}`}
                            title={`${task.title} - ${(task as any)?.priority || 'unknown'} priority`}
                          >
                            <div className="flex items-center">
                              <div
                                className={`w-2 h-2 rounded-full mr-1 ${getPriorityColor((task as any)?.priority)}`}
                              ></div>
                              <span className="truncate font-medium">
                                {task.title}
                              </span>
                            </div>
                          </div>
                        ))}
                        {dateTasks.length > 3 && (
                          <div className="text-[11px] text-gray-500 text-center">
                            +{dateTasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="p-4 bg-gray-50 rounded-b-lg">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Legend:</span>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-rose-500 mr-2"></div>
                    <span className="text-xs text-gray-600">High Priority</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
                    <span className="text-xs text-gray-600">Medium Priority</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 mr-2"></div>
                    <span className="text-xs text-gray-600">Low Priority</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Selected Date Tasks */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-sm rounded-xl border border-gray-200 sticky top-6">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDate
                  ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  : 'Select a Date'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''} scheduled
              </p>
            </div>

            {selectedDate && (
              <div className="px-6 pt-5">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900">{monthYear}</div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={prevMonth}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={nextMonth}
                        className="p-1.5 hover:bg-white rounded-lg transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 mt-3">
                    {daysOfWeek.map(day => (
                      <div key={day} className="text-center py-1 text-[11px] font-medium text-gray-500">
                        {day[0]}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                    {calendarDays.slice(0, 42).map((date, index) => {
                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                      const isToday = date.toDateString() === new Date().toDateString();
                      const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
                      return (
                        <button
                          key={`mini-${index}`}
                          type="button"
                          onClick={() => handleSelectDate(date)}
                          className={`h-8 bg-white text-xs transition-colors ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'text-gray-800'
                            } ${isSelected ? 'ring-2 ring-blue-500 z-[1] relative' : ''
                            } ${isToday ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                            } hover:bg-gray-100`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="p-6">
              {selectedDateTasks.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">No tasks scheduled</div>
                  <p className="text-sm text-gray-500">
                    Select another date or create a new task
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {selectedDateTasks.map(task => (
                    <div
                      key={task.id}
                      className="p-4 border rounded-xl hover:border-blue-300 transition-colors duration-200 border-gray-200 bg-white hover:shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{task.title}</h4>
                            {(task as any).completedApproval && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                ✅ Approved
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                                task.status
                              )}`}
                            >
                              {task.status.replace('-', ' ')}
                            </span>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadgeClasses((task as any)?.priority)}`}
                            >
                              {((task as any)?.priority || 'unknown')} priority
                            </span>
                          </div>
                        </div>
                        <div
                          className={`w-3 h-3 rounded-full ${getPriorityColor((task as any)?.priority)}`}
                        ></div>
                      </div>

                      <div className="text-sm text-gray-600 mb-4 space-y-1">
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Assigned to:</span>
                          <span>{getAssignedUserInfo(task as Task).name}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="font-medium mr-2">Due date:</span>
                          <span className={`${isOverdue(String((task as any)?.dueDate || ''), task.status) ? 'text-red-600 font-medium' : ''}`}>
                            {(task as any)?.dueDate ? formatDate(String((task as any)?.dueDate)) : 'N/A'}
                            {Boolean((task as any)?.dueDate) && isOverdue(String((task as any)?.dueDate), task.status) && ' (Overdue)'}
                          </span>
                        </div>
                        {(task as any).companyName && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Company:</span>
                            <span>{(task as any).companyName}</span>
                          </div>
                        )}
                        {(task as any).brand && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Brand:</span>
                            <span>{(task as any).brand}</span>
                          </div>
                        )}
                      </div>

                      {Boolean((task as any)?.dueDate) && (
                        <div className="pb-3">
                          <button
                            type="button"
                            onClick={() => handleViewInGoogleTasks(task as Task)}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            View in Google Tasks
                          </button>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleToggleStatus(task as Task)}
                          disabled={!canMarkTaskDone(task as Task)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-1 transition-colors ${canMarkTaskDone(task as Task)
                            ? task.status === 'completed'
                              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                          {task.status === 'completed' ? (
                            <>
                              <XCircle className="h-4 w-4" />
                              Mark Pending
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4" />
                              Mark Complete
                            </>
                          )}
                        </button>

                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenMenuId(openMenuId === task.id ? null : task.id)
                            }
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </button>

                          {openMenuId === task.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                              <button
                                onClick={() => {
                                  const taskId = String(task.id || '').trim();
                                  if (taskId) {
                                    handleSyncTask(taskId);
                                  }
                                  setOpenMenuId(null);
                                }}
                                disabled={!googleConnected || Boolean(syncingTaskIds[String(task.id || '').trim()])}
                                className="block w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                              >
                                {Boolean(syncingTaskIds[String(task.id || '').trim()]) ? 'Syncing...' : 'Sync to Google Tasks'}
                              </button>
                              <div className="border-t border-gray-100"></div>
                              {canEditTaskEffective(task as Task) && (
                                <button
                                  onClick={() => {
                                    handleEditTask(task as Task);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                  Edit Task
                                </button>
                              )}
                              {canDeleteTask && canDeleteTaskForTaskEffective(task as Task) && (
                                <button
                                  onClick={() => {
                                    handleDeleteWithConfirmation(task.id);
                                    setOpenMenuId(null);
                                  }}
                                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  Delete Task
                                </button>
                              )}
                              <div className="border-t border-gray-100"></div>
                              <button
                                onClick={() => setOpenMenuId(null)}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-100"
                              >
                                Close
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;