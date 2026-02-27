import React from 'react';
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
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Status
                    </label>
                    <select
                        value={filters.status}
                        onChange={(e) => onFilterChange('status', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in-progress">In Progress</option>
                        <option value="reassigned">Reassigned</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                {canSeeCompanyFilter ? (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                            Company
                        </label>
                        <select
                            value={filters.company}
                            onChange={(e) => onFilterChange('company', e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All Companies</option>
                            {availableCompanies.map((companyName) => (
                                <option key={companyName} value={companyName}>
                                    {companyName}
                                </option>
                            ))}
                        </select>
                    </div>
                ) : null}

                {/* Priority Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Priority
                    </label>
                    <select
                        value={filters.priority}
                        onChange={(e) => onFilterChange('priority', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Priority</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                </div>

                {/* Assigned Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Assigned
                    </label>
                    <select
                        value={filters.assigned}
                        onChange={(e) => onFilterChange('assigned', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Everyone</option>
                        <option value="assigned-to-me">Assigned To Me</option>
                        <option value="assigned-by-me">Assigned By Me</option>
                    </select>
                </div>

                {/* Due Date Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Due Date
                    </label>
                    <select
                        value={filters.date}
                        onChange={(e) => onFilterChange('date', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="overdue">Overdue</option>
                    </select>
                </div>

                {/* Task Type Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Type
                    </label>
                    <select
                        value={filters.taskType}
                        onChange={(e) => onFilterChange('taskType', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">All Types</option>
                        {availableTaskTypes.map((typeName) => (
                            <option key={typeName} value={typeName}>
                                {typeName}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Brand Filter */}
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                        Brand
                    </label>
                    <select
                        value={filters.brand}
                        onChange={(e) => onFilterChange('brand', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">
                            {filters.company === 'all' ? 'All Brands' : `All ${filters.company} Brands`}
                        </option>
                        {availableBrands.map((brand) => (
                            <option key={brand} value={brand}>
                                {formatBrandOptionLabel(brand)}
                            </option>
                        ))}
                    </select>
                </div>

                {roleKey === 'sbm' ? (
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
                            RM
                        </label>
                        <select
                            value={normalizeText((filters as any).rm || '') || 'all'}
                            onChange={(e) => handleRmChange(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="all">All RM</option>
                            {(availableRms || []).map((rm) => (
                                <option key={rm.id || rm.email} value={normalizeText(rm.email)}>
                                    {rm.name || rm.email}
                                </option>
                            ))}
                        </select>
                    </div>
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