import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Users, Shield, X, Check, Loader2, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import mdImpexAccessService from '../Services/MdImpexAccess.services';
import { taskTypeService, type TaskTypeItem } from '../Services/TaskType.service';
import { brandService } from '../Services/Brand.service';

import toast from 'react-hot-toast';

type MemberItem = {
  id: string;
  email: string;
  name: string;
  role: string;
  companyName: string;
};

type RoleItem = {
  id: string;
  role: string;
  emails: string[];
  description: string;
  createdAt: string;
  updatedAt?: string;
};

type PersonAccessItem = {
  id: string;
  assignedToEmail: string;
  assignedToName: string;
  assignedToRole: string;
  accessRole: string;
  allowedAssignees: string[];
  allowedTaskTypes?: string[];
  allowedBrands?: string[];
  createdAt: string;
  updatedAt?: string;
};

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'ob_manager', label: 'OB Manager' },
  { value: 'md_manager', label: 'MD Manager' },
  { value: 'troubleshoot_manager', label: 'Troubleshoot Manager' },
];

export default function MdImpexAccessPage() {
  // Updated: MD Manager full access logic - v2.0
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [personAccess, setPersonAccess] = useState<PersonAccessItem[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskTypeItem[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Create role modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [addingRole, setAddingRole] = useState(false);
  const [newRole, setNewRole] = useState({ key: '', name: '' });

  // Person-wise access state
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedPerson, setSelectedPerson] = useState('');
  const [allowedAssignees, setAllowedAssignees] = useState<string[]>([]);
  const [allowedTaskTypes, setAllowedTaskTypes] = useState<string[]>([]);
  const [allowedBrands, setAllowedBrands] = useState<string[]>([]);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPersonAccess, setEditingPersonAccess] = useState<PersonAccessItem | null>(null);

  // Combined roles for display and selection
  const allRoles = useMemo(() => {
    const dynamicRoles = roles.map(r => ({
      value: r.role.toLowerCase().replace(/\s+/g, '_'),
      label: r.role,
      isDynamic: true,
      id: r.id
    }));

    // Filter out static roles that might already exist in dynamic roles to avoid duplicates
    const filteredStatic = ROLE_OPTIONS
      .filter(opt => !dynamicRoles.some(dr => dr.value === opt.value))
      .map(opt => ({ ...opt, isDynamic: false, id: undefined }));

    return [...filteredStatic, ...dynamicRoles];
  }, [roles]);

  // Pagination state for Roles List
  const [currentRolePage, setCurrentRolePage] = useState(1);
  const rolesPerPage = 5;

  const paginatedRoles = useMemo(() => {
    const startIndex = (currentRolePage - 1) * rolesPerPage;
    return allRoles.slice(startIndex, startIndex + rolesPerPage);
  }, [allRoles, currentRolePage]);

  const totalRolePages = Math.ceil(allRoles.length / rolesPerPage);

  // Pagination state for Person-wise Access
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Paginated person access
  const paginatedPersonAccess = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return personAccess.slice(startIndex, startIndex + itemsPerPage);
  }, [personAccess, currentPage]);

  const totalPages = Math.ceil(personAccess.length / itemsPerPage);

  const getRoleLabel = (roleValue: string) => {
    const found = allRoles.find(r => r.value === roleValue);
    if (found) return found.label;
    
    // Fallback: check if it's a raw role name from the item
    const roleFromRoles = roles.find(r => r.role.toLowerCase().replace(/\s+/g, '_') === roleValue || r.role === roleValue);
    if (roleFromRoles) return roleFromRoles.role;

    return roleValue;
  };

  const loadTaskTypes = async () => {
    try {
      const res = await taskTypeService.getTaskTypes();
      if (res?.success) setTaskTypes(res.data || []);
      else setTaskTypes([]);
    } catch {
      setTaskTypes([]);
    }
  };

  const loadBrands = async () => {
    try {
      // Fetch all brands with a high limit to ensure we get all of them
      // We use getBrands with includeDeleted: true to match the main brand page logic
      const res = await brandService.getBrands({ limit: 5000, includeDeleted: true });
      if (res?.success && Array.isArray(res.data)) {
        // Filter specifically for MD Impex, being flexible with naming
        // This includes brands created by managers as long as they are assigned to MD Impex
        const mdImpexBrands = res.data.filter((b: any) => {
          const company = String(b?.company || b?.companyName || "").trim().toLowerCase().replace(/\s+/g, "");
          return company === "mdimpex";
        });
        setBrands(mdImpexBrands);
      } else {
        setBrands([]);
      }
    } catch (error) {
      console.error("Failed to load brands", error);
      setBrands([]);
    }
  };

  const memberById = useMemo(() => {
    const map = new Map<string, MemberItem>();
    (members || []).forEach((m) => {
      if (m?.id) map.set(m.id, m);
    });
    return map;
  }, [members]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [rolesRes, membersRes, personAccessRes] = await Promise.all([
        mdImpexAccessService.getAllRoles(),
        mdImpexAccessService.getAllMembers(),
        mdImpexAccessService.getAllPersonAccess()
      ]);

      if (rolesRes.success) {
        setRoles(rolesRes.data);
      } else {
        setError(rolesRes.message);
      }

      if (membersRes.success) {
        setMembers(membersRes.data);
      } else {
        setError(membersRes.message);
      }

      if (personAccessRes.success) {
        setPersonAccess(personAccessRes.data);
      } else {
        setError(personAccessRes.message);
      }
      
      // Load brands as well
      await loadBrands();
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    void loadTaskTypes();
  }, []);

  // Filter members by selected role
  const filteredMembers = useMemo(() => {
    if (!selectedRole) return [];
    return members.filter(m => m.role.toLowerCase() === selectedRole.toLowerCase());
  }, [members, selectedRole]);

  // Filter available assignees (exclude selected person)
  const availableAssignees = useMemo(() => {
    if (!selectedPerson) return [];
    return members.filter(m => m.email !== selectedPerson);
  }, [members, selectedPerson]);

  const handleCreateRole = async () => {
    const key = (newRole.key || '').trim().toLowerCase();
    const name = (newRole.name || '').trim();

    if (!key || !name) {
      toast.error('Role key and name are required');
      return;
    }

    if (!/^[a-z0-9_-]+$/.test(key)) {
      toast.error('Role key can contain only a-z, 0-9, _ and -');
      return;
    }

    setAddingRole(true);
    try {
      // Use mdImpexAccessService for MD Manager permissions
      const res = await mdImpexAccessService.createRole({
        role: name,
        description: ''
      });
      if (res.success) {
        toast.success('Role added');
        setShowCreateModal(false);
        setNewRole({ key: '', name: '' });
        await loadData();
      } else {
        toast.error(res.message || 'Failed to add role');
      }
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data?.message || e?.response?.data?.msg || e?.message;
      toast.error(`${status ? `(${status}) ` : ''}${message || 'Failed to add role'}`);
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete role "${roleName}"?`)) {
      return;
    }

    const res = await mdImpexAccessService.deleteRole(roleId);
    if (res.success) {
      toast.success('Role deleted successfully');
      await loadData();
    } else {
      toast.error(res.message);
    }
  };

  const handleSavePersonAccess = async () => {
    if (!selectedPerson) {
      toast.error('Please select person');
      return;
    }

    setSaving(true);
    const payload = {
      assignedToEmail: selectedPerson,
      assignedToRole: selectedRole,
      allowedAssignees: allowedAssignees,
      allowedTaskTypes: allowedTaskTypes,
      allowedBrands: allowedBrands
    };

    let res;
    if (editingPersonAccess) {
      res = await mdImpexAccessService.updatePersonAccess(editingPersonAccess.id, {
        allowedAssignees: allowedAssignees,
        allowedTaskTypes: allowedTaskTypes,
        allowedBrands: allowedBrands
      });
    } else {
      res = await mdImpexAccessService.createPersonAccess(payload);
    }

    if (res.success) {
      toast.success(`Person access ${editingPersonAccess ? 'updated' : 'created'} successfully`);
      setShowPersonModal(false);
      resetPersonForm();
      await loadData();
    } else {
      toast.error(res.message);
    }
    setSaving(false);
  };

  const handleEditPersonAccess = (item: PersonAccessItem) => {
    setEditingPersonAccess(item);
    setSelectedRole(item.assignedToRole);
    setSelectedPerson(item.assignedToEmail);
    setAllowedAssignees(item.allowedAssignees || []);
    setAllowedTaskTypes(item.allowedTaskTypes || []);
    setAllowedBrands(item.allowedBrands || []);
    setShowPersonModal(true);
  };

  const handleDeletePersonAccess = async (id: string, personName: string) => {
    if (!confirm(`Are you sure you want to delete access for "${personName}"?`)) {
      return;
    }

    const res = await mdImpexAccessService.deletePersonAccess(id);
    if (res.success) {
      toast.success('Person access deleted successfully');
      await loadData();
    } else {
      toast.error(res.message);
    }
  };

  const resetPersonForm = () => {
    setSelectedRole('');
    setSelectedPerson('');
    setAllowedAssignees([]);
    setAllowedTaskTypes([]);
    setAllowedBrands([]);
    setEditingPersonAccess(null);
  };

  const toggleAssignee = (userId: string) => {
    setAllowedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(e => e !== userId)
        : [...prev, userId]
    );
  };

  const toggleTaskType = (taskTypeName: string) => {
    const key = (taskTypeName || '').toString().trim().toLowerCase();
    if (!key) return;
    setAllowedTaskTypes(prev =>
      prev.includes(key)
        ? prev.filter(t => t !== key)
        : [...prev, key]
    );
  };

  const toggleBrand = (brandName: string) => {
    const key = (brandName || '').toString().trim();
    if (!key) return;
    setAllowedBrands(prev =>
      prev.includes(key)
        ? prev.filter(b => b !== key)
        : [...prev, key]
    );
  };

  const toggleAllAssignees = () => {
    if (allowedAssignees.length === availableAssignees.length) {
      setAllowedAssignees([]);
    } else {
      setAllowedAssignees(availableAssignees.map(m => m.id));
    }
  };

  const toggleAllTaskTypes = () => {
    if (allowedTaskTypes.length === taskTypes.length) {
      setAllowedTaskTypes([]);
    } else {
      setAllowedTaskTypes(taskTypes.map(t => String(t.name || '').trim().toLowerCase()));
    }
  };

  const toggleAllBrands = () => {
    if (allowedBrands.length === brands.length) {
      setAllowedBrands([]);
    } else {
      setAllowedBrands(brands.map(b => String(b.name || '').trim()));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-6 h-6 text-blue-600" />
              MD Impex Access Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage roles and person-wise access for MD Impex team members
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPersonModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Person Access
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Role
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Members List */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    MD Impex Members ({members.length})
                  </h2>
                </div>
                <div className="flex flex-col h-[500px]">
                  {members.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center flex-1 flex flex-col justify-center">No members found</p>
                  ) : (
                    <ul className="divide-y divide-gray-100 flex-1 overflow-y-auto custom-scrollbar">
                      {members.map((member) => (
                        <li key={member.id} className="p-3 hover:bg-gray-50">
                          <p className="font-medium text-gray-900 text-sm">{member.name}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                          <p className="text-xs text-blue-600 mt-1">{member.role}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Roles List */}
            <div className="xl:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    Roles ({roles.length})
                  </h2>
                </div>
                <div className="flex flex-col h-[500px]">
                  {allRoles.length === 0 ? (
                    <div className="p-8 text-center flex-1 flex flex-col justify-center">
                      <p className="text-gray-500">No roles created yet</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Create your first role
                      </button>
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-gray-100 flex-1 overflow-hidden">
                        {paginatedRoles.map((role) => (
                          <li key={role.value} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-gray-900 text-sm">{role.label}</h3>
                                  {role.isDynamic ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded">Dynamic</span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-600 rounded">Static</span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                  {role.isDynamic ? (roles.find(r => r.id === role.id)?.emails?.length || 0) : 'Static'} role
                                </p>
                              </div>
                              {role.isDynamic && role.id && (
                                <button
                                  onClick={() => handleDeleteRole(role.id!, role.label)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Role"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {/* Roles Pagination */}
                      {totalRolePages > 1 && (
                        <div className="p-3 border-t border-gray-100 flex items-center justify-center gap-2 bg-gray-50/30">
                          <button
                            onClick={() => setCurrentRolePage(prev => Math.max(1, prev - 1))}
                            disabled={currentRolePage === 1}
                            className="p-1 rounded border border-gray-200 bg-white disabled:opacity-50"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-bold text-gray-600">
                            {currentRolePage} / {totalRolePages}
                          </span>
                          <button
                            onClick={() => setCurrentRolePage(prev => Math.min(totalRolePages, prev + 1))}
                            disabled={currentRolePage === totalRolePages}
                            className="p-1 rounded border border-gray-200 bg-white disabled:opacity-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Person-wise Access */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-gray-600" />
                    Person-wise Access ({personAccess.length})
                  </h2>
                </div>
                <div className="flex flex-col min-h-[500px]">
                  {personAccess.length === 0 ? (
                    <div className="p-8 text-center flex-1 flex flex-col justify-center">
                      <p className="text-gray-500">No person-wise access configured yet</p>
                      <button
                        onClick={() => setShowPersonModal(true)}
                        className="mt-4 text-green-600 hover:text-green-700 font-medium"
                      >
                        Add your first person access
                      </button>
                    </div>
                  ) : (
                    <>
                      <ul className="divide-y divide-gray-100 flex-1">
                        {paginatedPersonAccess.map((item) => (
                          <li key={item.id} className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900">{item.assignedToName}</h3>
                                  <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    {item.assignedToRole}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 mb-2">{item.assignedToEmail}</p>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium text-gray-700">Access Role:</span>
                                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                    {getRoleLabel(item.accessRole)}
                                  </span>
                                </div>
                                
                                {/* Brands Display */}
                                {item.allowedBrands && item.allowedBrands.length > 0 && (
                                  <div className="text-sm text-gray-600 mt-2">
                                    <span className="font-medium">Allowed Brands:</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.allowedBrands.map((brand) => (
                                        <span key={brand} className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-[10px] rounded border border-purple-100">
                                          {brand}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="text-sm text-gray-600 mt-2">
                                  <span className="font-medium">Can assign to:</span>
                                  {item.allowedAssignees.length === 0 ? (
                                    <span className="ml-1 text-gray-400">Everyone (Full Access)</span>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {item.allowedAssignees.map((userId) => {
                                        const m = memberById.get(userId);
                                        return (
                                          <span key={userId} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-[10px] rounded border border-blue-100">
                                            {m?.email || userId}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditPersonAccess(item)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Access"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePersonAccess(item.id, item.assignedToName)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Access"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                          <p className="text-xs text-gray-500 font-medium">
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, personAccess.length)} of {personAccess.length}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-[150px] sm:max-w-none">
                              {(() => {
                                const maxVisiblePages = 5;
                                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                                
                                if (endPage - startPage + 1 < maxVisiblePages) {
                                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                                }

                                const pages = [];
                                for (let i = startPage; i <= endPage; i++) {
                                  pages.push(i);
                                }

                                return (
                                  <>
                                    {startPage > 1 && (
                                      <>
                                        <button
                                          onClick={() => setCurrentPage(1)}
                                          className="w-8 h-8 text-xs font-bold rounded-lg transition-all text-gray-600 hover:bg-gray-100"
                                        >
                                          1
                                        </button>
                                        {startPage > 2 && <span className="text-gray-400 px-1">...</span>}
                                      </>
                                    )}
                                    {pages.map((i) => (
                                      <button
                                        key={i}
                                        onClick={() => setCurrentPage(i)}
                                        className={`w-8 h-8 text-xs font-bold rounded-lg transition-all shrink-0 ${
                                          currentPage === i
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                            : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                      >
                                        {i}
                                      </button>
                                    ))}
                                    {endPage < totalPages && (
                                      <>
                                        {endPage < totalPages - 1 && <span className="text-gray-400 px-1">...</span>}
                                        <button
                                          onClick={() => setCurrentPage(totalPages)}
                                          className="w-8 h-8 text-xs font-bold rounded-lg transition-all text-gray-600 hover:bg-gray-100"
                                        >
                                          {totalPages}
                                        </button>
                                      </>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={currentPage === totalPages}
                              className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Role Modal - Same as AccessPage */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30" onClick={() => { if (addingRole) return; setShowCreateModal(false); }} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">Add Role</h3>
                      <p className="text-sm text-emerald-100/90 mt-0.5">Create a new role (saved permanently)</p>
                    </div>
                  </div>
                  <button onClick={() => { if (addingRole) return; setShowCreateModal(false); }} className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-xl">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="px-6 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-900">Role Key<span className="text-rose-600 ml-1">*</span></label>
                    <input
                      value={newRole.key}
                      onChange={(e) => setNewRole(prev => ({ ...prev, key: e.target.value }))}
                      placeholder="e.g., designer"
                      disabled={addingRole}
                      className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="text-xs text-gray-500">Allowed: a-z, 0-9, _ and -</div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-900">Display Name<span className="text-rose-600 ml-1">*</span></label>
                    <input
                      value={newRole.name}
                      onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Designer"
                      disabled={addingRole}
                      className="w-full px-4 py-3 bg-gradient-to-b from-gray-50 to-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 pt-6">
                  <button onClick={() => setShowCreateModal(false)} disabled={addingRole} className="px-5 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed">Cancel</button>
                  <button onClick={handleCreateRole} disabled={addingRole} className={`px-5 py-2.5 text-sm font-medium rounded-xl shadow-lg ${addingRole ? 'bg-emerald-300 text-white cursor-not-allowed' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700'}`}>
                    {addingRole ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
                    ) : 'Create Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Person Access Modal */}
        {showPersonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingPersonAccess ? 'Edit Access Configuration' : 'Configure New Access'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Set permissions for MD Impex team members</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPersonModal(false);
                      setNewRole({ key: '', name: '' });
                      setShowCreateModal(true);
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 text-sm font-semibold rounded-xl hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Role
                  </button>
                  <button
                    onClick={() => {
                      setShowPersonModal(false);
                      resetPersonForm();
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="space-y-8">
                  {/* Top Row: Role and Email side-by-side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Role <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedRole}
                          onChange={(e) => {
                            setSelectedRole(e.target.value);
                            setSelectedPerson('');
                          }}
                          className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none transition-all"
                        >
                          <option value="">Select Role...</option>
                          {allRoles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        Email <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={selectedPerson}
                          onChange={(e) => setSelectedPerson(e.target.value)}
                          disabled={!selectedRole}
                          className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none appearance-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">{selectedRole ? 'Select Email...' : 'Select a role first'}</option>
                          {filteredMembers.map((member) => (
                            <option key={member.id} value={member.email}>
                              {member.name} ({member.email})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: MD Manager Notice */}
                  {selectedRole === 'md_manager' && (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3">
                      <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                      <p className="text-sm text-blue-800 leading-relaxed">
                        <strong>MD Manager Note:</strong> Typically has full access, but you can configure specific restrictions below.
                      </p>
                    </div>
                  )}

                  {/* Bottom Row: 3 boxes side-by-side */}
                  {selectedPerson ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Task Types Box */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
                          <h4 className="font-bold text-gray-900 text-sm">Task Types</h4>
                          <button
                            onClick={toggleAllTaskTypes}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                          >
                            {allowedTaskTypes.length === taskTypes.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                          {taskTypes.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No task types found</p>
                          ) : (
                            taskTypes.map((t, index) => {
                              const label = String((t as any)?.name || '').trim();
                              const key = label.toLowerCase();
                              return (
                                <label key={key} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={allowedTaskTypes.includes(key)}
                                    onChange={() => toggleTaskType(label)}
                                    className="w-5 h-5 text-blue-600 border-gray-200 rounded-lg focus:ring-blue-500/20 transition-all"
                                  />
                                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                    {index + 1}. {label}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Brands Box */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
                          <h4 className="font-bold text-gray-900 text-sm">Brands</h4>
                          <button
                            onClick={toggleAllBrands}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                          >
                            {allowedBrands.length === brands.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                          {brands.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No brands found</p>
                          ) : (
                            brands.map((b, index) => {
                              const label = String(b?.name || '').trim();
                              return (
                                <label key={label} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={allowedBrands.includes(label)}
                                    onChange={() => toggleBrand(label)}
                                    className="w-5 h-5 text-blue-600 border-gray-200 rounded-lg focus:ring-blue-500/20 transition-all"
                                  />
                                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                    {index + 1}. {label}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>

                      {/* Assignees Box */}
                      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[400px]">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between shrink-0">
                          <h4 className="font-bold text-gray-900 text-sm">Emails (Assignees)</h4>
                          <button
                            onClick={toggleAllAssignees}
                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                          >
                            {allowedAssignees.length === availableAssignees.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                          {availableAssignees.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No available assignees</p>
                          ) : (
                            availableAssignees.map((member, index) => (
                              <label key={member.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 cursor-pointer group transition-colors">
                                <input
                                  type="checkbox"
                                  checked={allowedAssignees.includes(member.id)}
                                  onChange={() => toggleAssignee(member.id)}
                                  className="w-5 h-5 text-blue-600 border-gray-200 rounded-lg focus:ring-blue-500/20 transition-all"
                                />
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-gray-900 leading-none">
                                    {index + 1}. {member.name}
                                  </p>
                                  <p className="text-[10px] text-gray-500 mt-1 font-medium">{member.email}</p>
                                </div>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                      <Shield className="w-12 h-12 text-gray-300 mb-4" />
                      <h4 className="text-gray-900 font-bold">Waiting for Selection</h4>
                      <p className="text-sm text-gray-500 mt-2 max-w-[200px]">Select a role and email above to begin configuration</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPersonModal(false);
                    resetPersonForm();
                  }}
                  className="px-6 py-3 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSavePersonAccess}
                  disabled={saving || !selectedPerson}
                  className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50 disabled:shadow-none"
                >
                  {saving ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5" />
                  )}
                  {editingPersonAccess ? 'Update Permissions' : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
