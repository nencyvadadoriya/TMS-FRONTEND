import { Edit, X } from 'lucide-react';

import type { Task, TaskPriority, TaskStatus, UserType } from '../../Types/Types';

interface EditTaskForm {
  id: string;
  title: string;
  assignedTo: string;
  dueDate: string;
  priority: TaskPriority;
  taskType: string;
  companyName: string;
  brand: string;
  status: TaskStatus;
}

type FormErrors = Record<string, string>;

type Props = {
  open: boolean;
  editingTask: Task | null;
  onClose: () => void;

  editFormData: EditTaskForm;
  editFormErrors: FormErrors;
  onChange: (field: keyof EditTaskForm, value: string) => void;

  users: UserType[];
  availableTaskTypesForEditTask: string[];
  availableCompanies: string[];
  getEditFormBrandOptions: () => Array<{ value: string; label: string }>;

  onSubmit: () => void;
  isSubmitting: boolean;

  disableDueDate?: boolean;
};

const EditTaskModal = ({
  open,
  editingTask,
  onClose,
  editFormData,
  editFormErrors,
  onChange,
  users,
  availableTaskTypesForEditTask,
  availableCompanies,
  getEditFormBrandOptions,
  onSubmit,
  isSubmitting,
  disableDueDate,
}: Props) => {
  if (!open || !editingTask) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Edit className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Edit Task</h3>
                <p className="text-sm text-blue-100 mt-0.5">Update task details below</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white hover:bg-white/20 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Task Title *</label>
                <input
                  type="text"
                  placeholder="What needs to be done?"
                  className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.title ? 'border-red-500' : 'border-gray-300'}`}
                  value={editFormData.title}
                  onChange={(e) => onChange('title', e.target.value)}
                />
                {editFormErrors.title && <p className="mt-1 text-sm text-red-600">{editFormErrors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Assign To *</label>
                <select
                  value={editFormData.assignedTo}
                  onChange={(e) => onChange('assignedTo', e.target.value)}
                  className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.assignedTo ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">{editingTask.companyName?.toLowerCase() === 'speed e com' || editingTask.companyName?.toLowerCase() === 'speedecom' ? `Current Assignee: ${editFormData.assignedTo}` : 'Select team member'}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.email}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                {editFormErrors.assignedTo && <p className="mt-1 text-sm text-red-600">{editFormErrors.assignedTo}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => onChange('status', e.target.value as TaskStatus)}
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Due Date *</label>
                <input
                  type="date"
                  className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.dueDate ? 'border-red-500' : 'border-gray-300'}`}
                  value={editFormData.dueDate}
                  onChange={(e) => onChange('dueDate', e.target.value)}
                  disabled={Boolean(disableDueDate)}
                />
                {editFormErrors.dueDate && <p className="mt-1 text-sm text-red-600">{editFormErrors.dueDate}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'medium', 'high'].map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => onChange('priority', priority)}
                        className={`py-2.5 text-xs font-medium rounded-lg border ${editFormData.priority === (priority as TaskPriority)
                          ? priority === 'high'
                            ? 'bg-rose-100 text-rose-700 border-rose-300'
                            : priority === 'medium'
                              ? 'bg-amber-100 text-amber-700 border-amber-300'
                              : 'bg-blue-100 text-blue-700 border-blue-300'
                          : 'bg-gray-100 text-gray-600 border-gray-300'}`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Task Type</label>
                  <select
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editFormData.taskType}
                    onChange={(e) => onChange('taskType', e.target.value)}
                  >
                    {availableTaskTypesForEditTask.map((typeName) => (
                      <option key={typeName} value={typeName.toLowerCase()}>
                        {typeName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Company</label>
                <select
                  value={editFormData.companyName}
                  onChange={(e) => onChange('companyName', e.target.value)}
                  className={`w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.companyName ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={availableCompanies.length === 1}
                >
                  <option value="">Select a company</option>
                  {availableCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Brand</label>
                <select
                  className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={editFormData?.brand}
                  onChange={(e) => onChange('brand', e.target.value)}
                  disabled={!editFormData.companyName}
                >
                  <option value="">Select a brand</option>
                  {getEditFormBrandOptions().map((opt) => (
                    <option key={opt?.value} value={opt?.value}>
                      {opt?.label}
                    </option>
                  ))}
                </select>
                {!editFormData.companyName && (
                  <p className="mt-1 text-xs text-gray-500">Select a company first to see available brands</p>
                )}
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
                  Updating Task...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Update Task
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;
