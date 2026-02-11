import { Building, X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;

  bulkCompanyNames: string;
  setBulkCompanyNames: (next: string) => void;

  onSubmit: () => void | Promise<void>;
  isSubmitting: boolean;
};

const BulkAddCompaniesModal = ({
  open,
  onClose,
  bulkCompanyNames,
  setBulkCompanyNames,
  onSubmit,
  isSubmitting,
}: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Building className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Bulk Add Companies</h3>
                <p className="text-sm text-blue-100 mt-0.5">Add multiple companies (comma or new line separated)</p>
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
              <label className="block text-sm font-medium text-gray-900 mb-2">Company Names *</label>
              <textarea
                placeholder="Enter company names (comma or new line separated)\nExample:\nCompany A, Company B\nor\nCompany A\nCompany B"
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px]"
                value={bulkCompanyNames}
                onChange={(e) => setBulkCompanyNames(e.target.value)}
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
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding Companies...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Add Companies
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddCompaniesModal;
