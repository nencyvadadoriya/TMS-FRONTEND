import { Edit, X } from 'lucide-react';
import * as React from 'react';
import mdImpexAccessService from '../../Services/MdImpexAccess.services';
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

  currentUserEmail: string;
  currentUser?: UserType;
};

const normalizeMdEmail = (value: unknown): string => {
  const raw = (value == null ? "" : String(value)).trim().toLowerCase();
  if (!raw) return "";
  const marker = ".deleted.";
  const idx = raw.indexOf(marker);
  const base = idx === -1 ? raw : raw.slice(0, idx).trim();
  return base;
};

// Helper functions defined outside component to avoid recreation
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeRoleKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
const normalizeCompanyKey = (v: unknown) => String(v || '').trim().toLowerCase().replace(/\s+/g, '');

const MdImpexEditTaskModal = ({
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
  currentUserEmail,
  currentUser,
}: Props) => {
  // ========== ALL HOOKS AT THE TOP (before any early return) ==========
  const [mdMembers, setMdMembers] = React.useState<UserType[]>([]);
  const [mdAllowedTaskTypes, setMdAllowedTaskTypes] = React.useState<string[]>([]);
  const [mdAllowedBrands, setMdAllowedBrands] = React.useState<string[]>([]);
  const [loadingAccess, setLoadingAccess] = React.useState(false);

  // Memoize role/id values - must be before early return
  const myRoleKey = React.useMemo(() => normalizeRoleKey((currentUser as any)?.role || ''), [currentUser]);
  const myId = React.useMemo(() => String((currentUser as any)?.id || (currentUser as any)?._id || '').trim(), [currentUser]);
  const myManagerId = React.useMemo(() => String((currentUser as any)?.managerId || '').trim(), [currentUser]);

  // Filter brands - must be before early return
  const filteredBrands = React.useMemo(() => {
    const allOptions = getEditFormBrandOptions();
    if (!open) return allOptions;
    if (mdAllowedBrands.length === 0) return allOptions;
    
    return allOptions.filter(opt => 
      mdAllowedBrands.some(allowed => 
        allowed.toLowerCase().trim() === opt.label.toLowerCase().trim()
      )
    );
  }, [open, mdAllowedBrands, getEditFormBrandOptions]);

  // Filter task types - must be before early return
  const filteredTaskTypes = React.useMemo(() => {
    if (!open) return [];
    const allTypes = availableTaskTypesForEditTask || [];
    if (mdAllowedTaskTypes.length === 0) return allTypes;

    const normalizedToOriginal = new Map<string, string>();
    allTypes.forEach(t => {
      normalizedToOriginal.set(t.toLowerCase().trim(), t);
    });

    const result: string[] = [];
    const seen = new Set<string>();

    mdAllowedTaskTypes.forEach(allowed => {
      const normalized = allowed.toLowerCase().trim();
      if (seen.has(normalized)) return;
      const displayValue = normalizedToOriginal.get(normalized) || allowed;
      result.push(displayValue);
      seen.add(normalized);
    });

    return result;
  }, [open, mdAllowedTaskTypes, availableTaskTypesForEditTask]);

  // Filter users - must be before early return
  const filteredUsers = React.useMemo(() => {
    if (!open || !editingTask) return [];
    if (mdMembers.length > 0) return mdMembers;

    const list = Array.isArray(users) ? users : [];
    const taskCompanyKey = normalizeCompanyKey(editingTask?.companyName || (editingTask as any)?.company);
    const myIdStr = myId;
    const myMgrId = myManagerId;

    const allowedPairIds = (() => {
      const ids = new Set<string>();
      if (myIdStr) ids.add(myIdStr);
      if (myRoleKey === 'rm') {
        list.forEach((u: any) => {
          const uid = String(u?.id || u?._id || '').trim();
          const urole = normalizeRoleKey(u?.role);
          const mgr = String(u?.managerId || '').trim();
          if (uid && urole === 'am' && mgr && myIdStr && mgr === myIdStr) ids.add(uid);
        });
      }
      if (myRoleKey === 'am' && myMgrId) {
        ids.add(myMgrId);
      }
      return ids;
    })();

    if (myRoleKey === 'sbm' && taskCompanyKey === 'speedecom') {
      return list.filter((u: any) => normalizeCompanyKey(u?.companyName || u?.company) === 'speedecom');
    }

    if (myRoleKey === 'rm' || myRoleKey === 'am') {
      return list.filter((u: any) => {
        const uid = String(u?.id || u?._id || '').trim();
        const urole = normalizeRoleKey(u?.role);
        const uCompanyKey = normalizeCompanyKey(u?.companyName || u?.company);
        if (taskCompanyKey && (!uCompanyKey || uCompanyKey !== taskCompanyKey)) return false;
        if (urole === 'sbm' || urole === 'admin' || urole === 'super_admin') return true;
        return Boolean(uid && allowedPairIds.has(uid));
      });
    }

    return list;
  }, [open, editingTask, mdMembers, users, myRoleKey, myId, myManagerId]);

  // Fetch access data effect - must be before early return
  React.useEffect(() => {
    const fetchAccessData = async () => {
      if (!open || !currentUserEmail) return;

      setLoadingAccess(true);
      try {
        const [membersRes, accessRes] = await Promise.all([
          mdImpexAccessService.getAllMembers(),
          mdImpexAccessService.getAllPersonAccess()
        ]);

        if (membersRes.success && membersRes.data) {
          const allMembers = (membersRes.data || []).map((m: any) => ({
            ...m,
            id: String(m.id || m._id || '')
          }));

          const currentNormalized = normalizeMdEmail(currentUserEmail);
          const myInfo = allMembers.find((m: any) => normalizeMdEmail(m.email) === currentNormalized);
          const myRoleNormalized = myInfo?.role?.toLowerCase()?.replace(/\s+/g, '_') || '';

          const myAccess = accessRes.success && accessRes.data
            ? accessRes.data.find((item: any) => normalizeMdEmail(item.assignedToEmail) === currentNormalized)
            : null;

          if (myAccess && myAccess.allowedAssignees && myAccess.allowedAssignees.length > 0) {
            const allowedIds = new Set((myAccess.allowedAssignees || []).map((id: any) => String(id)));
            const filteredMembers = allMembers.filter((m: any) =>
              allowedIds.has(String(m.id)) || normalizeMdEmail(m.email) === currentNormalized
            );

            setMdMembers(filteredMembers.map((m: any) => ({
              id: m.id,
              email: m.email,
              name: m.name
            })));

            setMdAllowedTaskTypes(myAccess.allowedTaskTypes || []);
            setMdAllowedBrands(myAccess.allowedBrands || []);
          } else if (['md_manager', 'admin', 'super_admin', 'troubleshoot_manager'].includes(myRoleNormalized)) {
            setMdMembers(allMembers.map((m: any) => ({
              id: m.id,
              email: m.email,
              name: m.name
            })));
            setMdAllowedTaskTypes(myAccess?.allowedTaskTypes || []);
            setMdAllowedBrands(myAccess?.allowedBrands || []);
          } else {
            const me = allMembers.filter((m: any) => normalizeMdEmail(m.email) === currentNormalized);
            setMdMembers(me.map((m: any) => ({
              id: m.id,
              email: m.email,
              name: m.name
            })));
            setMdAllowedTaskTypes([]);
            setMdAllowedBrands([]);
          }
        }
      } catch (error) {
        console.error("Error fetching access for MD Impex Edit:", error);
      } finally {
        setLoadingAccess(false);
      }
    };

    fetchAccessData();
  }, [open, currentUserEmail]);

  // ========== EARLY RETURN AFTER ALL HOOKS ==========
  if (!open || !editingTask) return null;

  // Computed values for rendering (not hooks)
  const taskAssigner = normalizeEmail(editingTask.assignedBy || (editingTask as any).assignedByUser?.email || '');
  const taskAssignee = normalizeEmail(editingTask.assignedTo || (editingTask as any).assignedToUser?.email || '');
  const currentEmail = normalizeEmail(currentUserEmail);
  const isAssigner = currentEmail === taskAssigner;
  const isAssignee = currentEmail === taskAssignee;
  const isSpeedEcom = normalizeCompanyKey(editingTask?.companyName || (editingTask as any)?.company) === 'speedecom';
  const shouldDisableAllForSpeedEcom = isSpeedEcom && isAssignee && !isAssigner;



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

                <h3 className="text-xl font-semibold text-white">Md Impex Edit Task</h3>

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

                  disabled={shouldDisableAllForSpeedEcom}

                />

                {editFormErrors.title && <p className="mt-1 text-sm text-red-600">{editFormErrors.title}</p>}

              </div>



              <div>

                <label className="block text-sm font-medium text-gray-900 mb-2">Email Address *</label>

                <select
                  value={editFormData.assignedTo}
                  onChange={(e) => onChange('assignedTo', e.target.value)}
                  className={`w-full px-4 py-3 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${editFormErrors.assignedTo ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={shouldDisableAllForSpeedEcom || loadingAccess}
                >
                  <option value="">{loadingAccess ? 'Loading access...' : 'Select email address'}</option>
                  {filteredUsers.map((user) => (
                    <option key={String(user.id || user.email)} value={String(user.email || '')}>
                      {user.name?.trim() ? `${user.name.trim()} (${user.email.trim()})` : (user.email || '').trim()}
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

                  disabled={shouldDisableAllForSpeedEcom}

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

                  min={new Date().toISOString().split('T')[0]}

                  disabled={shouldDisableAllForSpeedEcom || Boolean(disableDueDate)}

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

                        disabled={shouldDisableAllForSpeedEcom}

                        className={`py-2.5 text-xs font-medium rounded-lg border ${editFormData.priority === (priority as TaskPriority)

                          ? priority === 'high'

                            ? 'bg-rose-100 text-rose-700 border-rose-300'

                            : priority === 'medium'

                              ? 'bg-amber-100 text-amber-700 border-amber-300'

                              : 'bg-blue-100 text-blue-700 border-blue-300'

                          : 'bg-gray-100 text-gray-600 border-gray-300'} ${shouldDisableAllForSpeedEcom ? 'opacity-50 cursor-not-allowed' : ''}`}

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
                    disabled={shouldDisableAllForSpeedEcom || filteredTaskTypes.length === 0}
                  >
                    <option value="">Select a task type</option>
                    {filteredTaskTypes.map((typeName) => (
                      <option key={String(typeName)} value={String(typeName || '').trim()}>
                        {String(typeName || '').trim()}
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

                  disabled={availableCompanies.length === 1 || shouldDisableAllForSpeedEcom}

                >

                  <option value="">Select a company</option>

                  {availableCompanies.map((company) => (

                    <option key={company} value={company}>

                      {String(company || '').trim()}

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

                  disabled={!editFormData.companyName || shouldDisableAllForSpeedEcom || filteredBrands.length === 0}

                >

                  <option value="">Select a brand</option>

                  {filteredBrands.map((opt) => (

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

              disabled={isSubmitting || shouldDisableAllForSpeedEcom}

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



export default MdImpexEditTaskModal;

