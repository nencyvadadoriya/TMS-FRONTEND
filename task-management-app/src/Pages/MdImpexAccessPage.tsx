import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Users, Shield, X, Check, Loader2, ChevronDown } from 'lucide-react';
import mdImpexAccessService from '../Services/MdImpexAccess.services';

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
  createdAt: string;
  updatedAt?: string;
};

const ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager' },
  { value: 'assistant', label: 'Assistant' },
  { value: 'ob_manager', label: 'OB Manager' },
  { value: 'md_manager', label: 'MD Manager' },
];

export default function MdImpexAccessPage() {
  // Updated: MD Manager full access logic - v2.0
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [personAccess, setPersonAccess] = useState<PersonAccessItem[]>([]);
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
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPersonAccess, setEditingPersonAccess] = useState<PersonAccessItem | null>(null);

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
    } catch (e: any) {
      setError(e?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
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
      allowedAssignees: selectedRole === 'md_manager' ? [] : allowedAssignees
    };

    let res;
    if (editingPersonAccess) {
      res = await mdImpexAccessService.updatePersonAccess(editingPersonAccess.id, {
        allowedAssignees: selectedRole === 'md_manager' ? [] : allowedAssignees
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
    setEditingPersonAccess(null);
  };

  const toggleAssignee = (userId: string) => {
    setAllowedAssignees(prev => 
      prev.includes(userId) 
        ? prev.filter(e => e !== userId)
        : [...prev, userId]
    );
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
                <div className="max-h-[600px] overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center">No members found</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
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
                <div className="max-h-[600px] overflow-y-auto">
                  {roles.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No roles created yet</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Create your first role
                      </button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {roles.map((role) => (
                        <li key={role.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 text-sm">{role.role}</h3>
                              {role.description && (
                                <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {role.emails?.length || 0} member(s)
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteRole(role.id, role.role)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Role"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
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
                <div className="max-h-[600px] overflow-y-auto">
                  {personAccess.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-gray-500">No person-wise access configured yet</p>
                      <button
                        onClick={() => setShowPersonModal(true)}
                        className="mt-4 text-green-600 hover:text-green-700 font-medium"
                      >
                        Add your first person access
                      </button>
                    </div>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {personAccess.map((item) => (
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
                                  {item.accessRole}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Can assign to:</span> {item.allowedAssignees.length} member(s)
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
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingPersonAccess ? 'Edit Person Access' : 'Add Person Access'}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Add Role button for MD Manager - same as AccessPage */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPersonModal(false);
                      setNewRole({ key: '', name: '' });
                      setShowCreateModal(true);
                    }}
                    className="hidden sm:inline-flex items-center px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 text-sm font-medium rounded-lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Role
                  </button>
                  <button
                    onClick={() => {
                      setShowPersonModal(false);
                      resetPersonForm();
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Role Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Role <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedRole}
                      onChange={(e) => {
                        setSelectedRole(e.target.value);
                        setSelectedPerson('');
                      }}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none"
                    >
                      <option value="">Select a role...</option>
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                      {roles.map((role) => (
                        <option key={role.id} value={role.role.toLowerCase().replace(/\s+/g, '_')}>
                          {role.role}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Person Dropdown */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Person <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedPerson}
                      onChange={(e) => setSelectedPerson(e.target.value)}
                      disabled={!selectedRole}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none disabled:opacity-50"
                    >
                      <option value="">Select a person...</option>
                      {filteredMembers.map((member) => (
                        <option key={member.id} value={member.email}>
                          {member.name} ({member.email})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* MD Manager Full Access Notice */}
                {selectedRole === 'md_manager' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>MD Manager</strong> will have full access to all MD Impex features and can assign tasks to any team member.
                    </p>
                  </div>
                )}

                {/* Allowed Assignees */}
                {selectedPerson && selectedRole !== 'md_manager' && (
                  <div>
                    {/* Selected Person Email */}
                    <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Selected Person Email
                      </label>
                      <span className="inline-flex items-center px-3 py-1.5 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                        {selectedPerson}
                      </span>
                    </div>

                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allowed Assignees (Optional - select additional people)
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2">
                      {availableAssignees.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center">No available assignees</p>
                      ) : (
                        availableAssignees.map((member) => (
                          <label
                            key={member.id}
                            className="flex items-center gap-3 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                          >
                            <input
                              type="checkbox"
                              checked={allowedAssignees.includes(member.id)}
                              onChange={() => toggleAssignee(member.id)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{member.name}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                    {/* Selected Emails Display */}
                    {allowedAssignees.length > 0 && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Additional Selected Emails ({allowedAssignees.length})
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {allowedAssignees.map((userId) => {
                            const m = memberById.get(userId);
                            const label = m ? `${m.email}` : userId;
                            return (
                            <span
                              key={userId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white text-xs text-gray-700 rounded border border-gray-200"
                            >
                              {label}
                              <button
                                type="button"
                                onClick={() => toggleAssignee(userId)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowPersonModal(false);
                    resetPersonForm();
                  }}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePersonAccess}
                  disabled={saving || !selectedPerson}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingPersonAccess ? 'Update Access' : 'Add Access'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
