import { Tag, X } from 'lucide-react';

type BulkBrandForm = {
  company: string;
  brandNames: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  bulkBrandForm: BulkBrandForm;
  setBulkBrandForm: (next: BulkBrandForm) => void;

  availableCompanies: string[];

  onSubmit: () => void;
  isSubmitting: boolean;
};

const BulkAddBrandsModal = ({
  open,
  onClose,
  bulkBrandForm,
  setBulkBrandForm,
  availableCompanies,
  onSubmit,
  isSubmitting,
}: Props) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Tag className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Bulk Add Brands</h3>
                <p className="text-sm text-emerald-100 mt-0.5">Add multiple brands for a company</p>
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
                value={bulkBrandForm.company}
                onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, company: e.target.value })}
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <label className="block text-sm font-medium text-gray-900 mb-2">Brand Names *</label>
              <textarea
                placeholder="Enter brand names (comma or new line separated)\nExample:\nBrand 1, Brand 2, Brand 3\nor\nBrand 1\nBrand 2\nBrand 3"
                className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[150px]"
                value={bulkBrandForm.brandNames}
                onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, brandNames: e.target.value })}
              />
              <p className="mt-1 text-xs text-gray-500">Separate brand names with commas or new lines</p>
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
                ? 'bg-emerald-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'}`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Adding Brands...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Add Brands
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAddBrandsModal;
