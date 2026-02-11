import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    User,
    Mail,
    Calendar,
    CheckCircle,
    Edit,
} from 'lucide-react';

import type { UserType } from '../Types/Types';
import apiClient from '../Services/apiClient';
import { authService } from '../Services/User.Services';
import { UserProfileSkeleton } from '../Components/LoadingSkeletons';
import { userAvatarUrl } from '../utils/avatar';

interface UserProfilePageProps {
    user?: UserType; // The profile being viewed
    formatDate?: (dateString: string) => string;
    onUserUpdated?: (user: UserType) => void;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({
    user = {} as UserType,
    formatDate = (d) => d,
    onUserUpdated,
}) => {
    const [resolvedUser, setResolvedUser] = useState<UserType | null>(null);
    const [resolvedUserLoading, setResolvedUserLoading] = useState(false);
    const [googleStatusLoading, setGoogleStatusLoading] = useState(false);
    const [googleActionLoading, setGoogleActionLoading] = useState(false);
    const [googleConnected, setGoogleConnected] = useState<boolean>(false);
    const [googleConnectedAt, setGoogleConnectedAt] = useState<string | null>(null);

    const [showAvatarModal, setShowAvatarModal] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarUploading, setAvatarUploading] = useState(false);

    const hasUserProp = useMemo(() => {
        return Boolean(user && Object.keys(user).length > 0);
    }, [user]);

    const profileUser = useMemo(() => {
        return hasUserProp ? user : resolvedUser;
    }, [hasUserProp, resolvedUser, user]);

    const isOwnProfile = useMemo(() => {
        const profileEmail = (profileUser as any)?.email ? String((profileUser as any).email).trim().toLowerCase() : '';
        if (!profileEmail) return false;
        try {
            const cached = localStorage.getItem('currentUser');
            if (!cached) return false;
            const parsed = JSON.parse(cached);
            const meEmail = parsed?.email ? String(parsed.email).trim().toLowerCase() : '';
            return Boolean(meEmail && meEmail === profileEmail);
        } catch {
            return false;
        }
    }, [profileUser]);

    const avatarUrl = useMemo(() => {
        return userAvatarUrl(profileUser);
    }, [profileUser]);

    const isPlaceholderUser = useMemo(() => {
        const name = (user as any)?.name;
        if (!name) return false;
        return String(name).trim().toLowerCase() === 'loading...';
    }, [user]);

    const googleCallbackStatus = useMemo(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('google');
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        if (!googleCallbackStatus) return;

        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('google');
            url.searchParams.delete('reason');

            const nextSearch = url.searchParams.toString();
            const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash || ''}`;
            window.history.replaceState({}, document.title, nextUrl);
        } catch {
            return;
        }
    }, [googleCallbackStatus]);

    const fetchGoogleStatus = useCallback(async () => {
        setGoogleStatusLoading(true);
        try {
            const res = await apiClient.get('/google/status');
            const connected = Boolean(res?.data?.connected);
            setGoogleConnected(connected);
            setGoogleConnectedAt(res?.data?.connectedAt || null);
        } catch {
            setGoogleConnected(false);
            setGoogleConnectedAt(null);
        } finally {
            setGoogleStatusLoading(false);
        }
    }, []);

    useEffect(() => {
        const resolveCurrentUser = async () => {
            if (hasUserProp) return;

            setResolvedUserLoading(true);
            try {
                try {
                    const cached = localStorage.getItem('currentUser');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed && typeof parsed === 'object') {
                            setResolvedUser(parsed as UserType);
                            return;
                        }
                    }
                } catch {}

                const current = await authService.getCurrentUser();
                if (current?.success && current.data) {
                    setResolvedUser(current.data);
                    try {
                        localStorage.setItem('currentUser', JSON.stringify(current.data));
                    } catch {}
                }
            } finally {
                setResolvedUserLoading(false);
            }
        };

        resolveCurrentUser();
    }, [hasUserProp]);

    useEffect(() => {
        fetchGoogleStatus();
    }, [fetchGoogleStatus]);

    const handleConnectGoogle = useCallback(async () => {
        setGoogleActionLoading(true);
        try {
            const res = await apiClient.get('/google/auth-url');
            const url = res?.data?.url;
            if (url && typeof url === 'string') {
                window.location.href = url;
            }
        } finally {
            setGoogleActionLoading(false);
        }
    }, []);

    const handleDisconnectGoogle = useCallback(async () => {
        setGoogleActionLoading(true);
        try {
            await apiClient.post('/google/disconnect');
            await fetchGoogleStatus();
        } finally {
            setGoogleActionLoading(false);
        }
    }, [fetchGoogleStatus]);

    const handleSelectAvatarFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files.length > 0 ? e.target.files[0] : null;
        setAvatarFile(file);
    }, []);

    const handleUploadAvatar = useCallback(async () => {
        if (!avatarFile) return;
        setAvatarUploading(true);
        try {
            const res = await authService.uploadProfileAvatar(avatarFile);
            if (!res?.success || !res.data) {
                return;
            }

            try {
                localStorage.setItem('currentUser', JSON.stringify(res.data));
            } catch {}

            if (!hasUserProp) {
                setResolvedUser(res.data as UserType);
            }

            if (typeof onUserUpdated === 'function') {
                onUserUpdated(res.data as UserType);
            }

            setShowAvatarModal(false);
            setAvatarFile(null);
        } finally {
            setAvatarUploading(false);
        }
    }, [avatarFile, hasUserProp, onUserUpdated]);

    const handleRemoveAvatar = useCallback(async () => {
        setAvatarUploading(true);
        try {
            const res = await authService.removeProfileAvatar();
            if (!res?.success || !res.data) {
                return;
            }

            try {
                localStorage.setItem('currentUser', JSON.stringify(res.data));
            } catch {}

            if (!hasUserProp) {
                setResolvedUser(res.data as UserType);
            }

            if (typeof onUserUpdated === 'function') {
                onUserUpdated(res.data as UserType);
            }

            setShowAvatarModal(false);
            setAvatarFile(null);
        } finally {
            setAvatarUploading(false);
        }
    }, [hasUserProp, onUserUpdated]);

    const shouldShowInitialSkeleton = useMemo(() => {
        if (hasUserProp) return false;
        if (resolvedUserLoading) return false;
        return resolvedUser === null;
    }, [hasUserProp, resolvedUser, resolvedUserLoading]);

    if (resolvedUserLoading || shouldShowInitialSkeleton || isPlaceholderUser) {
        return <UserProfileSkeleton />;
    }

    if (!profileUser || Object.keys(profileUser).length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">User not found</h2>
                    <p className="text-gray-600 mt-2">Please select a user to view their profile.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gray-50 p-4 md:p-6">
            {/* Main Container */}
            <div className="w-full">
                {/* Header Section */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                                <User className="h-8 w-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                                    {profileUser.name}'s Profile
                                </h1>
                                <p className="text-gray-600 mt-2">
                                    View user profile information and activity
                                </p>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Profile Content */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column - Profile Information */}
                    <div className="lg:col-span-8">
                        {/* Profile Card */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="p-6 md:p-8">
                                {/* User Header */}
                                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6 mb-8">
                                    {/* Avatar */}
                                    <div className="relative">
                                        {avatarUrl ? (
                                            <img
                                                src={avatarUrl}
                                                alt={profileUser.name}
                                                className="w-32 h-32 rounded-2xl object-cover border border-gray-200"
                                            />
                                        ) : (
                                            <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-5xl font-bold">
                                                {profileUser.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-full">
                                            <CheckCircle className="h-5 w-5" />
                                        </div>

                                        {isOwnProfile && (
                                            <button
                                                type="button"
                                                onClick={() => setShowAvatarModal(true)}
                                                className="absolute -top-2 -right-2 bg-white text-gray-700 p-2 rounded-full shadow border border-gray-200 hover:bg-gray-50"
                                                title="Edit profile picture"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Basic Info */}
                                    <div className="flex-1">
                                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                                            {profileUser.name}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-3">

                                            <span className="text-gray-600 flex items-center gap-1">
                                                <Calendar className="h-4 w-4" />
                                                Member since {formatDate(profileUser.joinDate || new Date().toISOString())}
                                            </span>
                                        </div>
                                        {profileUser.department && (
                                            <div className="mt-3">
                                                <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 rounded-full">
                                                    {profileUser.department}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Contact Information */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                        Contact Information
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                                <Mail className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">Email Address</p>
                                                <p className="font-medium text-gray-900 break-all">{profileUser.email}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                                        Google Calendar
                                    </h3>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">Connection Status</p>
                                                <p className="font-medium text-gray-900">
                                                    {googleStatusLoading
                                                        ? 'Checking...'
                                                        : googleConnected
                                                            ? 'Connected'
                                                            : 'Not connected'}
                                                </p>
                                                {googleConnectedAt && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Connected at {formatDate(googleConnectedAt)}
                                                    </p>
                                                )}
                                                {googleCallbackStatus && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Last connect result: {googleCallbackStatus}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {googleConnected ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleDisconnectGoogle}
                                                        disabled={googleActionLoading}
                                                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        Disconnect
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleConnectGoogle}
                                                        disabled={googleActionLoading}
                                                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        Connect Google Calendar
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Summary & Stats */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Quick Stats Card */}
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <User className="h-5 w-5" />
                                </div>
                                <h3 className="text-lg font-semibold">Profile Overview</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <p className="text-blue-100 text-sm mb-1">Full Name</p>
                                    <p className="font-medium truncate">{profileUser.name}</p>
                                </div>
                                <div>
                                    <p className="text-blue-100 text-sm mb-1">Email</p>
                                    <p className="font-medium truncate">{profileUser.email}</p>
                                </div>
                                {profileUser.department && (
                                    <div>
                                        <p className="text-blue-100 text-sm mb-1">Department</p>
                                        <p className="font-medium">{profileUser.department}</p>
                                    </div>
                                )}
                                {profileUser.position && (
                                    <div>
                                        <p className="text-blue-100 text-sm mb-1">Position</p>
                                        <p className="font-medium">{profileUser.position}</p>
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 pt-6 border-t border-blue-400">
                                <p className="text-sm text-blue-100">
                                    This profile information is read-only.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showAvatarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAvatarModal(false)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Update Profile Picture</h3>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleSelectAvatarFile}
                                disabled={avatarUploading}
                            />
                            <div className="flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={handleRemoveAvatar}
                                    className="px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                    disabled={avatarUploading}
                                >
                                    Remove Photo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAvatarModal(false);
                                        setAvatarFile(null);
                                    }}
                                    className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                    disabled={avatarUploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUploadAvatar}
                                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                                    disabled={!avatarFile || avatarUploading}
                                >
                                    {avatarUploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfilePage;