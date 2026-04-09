import { useMemo } from 'react';
import type { Task, UserType } from '../Types/Types';
import { performanceLevelForAvg, normalizeEmailForMatch } from '../utils/dashboardUtils';

interface UseDashboardStatsProps {
    tasks: Task[];
    reviewedTasksForSummary: Task[];
    reviewsMonth: string;
    users: UserType[];
    allMdImpexUsers: any[];
    currentUser: UserType | null;
}

export const useDashboardStats = ({
    tasks,
    reviewedTasksForSummary,
    reviewsMonth,
    users,
    allMdImpexUsers,
    currentUser
}: UseDashboardStatsProps) => {

    const employeeOfTheMonth = useMemo(() => {
        const parseMonth = (value: string) => {
            const [y, m] = String(value || '').split('-').map((x) => Number(x));
            if (!Number.isFinite(y) || !Number.isFinite(m) || y < 1970 || m < 1 || m > 12) return null;
            const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
            const endExclusive = new Date(y, m, 1, 0, 0, 0, 0);
            return { start, endExclusive };
        };
        const monthRange = parseMonth(reviewsMonth);
        const currentUserCompany = String((currentUser as any)?.companyName || (currentUser as any)?.company || '').trim().toLowerCase();
        const isMdImpexUser = currentUserCompany.includes('mdimpex') || currentUserCompany.includes('md_impex');

        const reviewedData = reviewedTasksForSummary || [];
        const reviewed = reviewedData.filter((t) => {
            const stars = (t as any).reviewStars;
            const reviewedAtRaw = (t as any).reviewedAt;
            if (stars == null) return false;
            if (!reviewedAtRaw) return false;
            if (!monthRange) return true;
            const reviewedAt = new Date(reviewedAtRaw);
            if (Number.isNaN(reviewedAt.getTime())) return false;
            return reviewedAt >= monthRange.start && reviewedAt < monthRange.endExclusive;
        });

        const byAssignee = new Map<string, {
            email: string;
            name: string;
            total: number;
            starSum: number;
        }>();

        reviewed.forEach((t) => {
            const assignedToUser = (t as any)?.assignedToUser;
            const email = String(
                assignedToUser?.email
                || (typeof (t as any).assignedTo === 'string' ? (t as any).assignedTo : (t as any).assignedTo?.email)
                || ''
            ).trim().toLowerCase();
            if (!email) return;
            if (email.includes('.deleted.')) return;
            const name = String(assignedToUser?.name || email);
            const starsValue = Number((t as any).reviewStars);
            if (!Number.isFinite(starsValue) || starsValue < 1 || starsValue > 5) return;
            if (monthRange) {
                const createdAtRaw = (t as any).createdAt || (t as any).assignedAt;
                if (!createdAtRaw) return;
                const createdAt = new Date(createdAtRaw);
                if (Number.isNaN(createdAt.getTime())) return;
                if (createdAt < monthRange.start || createdAt >= monthRange.endExclusive) return;
            }
            const existing = byAssignee.get(email) || { email, name, total: 0, starSum: 0 };
            existing.total += 1;
            existing.starSum += starsValue;
            byAssignee.set(email, existing);
        });

        const rows = Array.from(byAssignee.values()).map((r) => {
            const avgStars = r.total > 0 ? (r.starSum / r.total) : 0;
            const ratingPct = r.total > 0 ? (r.starSum / (r.total * 5)) * 100 : 0;
            return {
                ...r,
                avgStars,
                ratingPct,
                ratingPctLabel: `${ratingPct.toFixed(1)}%`,
                avgStarsLabel: `${avgStars.toFixed(1)}`,
                performance: performanceLevelForAvg(avgStars),
            };
        });

        rows.sort((a, b) => {
            if (b.total !== a.total) return b.total - a.total;
            return b.avgStars - a.avgStars;
        });

        const top = rows.find((r) => (r.total || 0) >= 30) || rows[0] || null;
        
        const summaryRowsBase = rows.slice(0, 10).map((r) => {
            let avatar = (users || []).find((u: any) => {
                const uemail = String(u?.email || '').trim().toLowerCase();
                return uemail && uemail === r.email;
            })?.avatar;
            if (!avatar && isMdImpexUser && allMdImpexUsers?.length > 0) {
                avatar = (allMdImpexUsers || []).find((u: any) => {
                    const uemail = String(u?.email || '').trim().toLowerCase();
                    return uemail && uemail === r.email;
                })?.avatar;
            }
            return {
                email: r.email,
                name: r.name,
                avatar: avatar ? String(avatar) : '',
                avgStarsLabel: r.avgStarsLabel,
                total: r.total,
                totalTasksReceived: (reviewedData || []).filter((t: any) => {
                    const rowEmail = String((r as any)?.email || '').trim().toLowerCase();
                    const assignedToEmail =
                        normalizeEmailForMatch((t as any)?.assignedToUser?.email)
                        || normalizeEmailForMatch((t as any)?.assignedToUser)
                        || normalizeEmailForMatch((t as any)?.assignedTo?.email)
                        || normalizeEmailForMatch((t as any)?.assignedTo)
                        || normalizeEmailForMatch((t as any)?.assignedToId)
                        || normalizeEmailForMatch((t as any)?.assignedToUserId);
                    if (!assignedToEmail || !rowEmail || assignedToEmail !== rowEmail) return false;
                    if (!monthRange) return true;
                    const createdAtRaw = (t as any).createdAt || (t as any).assignedAt;
                    if (!createdAtRaw) return false;
                    const createdAt = new Date(createdAtRaw);
                    if (Number.isNaN(createdAt.getTime())) return false;
                    return createdAt >= monthRange.start && createdAt < monthRange.endExclusive;
                }).length,
                performance: r.performance,
            };
        });

        const photoUrl = top
            ? (users || []).find((u: any) => {
                const uemail = String(u?.email || '').trim().toLowerCase();
                return uemail && uemail === top.email;
            })?.avatar
            : undefined;
        let finalPhotoUrl = photoUrl;
        if (top && !finalPhotoUrl && isMdImpexUser && allMdImpexUsers?.length > 0) {
            const comprehensivePhotoUrl = (allMdImpexUsers || []).find((u: any) => {
                const uemail = String(u?.email || '').trim().toLowerCase();
                return uemail && uemail === top.email;
            })?.avatar;
            finalPhotoUrl = comprehensivePhotoUrl;
        }

        return {
            name: top?.name || 'Not any yet',
            email: top?.email || '',
            rating: top?.avgStars || 0,
            performance: top?.performance || 'Not any yet',
            avg: top?.ratingPctLabel || 'Not any yet',
            photoUrl: finalPhotoUrl ? String(finalPhotoUrl) : undefined,
            totalReviews: top ? (summaryRowsBase.find(r => r.email === top.email)?.total ?? 0) : (rows[0]?.total ?? 0),
            totalTasksReceived: top ? (reviewedData || []).filter((t: any) => {
                const topEmail = String((top as any)?.email || '').trim().toLowerCase();
                const assignedToEmail =
                    normalizeEmailForMatch((t as any)?.assignedTo)
                    || normalizeEmailForMatch((t as any)?.assignedToUser?.email)
                    || normalizeEmailForMatch((t as any)?.assignedToUser);
                if (!assignedToEmail || !topEmail || assignedToEmail !== topEmail) return false;
                if (!monthRange) return true;
                const createdAtRaw = (t as any).createdAt || (t as any).assignedAt;
                if (!createdAtRaw) return false;
                const createdAt = new Date(createdAtRaw);
                if (Number.isNaN(createdAt.getTime())) return false;
                return createdAt >= monthRange.start && createdAt < monthRange.endExclusive;
            }).length : 0,
            summaryRows: top
                ? summaryRowsBase
                : [
                    {
                        email: '__top_placeholder__',
                        name: 'Not any yet',
                        avatar: '',
                        avgStarsLabel: '0.0',
                        total: 0,
                        performance: 'Not any yet',
                    },
                    ...summaryRowsBase,
                ],
        };
    }, [reviewedTasksForSummary, reviewsMonth, users, allMdImpexUsers, tasks, currentUser?.companyName, currentUser?.company]);

    const pendingManagerReviewTasks = useMemo(() => {
        const normalizeEmailSafe = (v: unknown): string => String(v || '').trim().toLowerCase();
        const normalizeRoleKey = (v: unknown): string => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
        const smartbizReviewerEmails = new Set([
            'miteshsmartbiz@gmail.com',
            'mitixasmartbiz@gmail.com',
            'viralsmartbiz@gmail.com',
            'smartbizishita@gmail.com',
        ]);
        const isAssistantRoleKey = (roleKey: string): boolean => {
            if (!roleKey) return false;
            if (roleKey === 'assistant' || roleKey.includes('assistant')) return true;
            return roleKey === 'sub_assistance' || roleKey === 'sub_assistence' || roleKey === 'sub_assist' || roleKey === 'sub_assistant';
        };
        const roleKey = normalizeRoleKey((currentUser as any)?.role);
        const myEmail = normalizeEmailSafe((currentUser as any)?.email);
        const isSmartbizReviewer = Boolean(myEmail && smartbizReviewerEmails.has(myEmail));

        if (!isSmartbizReviewer && roleKey !== 'manager' && roleKey !== 'marketer_manager' && roleKey !== 'md_manager') return [];
        if (!myEmail) return [];

        const getAssignedByEmail = (t: any): string => {
            const raw = (t as any)?.assignedBy;
            if (typeof raw === 'string') return normalizeEmailSafe(raw);
            if (raw && typeof raw === 'object') return normalizeEmailSafe((raw as any)?.email);
            return normalizeEmailSafe((t as any)?.assignedByUser?.email);
        };

        const getAssignedToEmail = (t: any): string => {
            const raw = (t as any)?.assignedTo;
            if (typeof raw === 'string') return normalizeEmailSafe(raw);
            if (raw && typeof raw === 'object') return normalizeEmailSafe((raw as any)?.email);
            return normalizeEmailSafe((t as any)?.assignedToUser?.email);
        };

        const getAssigneeRoleKey = (t: any): string => {
            const role = (t as any)?.assignedToUser?.role;
            const key = normalizeRoleKey(role);
            if (key) return key;
            const email = getAssignedToEmail(t);
            const found = (users || []).find((u: any) => normalizeEmailSafe((u as any)?.email) === email);
            return normalizeRoleKey((found as any)?.role);
        };

        const list = (tasks || [])
            .filter((t: any) => {
                if (!t) return false;
                const status = String((t as any)?.status || '').trim().toLowerCase();
                if (status !== 'completed') return false;
                if ((t as any)?.reviewStars != null) return false;
                const assignedByEmail = getAssignedByEmail(t);
                if (!assignedByEmail || assignedByEmail !== myEmail) return false;
                const assigneeRoleKey = getAssigneeRoleKey(t);
                if (!isAssistantRoleKey(assigneeRoleKey)) return false;
                return true;
            })
            .sort((a: any, b: any) => {
                const aDate = new Date((a as any)?.statusUpdatedAt || (a as any)?.updatedAt || (a as any)?.createdAt || 0).getTime();
                const bDate = new Date((b as any)?.statusUpdatedAt || (b as any)?.updatedAt || (b as any)?.createdAt || 0).getTime();
                return bDate - aDate;
            });
        return list;
    }, [tasks, currentUser, users]);

    return {
        employeeOfTheMonth,
        pendingManagerReviewTasks
    };
};
