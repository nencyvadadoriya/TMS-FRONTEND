import { Tag, X } from 'lucide-react';

type BulkBrandForm = {
  company: string;
  brandNames: string;
  groupNumber?: string;
  groupName?: string;
  rmEmail?: string;
  amEmail?: string;
};

type CompanyUser = {
  id: string | number;
  name: string;
  email: string;
  role?: string;
  managerId?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  bulkBrandForm: BulkBrandForm;
  setBulkBrandForm: (next: BulkBrandForm) => void;

  availableCompanies: string[];

  companyUsers?: CompanyUser[];

  currentUserRole?: string;

  onSubmit: () => void;
  isSubmitting: boolean;
};

const BulkAddBrandsModal = ({
  open,
  onClose,
  bulkBrandForm,
  setBulkBrandForm,
  availableCompanies,
  companyUsers,
  currentUserRole,
  onSubmit,
  isSubmitting,
}: Props) => {
  if (!open) return null;

  const parseGroupAndBrandColumns = (raw: string) => {
    const lines = (raw || '').split(/\r?\n/);
    const groupNumbers: string[] = [];
    const brandNames: string[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = (lines[i] || '').replace(/\r/g, '').trim();
      if (!line) continue;

      let g = '';
      let b = '';

      if (line.includes('\t')) {
        const parts = line.split(/\t+/);
        g = (parts[0] || '').trim();
        b = (parts.slice(1).join(' ') || '').trim();
      } else if (line.includes('|')) {
        const parts = line.split('|');
        g = (parts[0] || '').trim();
        b = (parts.slice(1).join('|') || '').trim();
      } else if (line.includes(',')) {
        const parts = line.split(',');
        g = (parts[0] || '').trim();
        b = (parts.slice(1).join(',') || '').trim();
      } else {
        const m = line.match(/^(\S+)\s+(.*)$/);
        if (m) {
          g = (m[1] || '').trim();
          b = (m[2] || '').trim();
        } else {
          g = line;
          b = '';
        }
      }

      const gLower = g.toLowerCase();
      const bLower = b.toLowerCase();
      const looksLikeHeader =
        i === 0 &&
        (gLower.includes('group') || gLower.includes('number')) &&
        (bLower.includes('brand') || bLower.includes('name'));
      if (looksLikeHeader) continue;

      if (!g && !b) continue;
      if (g && !b) continue;
      if (!g && b) continue;

      groupNumbers.push(g);
      brandNames.push(b);
    }

    return { groupNumbers, brandNames };
  };

  const normalizedRole = (currentUserRole || '').toString().trim().toLowerCase();
  const canUseGroupFields =
    normalizedRole === 'admin' || normalizedRole === 'super_admin' || normalizedRole === 'abm' || normalizedRole === 'sbm';
  const companyKey = (bulkBrandForm.company || '').toString().trim().toLowerCase().replace(/\s+/g, '');
  const isSpeedEcomCompany = companyKey === 'speedecom';
  const showGroupFields = canUseGroupFields && isSpeedEcomCompany;

  const normalizeUserRole = (v: unknown) => (v || '').toString().trim().toLowerCase();
  const safeUsers = Array.isArray(companyUsers) ? companyUsers : [];

  const rmUsers = safeUsers.filter((u) => normalizeUserRole(u.role) === 'rm');
  const allAmUsers = safeUsers.filter((u) => {
    const r = normalizeUserRole(u.role);
    return r === 'am' || r === 'ar';
  });

  const selectedRm = rmUsers.find((u) => (u.email || '').toString().trim().toLowerCase() === (bulkBrandForm.rmEmail || '').toString().trim().toLowerCase());
  const selectedRmId = selectedRm?.id ? selectedRm.id.toString() : '';
  const filteredAmUsers = selectedRmId
    ? allAmUsers.filter((u) => (u.managerId || '').toString() === selectedRmId)
    : allAmUsers;

  const handleRmChange = (rmEmail: string) => {
    const nextRm = (rmEmail || '').toString();
    const nextRmUser = rmUsers.find((u) => (u.email || '').toString().trim().toLowerCase() === nextRm.trim().toLowerCase());
    const nextRmId = nextRmUser?.id ? nextRmUser.id.toString() : '';
    const nextFiltered = nextRmId
      ? allAmUsers.filter((u) => (u.managerId || '').toString() === nextRmId)
      : allAmUsers;

    const currentAm = (bulkBrandForm.amEmail || '').toString().trim().toLowerCase();
    const stillValid = nextFiltered.some((u) => (u.email || '').toString().trim().toLowerCase() === currentAm);
    const nextAm = stillValid
      ? bulkBrandForm.amEmail
      : nextFiltered.length === 1
        ? nextFiltered[0].email
        : nextFiltered.length > 0
          ? nextFiltered[0].email
          : '';

    setBulkBrandForm({
      ...bulkBrandForm,
      rmEmail: rmEmail,
      amEmail: nextAm,
    });
  };

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

            {showGroupFields && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Paste (Group Number + Brand Name) *</label>
                  <textarea
                    placeholder="Paste 2 columns from Excel (Group Number and Brand Name)\nExample:\nG-01\tBrand A\nG-02\tBrand B"
                    className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[110px]"
                    value={bulkBrandForm.brandNames}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = parseGroupAndBrandColumns(raw);

                      setBulkBrandForm({
                        ...bulkBrandForm,
                        brandNames: raw,
                        groupNumber: parsed.groupNumbers.join('\n'),
                        groupName: parsed.brandNames.join('\n'),
                      });
                    }}
                  />
                  <p className="mt-1 text-xs text-gray-500">Paste rows like: GroupNumber[TAB]BrandName. Also supports | or comma.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Group Numbers *</label>
                    <textarea
                      placeholder="Paste Group Number column here\nExample:\nG-01\nG-02\nG-03"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[150px]"
                      value={bulkBrandForm.groupNumber || ''}
                      onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, groupNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Brand Names *</label>
                    <textarea
                      placeholder="Paste Brand Name column here\nExample:\nBrand A\nBrand B\nBrand C"
                      className="w-full px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[150px]"
                      value={bulkBrandForm.groupName || ''}
                      onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, groupName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">RM Email</label>
                    <select
                      value={bulkBrandForm.rmEmail || ''}
                      onChange={(e) => handleRmChange(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="">Select RM</option>
                      {rmUsers.map((u) => (
                        <option key={u.id} value={u.email}>
                          {u.name || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">AM Email</label>
                    <select
                      value={bulkBrandForm.amEmail || ''}
                      onChange={(e) => setBulkBrandForm({ ...bulkBrandForm, amEmail: e.target.value })}
                      className="w-full px-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="">Select AM</option>
                      {filteredAmUsers.map((u) => (
                        <option key={u.id} value={u.email}>
                          {u.name || u.email} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {!showGroupFields && (
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
            )}
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
