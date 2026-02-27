import React, { useMemo, useState } from 'react';
import { X, Filter, RefreshCcw } from 'lucide-react';

interface AdvancedFiltersProps {
    filters: {
        status: string;
        priority: string;
        assigned: string;
        date: string;
        taskType: string;
        company: string;
        brand: string;
        rm?: string;
        rmTeam?: string;
    };

    availableCompanies: string[];
    availableTaskTypes: string[];
    availableBrands: string[];
    availableRms?: Array<{ id: string; name: string; email: string }>;
    getBrandLabel?: (brandName: string) => string;
    users?: any[];
    currentUser?: { email: string; role: string };
    onFilterChange: (filterType: string, value: string) => void;
    onResetFilters: () => void;

    onApplyFilters?: () => void;
    showFilters: boolean;
    onToggleFilters: () => void;
}

type MultiSelectOption = {
    value: string;
    label: string;
};

function parseMultiValue(value: string): string[] {
    const raw = (value || '').toString().trim();
    if (!raw || raw === 'all') return [];
    return raw
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
}

function serializeMultiValue(values: string[]): string {
    const unique = Array.from(new Set((values || []).map(v => String(v || '').trim()).filter(Boolean)));
    if (unique.length === 0) return 'all';
    return unique.join(',');
}

const MultiSelectFilter: React.FC<{
    label: string;
    placeholder: string;
    value: string;
    options: MultiSelectOption[];
    onChange: (nextValue: string) => void;
}> = ({ label, placeholder, value, options, onChange }) => {
    const [open, setOpen] = useState(false);
    const selected = useMemo(() => new Set(parseMultiValue(value)), [value]);
    const selectedCount = selected.size;

    const displayText = selectedCount === 0
        ? placeholder
        : selectedCount === 1
            ? (options.find(o => selected.has(o.value))?.label || placeholder)
            : `${selectedCount} selected`;

    return (
        <div className="relative">
            <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg text-left bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
                {displayText}
            </button>

            {open ? (
                <div className="absolute z-50 mt-2 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                    <div className="space-y-2">
                        {options.map((opt) => {
                            const checked = selected.has(opt.value);
                            return (
                                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) => {
                                            const next = new Set(selected);
                                            if (e.target.checked) next.add(opt.value);
                                            else next.delete(opt.value);
                                            onChange(serializeMultiValue(Array.from(next)));
                                        }}
                                        className="h-4 w-4"
                                    />
                                    <span className="truncate">{opt.label}</span>
                                </label>
                            );
                        })}
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                onChange('all');
                            }}
                            className="px-3 py-1 text-xs border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Done
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
    filters,
    availableCompanies,
    availableTaskTypes,
    availableBrands,
    availableRms,
    getBrandLabel,
    users,
    currentUser,
    onFilterChange,
    onResetFilters,
    onApplyFilters,
    showFilters,
    onToggleFilters,
}) => {
    if (!showFilters) return null;

    const roleKey = (currentUser?.role || '')
        .toString()
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');

    const canSeeCompanyFilter = roleKey === 'admin' || roleKey === 'super_admin';

    const formatLabel = (value: string) => {
        const v = (value || '').toString();
        if (!v) return v;
        const trimmed = v.trim();
        if (!trimmed) return trimmed;
        const hasUpper = /[A-Z]/.test(trimmed);
        if (hasUpper) return trimmed;
        return trimmed
            .split(' ')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const formatBrandOptionLabel = (brand: string) => {
        if (typeof getBrandLabel === 'function') {
            const label = getBrandLabel(brand);
            if (label) return label;
        }
        return formatLabel(brand);
    };

    // Calculate active filter count
    const getActiveFilterCount = () => {
        let count = 0;
        Object.entries(filters).forEach(([key, value]) => {
            if (key === 'brand') return;
            if (key === 'company' && !canSeeCompanyFilter) return;
            if (key === 'rm' && roleKey !== 'sbm') return;
            if (value !== 'all') count++;
        });
        return count;
    };

    const activeFilterCount = getActiveFilterCount();

    const normalizeText = (value: unknown): string => {
        return (value == null ? '' : String(value)).trim().toLowerCase();
    };

    const normalizeRoleKey = (value: unknown): string => {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    };

    const handleRmChange = (nextRmEmail: string) => {
        const email = normalizeText(nextRmEmail);
        if (!email || email === 'all') {
            onFilterChange('rm', 'all');
            onFilterChange('rmTeam', '');
            return;
        }

        const list: any[] = Array.isArray(users) ? users : [];
        const selectedRmDoc: any = list.find((u: any) => normalizeText(u?.email) === email);
        const selectedRmId = String(selectedRmDoc?.id || selectedRmDoc?._id || '').trim();

        const teamEmails = selectedRmId
            ? list
                .filter((u: any) => String(u?.managerId || '').trim() === selectedRmId)
                .filter((u: any) => {
                    const r = normalizeRoleKey(u?.role);
                    return r === 'am' || r === 'ar';
                })
                .map((u: any) => normalizeText(u?.email))
                .filter(Boolean)
            : [];

        const allowedAssignees = [email, ...teamEmails].filter(Boolean);

        onFilterChange('rm', email);
        onFilterChange('rmTeam', allowedAssignees.join(','));
    };

    return (
        <div className="mt-4 mb-8 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Filter className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
                    {activeFilterCount > 0 && (
                        <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-1 rounded-full">
                            {activeFilterCount} active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onResetFilters}
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        <RefreshCcw className="h-4 w-4" />
                        Clear all
                    </button>
                    <button
                        onClick={onToggleFilters}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Status Filter */}
                <MultiSelectFilter
                    label="Status"
                    placeholder="All Status"
                    value={filters.status}
                    onChange={(v) => onFilterChange('status', v)}
                    options={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'in-progress', label: 'In Progress' },
                        { value: 'reassigned', label: 'Reassigned' },
                        { value: 'completed', label: 'Completed' },
                    ]}
                />

                {canSeeCompanyFilter ? (
                    <MultiSelectFilter
                        label="Company"
                        placeholder="All Companies"
                        value={filters.company}
                        onChange={(v) => onFilterChange('company', v)}
                        options={availableCompanies.map((companyName) => ({
                            value: companyName,
                            label: companyName,
                        }))}
                    />
                ) : null}

                {/* Priority Filter */}
                <MultiSelectFilter
                    label="Priority"
                    placeholder="All Priority"
                    value={filters.priority}
                    onChange={(v) => onFilterChange('priority', v)}
                    options={[
                        { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Low' },
                    ]}
                />

                {/* Assigned Filter */}
                <MultiSelectFilter
                    label="Assigned"
                    placeholder="Everyone"
                    value={filters.assigned}
                    onChange={(v) => onFilterChange('assigned', v)}
                    options={[
                        { value: 'assigned-to-me', label: 'Assigned To Me' },
                        { value: 'assigned-by-me', label: 'Assigned By Me' },
                    ]}
                />

                {/* Due Date Filter */}
                <MultiSelectFilter
                    label="Due Date"
                    placeholder="All Dates"
                    value={filters.date}
                    onChange={(v) => onFilterChange('date', v)}
                    options={[
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'This Week' },
                        { value: 'overdue', label: 'Overdue' },
                    ]}
                />

                {/* Task Type Filter */}
                <MultiSelectFilter
                    label="Type"
                    placeholder="All Types"
                    value={filters.taskType}
                    onChange={(v) => onFilterChange('taskType', v)}
                    options={availableTaskTypes.map((typeName) => ({
                        value: typeName,
                        label: typeName,
                    }))}
                />

                {/* Brand Filter */}
                <MultiSelectFilter
                    label="Brand"
                    placeholder={filters.company === 'all' ? 'All Brands' : `All ${filters.company} Brands`}
                    value={filters.brand}
                    onChange={(v) => onFilterChange('brand', v)}
                    options={availableBrands.map((brand) => ({
                        value: brand,
                        label: formatBrandOptionLabel(brand),
                    }))}
                />

                {roleKey === 'sbm' ? (
                    <MultiSelectFilter
                        label="RM"
                        placeholder="All RM"
                        value={normalizeText((filters as any).rm || '') || 'all'}
                        onChange={(v) => handleRmChange(v)}
                        options={(availableRms || []).map((rm) => ({
                            value: normalizeText(rm.email),
                            label: rm.name || rm.email,
                        }))}
                    />
                ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
                {onApplyFilters ? (
                    <button
                        onClick={onApplyFilters}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        Apply Filters
                    </button>
                ) : (
                    <button
                        onClick={onResetFilters}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
                    >
                        Reset Filters
                    </button>
                )}
            </div>
        </div>
    );
};

export default AdvancedFilters;