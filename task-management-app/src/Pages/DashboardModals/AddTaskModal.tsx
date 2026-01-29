import { PlusCircle, X } from 'lucide-react';

import type { TaskPriority, UserType } from '../../Types/Types';

interface NewTaskForm {
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  taskType: string;
  companyName: string;
  brand: string;
}

type FormErrors = Record<string, string>;

type Props = {
  open: boolean;
  onClose: () => void;

  newTask: NewTaskForm;
  formErrors: FormErrors;
  onChange: (field: keyof NewTaskForm, value: string) => void;

  users: UserType[];
  availableCompanies: string[];

  canBulkAddCompanies: boolean;
  onBulkAddCompanies: () => void | Promise<void>;

  canCreateBrand: boolean;
  canBulkAddBrands: boolean;
  onAddBrand: () => void;
  getAvailableBrands: () => string[];

  canBulkAddTaskTypes: boolean;
  onBulkAddTaskTypes: () => void | Promise<void>;
  availableTaskTypesForNewTask: string[];

  onSubmit: () => void;
  isSubmitting: boolean;
  isSbmUser?: boolean;
  showCompanyDropdownIcon?: boolean;
};

const AddTaskModal = ({
  open,
  onClose,
  newTask,
  formErrors,
  onChange,
  users,
  availableCompanies,
  canBulkAddCompanies,
  onBulkAddCompanies,
  canCreateBrand,
  canBulkAddBrands,
  onAddBrand,
  getAvailableBrands,
  canBulkAddTaskTypes,
  onBulkAddTaskTypes,
  availableTaskTypesForNewTask,
  onSubmit,
  isSubmitting,
  isSbmUser,
  showCompanyDropdownIcon = false,
}: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Create New Task</h3>
                <p className="text-sm text-blue-100 mt-0.5">Fill in the details below to create a new task</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white hover:bg-white/20 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Task Title *</label>
              <input
                type="text"
                placeholder="What needs to be done?"
                className={`w-full px-4 py-3 md:py-3.5 text-sm md:text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                value={newTask.title}
                onChange={(e) => onChange('title', e.target.value)}
              />
              {formErrors.title && <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Due Date *</label>
              <input
                type="date"
                className={`w-full px-4 py-3 md:py-3.5 text-sm md:text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.dueDate ? 'border-red-500' : 'border-gray-300'}`}
                value={newTask.dueDate}
                onChange={(e) => onChange('dueDate', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
              {formErrors.dueDate && <p className="mt-1 text-sm text-red-600">{formErrors.dueDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Assign To *</label>
              <select
                value={newTask.assignedTo}
                onChange={(e) => onChange('assignedTo', e.target.value)}
                className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.assignedTo ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">Select team member</option>
                {users.map((user) => (
                  <option key={user.id} value={user.email}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              {formErrors.assignedTo && <p className="mt-1 text-sm text-red-600">{formErrors.assignedTo}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">Company *</label>
                <div className="flex items-center gap-2">
                  {canBulkAddCompanies && (
                    <button
                      type="button"
                      onClick={onBulkAddCompanies}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Bulk add
                    </button>
                  )}
                </div>
              </div>
              {/** Hide company dropdown arrow for all non-admin roles. Keep previous SBM behavior by OR-ing with isSbmUser. */}
              {(() => {
                const hideIcon = isSbmUser || !showCompanyDropdownIcon;
                const selectClass = `w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.companyName ? 'border-red-500' : 'border-gray-300'} ${hideIcon ? 'appearance-none' : ''}`;
                const selectStyle = hideIcon ? { backgroundImage: 'none' as const } : undefined;
                return (
                  <select
                    value={newTask.companyName}
                    onChange={(e) => onChange('companyName', e.target.value)}
                    className={selectClass}
                    style={selectStyle}
                    disabled={availableCompanies.length === 1}
                  >
                    <option value="">Select a company</option>
                    {availableCompanies.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                );
              })()}
              {formErrors.companyName && <p className="mt-1 text-sm text-red-600">{formErrors.companyName}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">Brand *</label>
                {canCreateBrand && (
                  <button
                    type="button"
                    onClick={onAddBrand}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  >
                    <PlusCircle className="h-3 w-3" />
                    {canBulkAddBrands ? 'Bulk Add Brands' : 'Add Brand'}
                  </button>
                )}
              </div>
              <select
                value={newTask.brand}
                onChange={(e) => onChange('brand', e.target.value)}
                className={`w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.brand ? 'border-red-500' : 'border-gray-300'}`}
                disabled={!newTask.companyName}
              >
                <option value="">Select a brand</option>
                {getAvailableBrands().map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
              {formErrors.brand && <p className="mt-1 text-sm text-red-600">{formErrors.brand}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">Task Type</label>
                {canBulkAddTaskTypes && (
                  <button
                    type="button"
                    onClick={onBulkAddTaskTypes}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Bulk add
                  </button>
                )}
              </div>
              <select
                className={`w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${availableTaskTypesForNewTask.length === 0
                  ? 'border-gray-200 bg-gray-50 text-gray-400'
                  : 'border-gray-300 hover:border-gray-400'}`}
                value={newTask.taskType}
                onChange={(e) => onChange('taskType', e.target.value)}
                disabled={availableTaskTypesForNewTask.length === 0}
              >
                {availableTaskTypesForNewTask.length === 0 ? (
                  <option value="">No task types available</option>
                ) : (
                  <>
                    <option value="" disabled>
                      Select task type
                    </option>
                    {availableTaskTypesForNewTask.map((typeName) => (
                      <option key={typeName} value={typeName.toLowerCase()}>
                        {typeName}
                      </option>
                    ))}
                  </>
                )}
              </select>
              {availableTaskTypesForNewTask.length === 0 && canBulkAddTaskTypes && (
                <p className="mt-1 text-xs text-amber-600">Add task types to continue</p>
              )}
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-900">Priority</label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['low', 'medium', 'high'].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => onChange('priority', priority)}
                    className={`py-2.5 text-xs font-medium rounded-lg border transition-all ${newTask.priority === (priority as TaskPriority)
                      ? priority === 'high'
                        ? 'bg-rose-100 text-rose-700 border-rose-300 shadow-sm'
                        : priority === 'medium'
                          ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-sm'
                          : 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                      : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl ${isSubmitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Creating Task...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Create Task
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
