import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Search, User } from 'lucide-react';
import { authService } from '../Services/User.Services';

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  isOnline?: boolean;
}

interface FloatingChatProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  primaryColor?: string;
  title?: string;
  placeholder?: string;
  onUserSelect?: (user: CompanyUser) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  unreadCounts?: Record<string, number>;
  lastMessageAt?: Record<string, string>;
}

const FloatingChat: React.FC<FloatingChatProps> = ({
  position = 'bottom-right',
  primaryColor = '#3B82F6',
  title = 'Company Chat',
  placeholder = 'Search users...',
  onUserSelect,
  isOpen: controlledIsOpen,
  onToggle,
  unreadCounts,
  lastMessageAt
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-6 right-6';
      case 'bottom-left':
        return 'bottom-6 left-6';
      case 'top-right':
        return 'top-6 right-6';
      case 'top-left':
        return 'top-6 left-6';
      default:
        return 'bottom-6 right-6';
    }
  };

  const getChatPositionClasses = () => {
    switch (position) {
      case 'bottom-right':
        return 'bottom-20 right-0';
      case 'bottom-left':
        return 'bottom-20 left-0';
      case 'top-right':
        return 'top-20 right-0';
      case 'top-left':
        return 'top-20 left-0';
      default:
        return 'bottom-20 right-0';
    }
  };

  const fetchCompanyUsers = async () => {
    setLoading(true);
    try {
      // First get current user to determine their company
      const currentUserResponse = await authService.getCurrentUser();
      if (!currentUserResponse?.success || !currentUserResponse?.data) {
        console.error('Could not fetch current user');
        return;
      }

      const currentUserData = currentUserResponse.data;
      const userCompany = currentUserData.companyName || currentUserData.company;
      const currentRole = String(currentUserData.role || '').trim().toLowerCase();
      const isAdminLike = currentRole === 'admin' || currentRole === 'super_admin';

      if (!isAdminLike && !userCompany) {
        console.warn('Current user has no company specified');
        setUsers([]);
        return;
      }

      // Fetch all users
      const response = await authService.getAllUsers();
      if (response?.success && response?.data) {
        const userList = response.data
          .filter((user: any) => {
            const role = String(user?.role || '').trim().toLowerCase();
            const targetIsAdminLike = role === 'admin' || role === 'super_admin';

            if (isAdminLike) return true;
            if (targetIsAdminLike) return true;

            // For non-admin users: show only same-company users + admin/super_admin
            const userCompanyToCheck = user.companyName || user.company;
            return userCompanyToCheck && userCompanyToCheck.toLowerCase() === String(userCompany).toLowerCase();
          })
          .map((user: any) => ({
            id: user._id || user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            isOnline: Math.random() > 0.5 // Random online status for demo
          }));
        
        console.log(`Found ${userList.length} users in company "${userCompany}"`);
        setUsers(userList);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response?.success && response?.data) {
        setCurrentUser(response.data);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCompanyUsers();
      // Current user is already fetched in fetchCompanyUsers, but we also set it separately for the UI
      fetchCurrentUser();
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (isControlled && onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
    setSearchQuery('');
  };

  const handleUserClick = (user: CompanyUser) => {
    if (onUserSelect) {
      onUserSelect(user);
    }
    handleToggle();
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const aTs = lastMessageAt?.[String(a.id)] ? Date.parse(String(lastMessageAt[String(a.id)])) : 0;
    const bTs = lastMessageAt?.[String(b.id)] ? Date.parse(String(lastMessageAt[String(b.id)])) : 0;
    return bTs - aTs;
  });

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: string } = {
      'admin': 'bg-purple-100 text-purple-800',
      'md_manager': 'bg-red-100 text-red-800',
      'ob_manager': 'bg-orange-100 text-orange-800',
      'manager': 'bg-blue-100 text-blue-800',
      'sbm': 'bg-green-100 text-green-800',
      'rm': 'bg-yellow-100 text-yellow-800',
      'am': 'bg-indigo-100 text-indigo-800',
      'assistant': 'bg-gray-100 text-gray-800',
      'sub_assistance': 'bg-gray-100 text-gray-800'
    };
    return roleColors[role.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) {
    return (
      <div className={`fixed z-50 ${getPositionClasses()}`}>
        <button
          onClick={handleToggle}
          className="relative flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110 group"
          style={{ backgroundColor: primaryColor }}
        >
          <MessageCircle className="w-6 h-6" />
          
          {/* Notification dot */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            {title}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className={`fixed z-50 ${getChatPositionClasses()} w-80 h-96`}>
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 h-full flex flex-col">
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 py-3 rounded-t-lg text-white"
          style={{ backgroundColor: primaryColor }}
        >
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">{title}</h3>
            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
              {users.length}
            </span>
          </div>
          <button
            onClick={handleToggle}
            className="p-1 hover:bg-white/20 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <User className="w-8 h-8 mb-2" />
              <p className="text-sm">
                {searchQuery ? 'No users found' : 'No users available'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sortedUsers.map((user) => {
                const isCurrentUser = currentUser?.email === user.email;
                const unread = unreadCounts?.[String(user.id)] || 0;
                return (
                  <div
                    key={user.id}
                    onClick={() => !isCurrentUser && handleUserClick(user)}
                    className={`flex items-center p-3 hover:bg-gray-50 transition-colors ${
                      isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {getInitials(user.name)}
                          </span>
                        </div>
                      )}
                      
                      {/* Online status */}
                      <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        user.isOnline ? 'bg-green-400' : 'bg-gray-300'
                      }`}></div>
                    </div>

                    {/* User Info */}
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                          {isCurrentUser && (
                            <span className="ml-1 text-xs text-gray-500">(You)</span>
                          )}
                        </p>
                        <div className="flex items-center space-x-2">
                          {unread > 0 && (
                            <span className="min-w-[20px] h-5 px-1 flex items-center justify-center text-xs font-semibold bg-red-500 text-white rounded-full">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${getRoleColor(user.role)}`}>
                            {user.role.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FloatingChat;
