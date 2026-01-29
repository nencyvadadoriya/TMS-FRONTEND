import { Tag, X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;

  bulkTaskTypeCompany: string;
  setBulkTaskTypeCompany: (next: string) => void;

  bulkTaskTypeNames: string;
  setBulkTaskTypeNames: (next: string) => void;

  availableCompanies: string[];

  onSubmit: () => void;
  isSubmitting: boolean;
};

const BulkAddTaskTypesModal = ({
  open,
  onClose,
  bulkTaskTypeCompany,
  setBulkTaskTypeCompany,
  bulkTaskTypeNames,
  setBulkTaskTypeNames,
  availableCompanies,
  onSubmit,
  isSubmitting,
}: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Bulk Add Task Types</h3>
                <p className="text-sm text-indigo-100 mt-0.5">Add multiple task types (comma or new line separated)</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white hover:bg-white/20 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Company *</label>
              <select
                value={bulkTaskTypeCompany}
                onChange={(e) => setBulkTaskTypeCompany(e.target.value)}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ backgroundImage: 'none' }}
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
              <label className="block text-sm font-medium text-gray-900 mb-2">Task Types *</label>
              <textarea
                placeholder="Enter task types (comma or new line separated)\nExample:\nBug, Feature\nor\nBug\nFeature"
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[150px]"
                value={bulkTaskTypeNames}
                onChange={(e) => setBulkTaskTypeNames(e.target.value)}
              />
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
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding Types...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Add Types
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddTaskTypesModal;
