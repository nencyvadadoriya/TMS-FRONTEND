import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import type { Brand, Company, UserType } from '../Types/Types';
import type { TaskTypeItem } from '../Services/TaskType.service';

import { companyService } from '../Services/Company.service';
import { brandService } from '../Services/Brand.service';
import { taskTypeService } from '../Services/TaskType.service';
import { companyBrandTaskTypeService } from '../Services/CompanyBrandTaskType.service';

type Props = {
  currentUser: UserType;
};

const normalizeText = (v: unknown) => (v == null ? '' : String(v)).trim();

const CompanyBrandTaskTypePage = ({ currentUser }: Props) => {
  const accessPermission = ((currentUser as any)?.permissions?.company_brand_task_type || 'deny').toString().toLowerCase();
  const canOpen = accessPermission !== 'deny';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);

  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');

  const [selectedTaskTypeIds, setSelectedTaskTypeIds] = useState<Set<string>>(new Set());

  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingTaskTypes, setLoadingTaskTypes] = useState(false);
  const [loadingMapping, setLoadingMapping] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedBrand = useMemo(() => {
    const id = selectedBrandId;
    return (brands || []).find((b: any) => String(b?.id || (b as any)?._id || '') === id) || null;
  }, [brands, selectedBrandId]);

  const loadCompanies = useCallback(async () => {
    setLoadingCompanies(true);
    try {
      const res = await companyService.getCompanies();
      if (res?.success && Array.isArray(res.data)) {
        setCompanies(res.data);
      } else {
        setCompanies([]);
      }
    } catch (e: any) {
      setCompanies([]);
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load companies');
    } finally {
      setLoadingCompanies(false);
    }
  }, []);

  const loadTaskTypes = useCallback(async () => {
    setLoadingTaskTypes(true);
    try {
      const res = await taskTypeService.getTaskTypes();
      if (res?.success && Array.isArray(res.data)) {
        setTaskTypes(res.data);
      } else {
        setTaskTypes([]);
      }
    } catch (e: any) {
      setTaskTypes([]);
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load task types');
    } finally {
      setLoadingTaskTypes(false);
    }
  }, []);

  const loadBrands = useCallback(async (companyName: string) => {
    const company = normalizeText(companyName);
    if (!company) {
      setBrands([]);
      return;
    }

    setLoadingBrands(true);
    try {
      const res = await brandService.getBrands({ company });
      if (res?.success && Array.isArray(res.data)) {
        setBrands(res.data);
      } else {
        setBrands([]);
      }
    } catch (e: any) {
      setBrands([]);
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load brands');
    } finally {
      setLoadingBrands(false);
    }
  }, []);

  const loadMapping = useCallback(async (companyName: string, brandId: string) => {
    const company = normalizeText(companyName);
    const bid = normalizeText(brandId);
    if (!company || !bid) {
      setSelectedTaskTypeIds(new Set());
      return;
    }

    setLoadingMapping(true);
    try {
      const res = await companyBrandTaskTypeService.getMapping({ companyName: company, brandId: bid });
      const ids = (res?.data?.taskTypes || [])
        .map((t) => String((t as any)?.id || (t as any)?._id || ''))
        .filter(Boolean);
      setSelectedTaskTypeIds(new Set(ids));
    } catch (e: any) {
      setSelectedTaskTypeIds(new Set());
      toast.error(e?.response?.data?.message || e?.message || 'Failed to load mapping');
    } finally {
      setLoadingMapping(false);
    }
  }, []);

  useEffect(() => {
    if (!canOpen) return;
    void loadCompanies();
    void loadTaskTypes();
  }, [canOpen, loadCompanies, loadTaskTypes]);

  useEffect(() => {
    if (!canOpen) return;
    setSelectedBrandId('');
    setSelectedTaskTypeIds(new Set());
    void loadBrands(selectedCompany);
  }, [canOpen, loadBrands, selectedCompany]);

  useEffect(() => {
    if (!canOpen) return;
    void loadMapping(selectedCompany, selectedBrandId);
  }, [canOpen, loadMapping, selectedBrandId, selectedCompany]);

  const persistMapping = useCallback(async (nextSelectedIds: Set<string>) => {
    const company = normalizeText(selectedCompany);
    const brandId = normalizeText(selectedBrandId);
    if (!company || !brandId) return;

    const brand = selectedBrand;
    const brandName = normalizeText((brand as any)?.name);

    setSaving(true);
    try {
      await companyBrandTaskTypeService.upsertMapping({
        companyName: company,
        brandId,
        brandName,
        taskTypeIds: Array.from(nextSelectedIds)
      });
      try {
        const event = new CustomEvent('companyBrandTaskTypesUpdated', { detail: { brandId, companyName: company, brandName } });
        window.dispatchEvent(event);
      } catch {
        // ignore
      }
      toast.success('Saved');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [selectedBrand, selectedBrandId, selectedCompany]);

  const toggleTaskType = async (taskTypeId: string) => {
    if (saving) return;

    const id = normalizeText(taskTypeId);
    if (!id) return;

    const next = new Set(selectedTaskTypeIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    setSelectedTaskTypeIds(next);
    await persistMapping(next);
  };

  if (!canOpen) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8">
        <div className="text-lg font-semibold text-gray-900">Access denied</div>
        <div className="mt-2 text-sm text-gray-600">
          You do not have permission to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 md:p-6">
      <div className="w-full">
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="text-2xl font-bold text-gray-900">Company Brand Task Type</div>
            <div className="mt-1 text-sm text-gray-600">
              Select a company and brand, then enable task types for that brand.
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Company</label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loadingCompanies}
                >
                  <option value="">Select company</option>
                  {companies.map((c: any) => (
                    <option key={String(c.id || c._id)} value={String(c.name || '').trim()}>
                      {String(c.name || '').trim()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Brand</label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={!selectedCompany || loadingBrands}
                >
                  <option value="">Select brand</option>
                  {brands.map((b: any) => (
                    <option key={String(b.id || b._id)} value={String(b.id || b._id)}>
                      {String(b.name || '').trim()}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">Task Types</div>
                <div className="text-sm text-gray-600 mt-1">
                  {selectedCompany && selectedBrand ? (
                    <span>
                      Configuring for {selectedCompany} / {String((selectedBrand as any)?.name || '').trim()}
                    </span>
                  ) : (
                    <span>Select a company and brand to configure</span>
                  )}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {(loadingTaskTypes || loadingMapping) ? 'Loading…' : saving ? 'Saving…' : ''}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {taskTypes.map((t) => {
                const id = String((t as any)?.id || (t as any)?._id || '');
                const checked = selectedTaskTypeIds.has(id);
                const disabled = !selectedCompany || !selectedBrandId || loadingMapping || saving;

                return (
                  <label
                    key={id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${checked
                      ? 'bg-indigo-50 border-indigo-200'
                      : 'bg-white border-gray-200'} ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleTaskType(id)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-medium text-gray-900">{String((t as any)?.name || '').trim()}</span>
                  </label>
                );
              })}

              {taskTypes.length === 0 && (
                <div className="text-sm text-gray-600">No task types found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyBrandTaskTypePage;
