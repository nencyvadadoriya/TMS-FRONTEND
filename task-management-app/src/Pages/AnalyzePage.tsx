import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';

import type { Task } from '../Types/Types';

interface AnalyzePageProps {
    tasks: Task[];
    currentUserEmail?: string;
}

const AnalyzePage = ({ tasks, currentUserEmail: currentUserEmailProp }: AnalyzePageProps) => {
    const chartRef = useRef<HTMLDivElement | null>(null);
    const chartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const assignedChartRef = useRef<HTMLDivElement | null>(null);
    const assignedChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const assignedToChartRef = useRef<HTMLDivElement | null>(null);
    const assignedToChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const trendsChartRef = useRef<HTMLDivElement | null>(null);
    const trendsChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const leaderboardChartRef = useRef<HTMLDivElement | null>(null);
    const leaderboardChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const performanceChartRef = useRef<HTMLDivElement | null>(null);
    const performanceChartInstanceRef = useRef<ReturnType<typeof echarts.init> | null>(null);
    const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
    const [assignedChartType, setAssignedChartType] = useState<'bar' | 'line' | 'pie'>('pie');
    const [assignedToChartType, setAssignedToChartType] = useState<'bar' | 'line' | 'pie'>('bar');
    const [trendsGranularity, setTrendsGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [trendsStartDate, setTrendsStartDate] = useState<string>('');
    const [trendsEndDate, setTrendsEndDate] = useState<string>('');
    const [trendsAssignee, setTrendsAssignee] = useState<string>('all');
    const [trendsCompany, setTrendsCompany] = useState<string>('all');
    const [trendsBrand, setTrendsBrand] = useState<string>('all');
    const [leaderboardMetric, setLeaderboardMetric] = useState<'completed' | 'rate'>('completed');
    const [leaderboardStartDate, setLeaderboardStartDate] = useState<string>('');
    const [leaderboardEndDate, setLeaderboardEndDate] = useState<string>('');
    const [leaderboardCompany, setLeaderboardCompany] = useState<string>('all');
    const [leaderboardBrand, setLeaderboardBrand] = useState<string>('all');
    const [leaderboardTopN, setLeaderboardTopN] = useState<number>(5);
    const [performanceGroupBy, setPerformanceGroupBy] = useState<'company' | 'brand'>('company');
    const [performanceStartDate, setPerformanceStartDate] = useState<string>('');
    const [performanceEndDate, setPerformanceEndDate] = useState<string>('');
    const getInitialRecommended = () => {
    if (typeof window === 'undefined') return { cols: 2, reason: 'Default' };
    const w = window.innerWidth;
    if (w < 768) return { cols: 1, reason: 'Narrow screen, 1 chart per row best' };
    if (w < 1024) return { cols: 2, reason: 'Comfortable for 2 charts' };
    if (w < 1280) return { cols: 3, reason: 'Good fit for 3 charts' };
    return { cols: 4, reason: 'Plenty of space for 4 charts' };
};
const initRec = getInitialRecommended();
const [chartsPerRow, setChartsPerRow] = useState<1 | 2 | 3 | 4>(initRec.cols as 1 | 2 | 3 | 4);
    const [recommendCols, setRecommendCols] = useState<number>(initRec.cols);
    const [recommendReason, setRecommendReason] = useState<string>(initRec.reason);
    const [userHasChangedChartsPerRow, setUserHasChangedChartsPerRow] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const update = () => {
            let best = 1;
            let reason = '';

            if (gridRef.current) {
                const containerWidth = gridRef.current.offsetWidth;
                const gap = 24; // gap-6 = 1.5rem = 24px
                const idealChartWidth = 420; // ideal width for readability

                // Try 4 columns
                if (containerWidth >= 4 * idealChartWidth + 3 * gap) {
                    best = 4;
                    reason = 'Plenty of space for 4 charts';
                }
                // Try 3 columns
                else if (containerWidth >= 3 * idealChartWidth + 2 * gap) {
                    best = 3;
                    reason = 'Good fit for 3 charts';
                }
                // Try 2 columns
                else if (containerWidth >= 2 * idealChartWidth + gap) {
                    best = 2;
                    reason = 'Comfortable for 2 charts';
                }
                // Fallback to 1
                else {
                    best = 1;
                    reason = 'Narrow screen, 1 chart per row best';
                }
            } else {
                // Fallback to screen-width based recommendation when container not yet mounted
                const w = window.innerWidth;
                if (w < 768) { best = 1; reason = 'Narrow screen, 1 chart per row best'; }
                else if (w < 1024) { best = 2; reason = 'Comfortable for 2 charts'; }
                else if (w < 1280) { best = 3; reason = 'Good fit for 3 charts'; }
                else { best = 4; reason = 'Plenty of space for 4 charts'; }
            }

            setRecommendCols(best);
            setRecommendReason(reason);
            if (!userHasChangedChartsPerRow) {
                setChartsPerRow(best as 1 | 2 | 3 | 4);
            }
        };
        update();
        const ro = new ResizeObserver(update);
        if (gridRef.current) ro.observe(gridRef.current);
        window.addEventListener('resize', update);
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', update);
        };
    }, [userHasChangedChartsPerRow]);

    const createdByCounts = useMemo(() => {
        const getCreatorLabel = (t: Task): string => {
            const assignedByName = (t as any)?.assignedByName;
            if (assignedByName && assignedByName.toString().trim()) return assignedByName.toString().trim();

            const assignedBy = (t as any)?.assignedBy;
            if (assignedBy && typeof assignedBy === 'object') {
                const name = (assignedBy.name || '').toString().trim();
                if (name) return name;

                const email = (assignedBy.email || '').toString().trim();
                if (email) return email.split('@')[0] || email;

                const id = (assignedBy.id || assignedBy._id || '').toString().trim();
                if (id) return id;
            }

            if (typeof assignedBy === 'string' && assignedBy.trim()) {
                const value = assignedBy.trim();
                return value.includes('@') ? (value.split('@')[0] || value) : value;
            }

            return 'Unknown';
        };

        const counts = new Map<string, number>();
        (tasks || []).forEach((t) => {
            const label = getCreatorLabel(t);
            counts.set(label, (counts.get(label) || 0) + 1);
        });

        const categories = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
        const data = categories.map((name) => counts.get(name) || 0);
        return { categories, data };
    }, [tasks]);

    const assignedSummary = useMemo(() => {
        const myEmail = (currentUserEmailProp || '').toString().trim().toLowerCase();
        const extractEmail = (value: unknown): string => {
            if (!value) return '';
            if (typeof value === 'string') return value.toString().trim().toLowerCase();
            if (typeof value === 'object') {
                const email = (value as any)?.email;
                if (email) return email.toString().trim().toLowerCase();
            }
            return '';
        };

        let assignedByMe = 0;
        let assignedToMe = 0;

        if (!myEmail) return { assignedByMe, assignedToMe, myEmail };

        (tasks || []).forEach((t) => {
            const assignedByEmail = extractEmail((t as any)?.assignedBy);
            const assignedToEmail = extractEmail((t as any)?.assignedTo);

            if (assignedByEmail === myEmail) assignedByMe += 1;
            if (assignedToEmail === myEmail) assignedToMe += 1;
        });

        return { assignedByMe, assignedToMe, myEmail };
    }, [tasks, currentUserEmailProp]);

    const assignedToByMeCounts = useMemo(() => {
        const myEmail = (currentUserEmailProp || '').toString().trim().toLowerCase();

        const extractEmail = (value: unknown): string => {
            if (!value) return '';
            if (typeof value === 'string') return value.toString().trim().toLowerCase();
            if (typeof value === 'object') {
                const email = (value as any)?.email;
                if (email) return email.toString().trim().toLowerCase();
            }
            return '';
        };

        const getAssigneeLabel = (t: Task): string => {
            const assignedToName = (t as any)?.assignedToName;
            if (assignedToName && assignedToName.toString().trim()) return assignedToName.toString().trim();

            const assignedTo = (t as any)?.assignedTo;
            if (assignedTo && typeof assignedTo === 'object') {
                const name = (assignedTo.name || '').toString().trim();
                if (name) return name;

                const email = (assignedTo.email || '').toString().trim();
                if (email) return email.split('@')[0] || email;

                const id = (assignedTo.id || assignedTo._id || '').toString().trim();
                if (id) return id;
            }

            if (typeof assignedTo === 'string' && assignedTo.trim()) {
                const value = assignedTo.trim();
                return value.includes('@') ? (value.split('@')[0] || value) : value;
            }

            return 'Unknown';
        };

        if (!myEmail) return { categories: [], data: [], myEmail };

        const counts = new Map<string, number>();
        (tasks || []).forEach((t) => {
            const assignedByEmail = extractEmail((t as any)?.assignedBy);
            if (assignedByEmail !== myEmail) return;

            const label = getAssigneeLabel(t);
            counts.set(label, (counts.get(label) || 0) + 1);
        });

        const categories = Array.from(counts.keys()).sort((a, b) => a.localeCompare(b));
        const data = categories.map((name) => counts.get(name) || 0);
        return { categories, data, myEmail };
    }, [tasks, currentUserEmailProp]);

    const trendsOptions = useMemo(() => {
        const normalize = (v: unknown) => (v || '').toString().trim();
        const normalizeKey = (v: unknown) => normalize(v).toLowerCase();

        const getAssigneeKey = (t: Task): string => {
            const assignedTo = (t as any)?.assignedTo;
            if (typeof assignedTo === 'string' && assignedTo.trim()) return assignedTo.trim();
            if (assignedTo && typeof assignedTo === 'object') {
                const email = normalize((assignedTo as any)?.email);
                if (email) return email;
                const name = normalize((assignedTo as any)?.name);
                if (name) return name;
                const id = normalize((assignedTo as any)?.id || (assignedTo as any)?._id);
                if (id) return id;
            }
            const assignedToName = normalize((t as any)?.assignedToName);
            if (assignedToName) return assignedToName;
            return 'Unknown';
        };

        const assignees = new Set<string>();
        const companies = new Set<string>();
        const brands = new Set<string>();

        (tasks || []).forEach((t) => {
            const assignee = getAssigneeKey(t);
            if (assignee && assignee !== 'Unknown') assignees.add(assignee);

            const company = normalize((t as any)?.companyName || (t as any)?.company);
            if (company) companies.add(company);

            const brand = normalize((t as any)?.brand);
            if (brand) brands.add(brand);
        });

        return {
            assignees: ['all', ...Array.from(assignees).sort((a, b) => a.localeCompare(b))],
            companies: ['all', ...Array.from(companies).sort((a, b) => a.localeCompare(b))],
            brands: ['all', ...Array.from(brands).sort((a, b) => a.localeCompare(b))],
            normalizeKey,
            getAssigneeKey,
        };
    }, [tasks]);

    const completionTrends = useMemo(() => {
        const normalizeKey = trendsOptions.normalizeKey;
        const getAssigneeKey = trendsOptions.getAssigneeKey;

        const start = trendsStartDate ? new Date(`${trendsStartDate}T00:00:00`) : null;
        const end = trendsEndDate ? new Date(`${trendsEndDate}T23:59:59`) : null;

        const bucketKey = (d: Date): string => {
            if (trendsGranularity === 'daily') {
                return d.toISOString().slice(0, 10);
            }
            if (trendsGranularity === 'monthly') {
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }

            const day = d.getDay();
            const diff = (day + 6) % 7;
            const startOfWeek = new Date(d);
            startOfWeek.setDate(d.getDate() - diff);
            startOfWeek.setHours(0, 0, 0, 0);
            return startOfWeek.toISOString().slice(0, 10);
        };

        const acc = new Map<string, { completed: number; pending: number }>();

        (tasks || []).forEach((t) => {
            if (trendsAssignee !== 'all') {
                const assigneeKey = getAssigneeKey(t);
                if (normalizeKey(assigneeKey) !== normalizeKey(trendsAssignee)) return;
            }

            if (trendsCompany !== 'all') {
                const company = (t.companyName || (t as any)?.company || '').toString();
                if (normalizeKey(company) !== normalizeKey(trendsCompany)) return;
            }

            if (trendsBrand !== 'all') {
                const brand = (t.brand || '').toString();
                if (normalizeKey(brand) !== normalizeKey(trendsBrand)) return;
            }

            const base = new Date((t.dueDate || t.createdAt || '').toString());
            if (Number.isNaN(base.getTime())) return;
            if (start && base < start) return;
            if (end && base > end) return;

            const key = bucketKey(base);
            if (!acc.has(key)) acc.set(key, { completed: 0, pending: 0 });
            const entry = acc.get(key)!;

            if (t.status === 'completed') entry.completed += 1;
            else entry.pending += 1;
        });

        const keys = Array.from(acc.keys()).sort();
        return {
            labels: keys,
            completed: keys.map((k) => acc.get(k)!.completed),
            pending: keys.map((k) => acc.get(k)!.pending),
        };
    }, [tasks, trendsAssignee, trendsBrand, trendsCompany, trendsGranularity, trendsOptions, trendsStartDate, trendsEndDate]);

    const leaderboardData = useMemo(() => {
        const normalizeKey = trendsOptions.normalizeKey;
        const getAssigneeKey = trendsOptions.getAssigneeKey;

        const start = leaderboardStartDate ? new Date(`${leaderboardStartDate}T00:00:00`) : null;
        const end = leaderboardEndDate ? new Date(`${leaderboardEndDate}T23:59:59`) : null;

        const statsByAssignee = new Map<string, { completed: number; total: number }>();

        (tasks || []).forEach((t) => {
            const company = (t.companyName || (t as any)?.company || '').toString();
            const brand = (t.brand || '').toString();
            if (leaderboardCompany !== 'all' && normalizeKey(company) !== normalizeKey(leaderboardCompany)) return;
            if (leaderboardBrand !== 'all' && normalizeKey(brand) !== normalizeKey(leaderboardBrand)) return;

            const base = new Date(((t as any)?.updatedAt || t.createdAt || t.dueDate || '').toString());
            if (Number.isNaN(base.getTime())) return;
            if (start && base < start) return;
            if (end && base > end) return;

            const assignee = getAssigneeKey(t);
            if (!assignee || assignee === 'Unknown') return;

            const current = statsByAssignee.get(assignee) || { completed: 0, total: 0 };
            current.total += 1;
            if (t.status === 'completed') current.completed += 1;
            statsByAssignee.set(assignee, current);
        });

        const rows = Array.from(statsByAssignee.entries()).map(([name, s]) => {
            const rate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
            return { name, completed: s.completed, rate };
        });

        rows.sort((a, b) => {
            if (leaderboardMetric === 'rate') return b.rate - a.rate;
            return b.completed - a.completed;
        });

        const top = rows.slice(0, Math.max(1, leaderboardTopN || 5));
        return {
            categories: top.map((r) => r.name),
            values: top.map((r) => (leaderboardMetric === 'rate' ? Number(r.rate.toFixed(2)) : r.completed)),
            metricLabel: leaderboardMetric === 'rate' ? 'Completion Rate (%)' : 'Completed Tasks',
        };
    }, [tasks, trendsOptions, leaderboardMetric, leaderboardStartDate, leaderboardEndDate, leaderboardCompany, leaderboardBrand, leaderboardTopN]);

    const performanceData = useMemo(() => {
        const start = performanceStartDate ? new Date(`${performanceStartDate}T00:00:00`) : null;
        const end = performanceEndDate ? new Date(`${performanceEndDate}T23:59:59`) : null;

        const statusOrder: string[] = ['completed', 'in-progress', 'pending', 'on-hold', 'cancelled'];
        const statusLabel: Record<string, string> = {
            completed: 'Completed',
            'in-progress': 'In Progress',
            pending: 'Pending',
            'on-hold': 'On Hold',
            cancelled: 'Cancelled',
        };
        const statusColor: Record<string, string> = {
            completed: '#10b981',
            'in-progress': '#3b82f6',
            pending: '#f59e0b',
            'on-hold': '#8b5cf6',
            cancelled: '#ef4444',
        };

        const map = new Map<string, Record<string, number>>();

        (tasks || []).forEach((t) => {
            const base = new Date(((t as any)?.updatedAt || t.createdAt || t.dueDate || '').toString());
            if (Number.isNaN(base.getTime())) return;
            if (start && base < start) return;
            if (end && base > end) return;

            const groupRaw =
                performanceGroupBy === 'brand'
                    ? (t.brand || '').toString().trim()
                    : (t.companyName || (t as any)?.company || '').toString().trim();

            const group = groupRaw || 'Unknown';
            const status = (t.status || 'pending').toString();

            if (!map.has(group)) map.set(group, {});
            const entry = map.get(group)!;
            entry[status] = (entry[status] || 0) + 1;
        });

        const categories = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));
        const series = statusOrder.map((s) => ({
            name: statusLabel[s] || s,
            type: 'bar' as const,
            stack: 'total',
            data: categories.map((c) => map.get(c)?.[s] || 0),
            itemStyle: { color: statusColor[s] || '#9ca3af' },
        }));

        return { categories, series };
    }, [tasks, trendsOptions, performanceGroupBy, performanceStartDate, performanceEndDate]);

    useEffect(() => {
        if (!chartRef.current) return;
        
        const dom = chartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        chartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            chartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!leaderboardChartRef.current) return;

        const dom = leaderboardChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        leaderboardChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            leaderboardChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!performanceChartRef.current) return;

        const dom = performanceChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        performanceChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            performanceChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!trendsChartRef.current) return;

        const dom = trendsChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        trendsChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            trendsChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!assignedToChartRef.current) return;

        const dom = assignedToChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        assignedToChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            assignedToChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!assignedChartRef.current) return;

        const dom = assignedChartRef.current;
        const chart = echarts.getInstanceByDom(dom) ?? echarts.init(dom);
        assignedChartInstanceRef.current = chart;

        const onResize = () => chart.resize();
        window.addEventListener('resize', onResize);

        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(dom);

        return () => {
            window.removeEventListener('resize', onResize);
            resizeObserver.disconnect();
            chart.dispose();
            assignedChartInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        const chart = chartInstanceRef.current;
        if (!chart) return;

        const hasData = createdByCounts.categories.length > 0;

        const pieData = createdByCounts.categories.map((name, idx) => ({
            name,
            value: createdByCounts.data[idx] ?? 0,
        }));

        const option: echarts.EChartsOption =
            chartType === 'pie'
                ? {
                      title: hasData
                          ? undefined
                          : {
                                text: 'No data',
                                left: 'center',
                                top: 'middle',
                                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                            },
                      tooltip: { trigger: 'item' },
                      legend: { top: 'bottom' },
                      series: [
                          {
                              name: 'Tasks Created',
                              type: 'pie',
                              radius: ['40%', '70%'],
                              avoidLabelOverlap: true,
                              label: { show: true, formatter: '{b}: {c}' },
                              data: pieData,
                          },
                      ],
                  }
                : {
                      title: hasData
                          ? undefined
                          : {
                                text: 'No data',
                                left: 'center',
                                top: 'middle',
                                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                            },
                      tooltip: { trigger: 'axis' },
                      grid: { left: 40, right: 20, top: 30, bottom: 80 },
                      xAxis: {
                          type: 'category',
                          data: createdByCounts.categories,
                          axisLabel: { rotate: 30 },
                      },
                      yAxis: {
                          type: 'value',
                          minInterval: 1,
                      },
                      series: [
                          {
                              name: 'Tasks Created',
                              data: createdByCounts.data,
                              type: chartType,
                              barMaxWidth: 50,
                              smooth: chartType === 'line',
                              symbolSize: 8,
                              itemStyle: { color: '#3b82f6' },
                              lineStyle: { color: '#3b82f6', width: 3 },
                          },
                      ],
                  };

        chart.setOption(option, true);
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [createdByCounts, chartType]);

    useEffect(() => {
        const chart = assignedChartInstanceRef.current;
        if (!chart) return;

        const hasUser = Boolean(assignedSummary.myEmail);

        const labels: string[] = ['Assigned by me', 'Assigned to me'];
        const values: number[] = [assignedSummary.assignedByMe, assignedSummary.assignedToMe];
        const hasData = values.some((v) => v > 0);

        const emptyTitle = hasUser
            ? hasData
                ? undefined
                : {
                      text: 'No data',
                      left: 'center',
                      top: 'middle',
                      textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                  }
            : {
                  text: 'Login required',
                  left: 'center',
                  top: 'middle',
                  textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
              };

        const colors = ['#3b82f6', '#10b981'];

        const option: echarts.EChartsOption =
            assignedChartType === 'pie'
                ? {
                      title: emptyTitle,
                      tooltip: { trigger: 'item' },
                      legend: { top: 'bottom' },
                      series: [
                          {
                              name: 'Assignments',
                              type: 'pie',
                              radius: ['40%', '70%'],
                              label: { show: true, formatter: '{b}: {c}' },
                              data: [
                                  { name: labels[0], value: values[0], itemStyle: { color: colors[0] } },
                                  { name: labels[1], value: values[1], itemStyle: { color: colors[1] } },
                              ],
                          },
                      ],
                  }
                : {
                      title: emptyTitle,
                      tooltip: { trigger: 'axis' },
                      grid: { left: 40, right: 20, top: 30, bottom: 60 },
                      xAxis: { type: 'category', data: labels },
                      yAxis: { type: 'value', minInterval: 1 },
                      series: [
                          {
                              name: 'Assignments',
                              type: assignedChartType,
                              data: values,
                              barMaxWidth: assignedChartType === 'bar' ? 50 : undefined,
                              smooth: assignedChartType === 'line',
                              symbolSize: 10,
                              itemStyle: {
                                  color: (params: any) => colors[params?.dataIndex] || colors[0],
                              },
                              lineStyle: { color: colors[0], width: 3 },
                              label: { show: true, position: 'top' },
                          },
                      ],
                  };

        chart.setOption(option, true);
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [assignedSummary, assignedChartType]);

    useEffect(() => {
        const chart = assignedToChartInstanceRef.current;
        if (!chart) return;

        const hasUser = Boolean(assignedToByMeCounts.myEmail);
        const hasData = assignedToByMeCounts.categories.length > 0;

        const pieData = assignedToByMeCounts.categories.map((name, idx) => ({
            name,
            value: assignedToByMeCounts.data[idx] ?? 0,
        }));

        const option: echarts.EChartsOption =
            assignedToChartType === 'pie'
                ? {
                      title: hasUser
                          ? hasData
                              ? undefined
                              : {
                                    text: 'No data',
                                    left: 'center',
                                    top: 'middle',
                                    textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                                }
                          : {
                                text: 'Login required',
                                left: 'center',
                                top: 'middle',
                                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                            },
                      tooltip: { trigger: 'item' },
                      legend: { top: 'bottom' },
                      series: [
                          {
                              name: 'Assigned To',
                              type: 'pie',
                              radius: ['40%', '70%'],
                              avoidLabelOverlap: true,
                              label: { show: true, formatter: '{b}: {c}' },
                              data: pieData,
                          },
                      ],
                  }
                : {
                      title: hasUser
                          ? hasData
                              ? undefined
                              : {
                                    text: 'No data',
                                    left: 'center',
                                    top: 'middle',
                                    textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                                }
                          : {
                                text: 'Login required',
                                left: 'center',
                                top: 'middle',
                                textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                            },
                      tooltip: { trigger: 'axis' },
                      grid: { left: 40, right: 20, top: 30, bottom: 80 },
                      xAxis: {
                          type: 'category',
                          data: assignedToByMeCounts.categories,
                          axisLabel: { rotate: 30 },
                      },
                      yAxis: { type: 'value', minInterval: 1 },
                      series: [
                          {
                              name: 'Tasks Assigned',
                              data: assignedToByMeCounts.data,
                              type: assignedToChartType,
                              barMaxWidth: 50,
                              smooth: assignedToChartType === 'line',
                              symbolSize: 8,
                              itemStyle: { color: '#8b5cf6' },
                              lineStyle: { color: '#8b5cf6', width: 3 },
                          },
                      ],
                  };

        chart.setOption(option, true);
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [assignedToByMeCounts, assignedToChartType]);

    useEffect(() => {
        const chart = trendsChartInstanceRef.current;
        if (!chart) return;

        const hasData = completionTrends.labels.length > 0;
        const option: echarts.EChartsOption = {
            title: hasData
                ? undefined
                : {
                      text: 'No data',
                      left: 'center',
                      top: 'middle',
                      textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                  },
            tooltip: { trigger: 'axis' },
            legend: { top: 'bottom' },
            grid: { left: 40, right: 20, top: 30, bottom: 80 },
            xAxis: {
                type: 'category',
                data: completionTrends.labels,
                axisLabel: { rotate: 30 },
            },
            yAxis: { type: 'value', minInterval: 1 },
            series: [
                {
                    name: 'Completed',
                    type: 'line',
                    data: completionTrends.completed,
                    smooth: true,
                    symbolSize: 7,
                    itemStyle: { color: '#10b981' },
                    lineStyle: { color: '#10b981', width: 3 },
                },
                {
                    name: 'Pending',
                    type: 'line',
                    data: completionTrends.pending,
                    smooth: true,
                    symbolSize: 7,
                    itemStyle: { color: '#f59e0b' },
                    lineStyle: { color: '#f59e0b', width: 3 },
                },
            ],
        };

        chart.setOption(option, true);
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [completionTrends]);

    useEffect(() => {
        const chart = leaderboardChartInstanceRef.current;
        if (!chart) return;

        const hasData = leaderboardData.categories.length > 0;
        const option: echarts.EChartsOption = {
            title: hasData
                ? undefined
                : {
                      text: 'No data',
                      left: 'center',
                      top: 'middle',
                      textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                  },
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 20, top: 30, bottom: 90 },
            xAxis: { type: 'category', data: leaderboardData.categories, axisLabel: { rotate: 30 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: [
                {
                    name: leaderboardData.metricLabel,
                    type: 'bar',
                    data: leaderboardData.values,
                    barMaxWidth: 50,
                    itemStyle: { color: '#06b6d4' },
                    label: { show: true, position: 'top' },
                },
            ],
        };

        chart.setOption(option, true);
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [leaderboardData]);

    useEffect(() => {
        const chart = performanceChartInstanceRef.current;
        if (!chart) return;

        const hasData = performanceData.categories.length > 0;
        const option: echarts.EChartsOption = {
            title: hasData
                ? undefined
                : {
                      text: 'No data',
                      left: 'center',
                      top: 'middle',
                      textStyle: { color: '#9ca3af', fontSize: 14, fontWeight: 400 },
                  },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
            legend: { top: 'bottom' },
            grid: { left: 50, right: 20, top: 30, bottom: 90 },
            xAxis: { type: 'category', data: performanceData.categories, axisLabel: { rotate: 30 } },
            yAxis: { type: 'value', minInterval: 1 },
            series: performanceData.series,
        };

        chart.setOption(option, true);
        requestAnimationFrame(() => {
            chart.resize();
        });
    }, [performanceData]);

    useEffect(() => {
        requestAnimationFrame(() => {
            chartInstanceRef.current?.resize();
            assignedChartInstanceRef.current?.resize();
            assignedToChartInstanceRef.current?.resize();
            trendsChartInstanceRef.current?.resize();
            leaderboardChartInstanceRef.current?.resize();
            performanceChartInstanceRef.current?.resize();
        });
    }, [chartsPerRow]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analyze</h1>
                    <p className="text-gray-600">Task analytics overview</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-500">
                        Charts per row
                        <select
                            className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white"
                            value={chartsPerRow}
                            onChange={(e) => {
    setChartsPerRow(Number(e.target.value) as 1 | 2 | 3 | 4);
    setUserHasChangedChartsPerRow(true);
}}
                        >
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                            <option value={3}>3</option>
                            <option value={4}>4</option>
                        </select>
                    </label>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded" title={recommendReason}>
                        Recommended: {recommendCols}
                    </span>
                </div>
            </div>

            <div ref={gridRef} className={`grid grid-cols-1 ${chartsPerRow === 2 ? 'lg:grid-cols-2' : chartsPerRow === 3 ? 'lg:grid-cols-3' : chartsPerRow === 4 ? 'lg:grid-cols-4' : ''} gap-6`}>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Total Tasks</h2>
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-500">
                                Chart
                                <select
                                    className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white"
                                    value={chartType}
                                    onChange={(e) => setChartType(e.target.value as 'bar' | 'line' | 'pie')}
                                >
                                    <option value="bar">Bar</option>
                                    <option value="line">Line</option>
                                    <option value="pie">Pie</option>
                                </select>
                            </label>
                            <div className="text-sm text-gray-500">Total: {(tasks || []).length}</div>
                        </div>
                    </div>

                    <div ref={chartRef} className="w-full" style={{ height: 360 }} />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Assigned</h2>
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-500">
                                Chart
                                <select
                                    className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white"
                                    value={assignedChartType}
                                    onChange={(e) => setAssignedChartType(e.target.value as 'bar' | 'line' | 'pie')}
                                >
                                    <option value="bar">Bar</option>
                                    <option value="line">Line</option>
                                    <option value="pie">Pie</option>
                                </select>
                            </label>
                            <div className="text-sm text-gray-500">Assigned by/to you</div>
                        </div>
                    </div>

                    <div ref={assignedChartRef} className="w-full" style={{ height: 360 }} />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Assigned To Users</h2>
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-gray-500">
                                Chart
                                <select
                                    className="ml-2 border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white"
                                    value={assignedToChartType}
                                    onChange={(e) => setAssignedToChartType(e.target.value as 'bar' | 'line' | 'pie')}
                                >
                                    <option value="bar">Bar</option>
                                    <option value="line">Line</option>
                                    <option value="pie">Pie</option>
                                </select>
                            </label>
                            <div className="text-sm text-gray-500">Tasks assigned by you</div>
                        </div>
                    </div>

                    <div ref={assignedToChartRef} className="w-full" style={{ height: 360 }} />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4 gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">Task Completion Trends</h2>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsGranularity}
                                onChange={(e) => setTrendsGranularity(e.target.value as 'daily' | 'weekly' | 'monthly')}
                            >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                            </select>
                            <input
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                type="date"
                                value={trendsStartDate}
                                onChange={(e) => setTrendsStartDate(e.target.value)}
                            />
                            <input
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                type="date"
                                value={trendsEndDate}
                                onChange={(e) => setTrendsEndDate(e.target.value)}
                            />
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsAssignee}
                                onChange={(e) => setTrendsAssignee(e.target.value)}
                            >
                                {trendsOptions.assignees.map((a) => (
                                    <option key={a} value={a}>
                                        {a === 'all' ? 'All Assignees' : a}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsCompany}
                                onChange={(e) => setTrendsCompany(e.target.value)}
                            >
                                {trendsOptions.companies.map((c) => (
                                    <option key={c} value={c}>
                                        {c === 'all' ? 'All Companies' : c}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={trendsBrand}
                                onChange={(e) => setTrendsBrand(e.target.value)}
                            >
                                {trendsOptions.brands.map((b) => (
                                    <option key={b} value={b}>
                                        {b === 'all' ? 'All Brands' : b}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div ref={trendsChartRef} className="w-full" style={{ height: 360 }} />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4 gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">Top Assignees</h2>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardMetric}
                                onChange={(e) => setLeaderboardMetric(e.target.value as 'completed' | 'rate')}
                            >
                                <option value="completed">Most Completed</option>
                                <option value="rate">Best Completion Rate</option>
                            </select>
                            <input
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                type="date"
                                value={leaderboardStartDate}
                                onChange={(e) => setLeaderboardStartDate(e.target.value)}
                            />
                            <input
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                type="date"
                                value={leaderboardEndDate}
                                onChange={(e) => setLeaderboardEndDate(e.target.value)}
                            />
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardCompany}
                                onChange={(e) => setLeaderboardCompany(e.target.value)}
                            >
                                {trendsOptions.companies.map((c) => (
                                    <option key={c} value={c}>
                                        {c === 'all' ? 'All Companies' : c}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardBrand}
                                onChange={(e) => setLeaderboardBrand(e.target.value)}
                            >
                                {trendsOptions.brands.map((b) => (
                                    <option key={b} value={b}>
                                        {b === 'all' ? 'All Brands' : b}
                                    </option>
                                ))}
                            </select>
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={leaderboardTopN}
                                onChange={(e) => setLeaderboardTopN(Number(e.target.value) || 5)}
                            >
                                <option value={5}>Top 5</option>
                                <option value={10}>Top 10</option>
                                <option value={15}>Top 15</option>
                            </select>
                        </div>
                    </div>

                    <div ref={leaderboardChartRef} className="w-full" style={{ height: 360 }} />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between mb-4 gap-3">
                        <h2 className="text-lg font-semibold text-gray-900">Company / Brand Performance</h2>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <select
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                value={performanceGroupBy}
                                onChange={(e) => setPerformanceGroupBy(e.target.value as 'company' | 'brand')}
                            >
                                <option value="company">Group by Company</option>
                                <option value="brand">Group by Brand</option>
                            </select>
                            <input
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                type="date"
                                value={performanceStartDate}
                                onChange={(e) => setPerformanceStartDate(e.target.value)}
                            />
                            <input
                                className="border border-gray-300 rounded-lg px-2 py-1 text-gray-700 bg-white text-sm"
                                type="date"
                                value={performanceEndDate}
                                onChange={(e) => setPerformanceEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div ref={performanceChartRef} className="w-full" style={{ height: 360 }} />
                </div>
            </div>
        </div>
    );
};

export default AnalyzePage;
