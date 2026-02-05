import apiClient from "./apiClient";
import type { LoginBody, OtpverifyPayload, RegisterUserBody } from "../Types/Types";
import toast from "react-hot-toast";

const isDev = Boolean(import.meta.env.DEV);

class AuthServices {
    authLoginUrl = "/auth/login";
    authRegisterUrl = "/auth/register"; 
    authForgetPassword = "/auth/forgetPassword";
    authVerifyOtp = "/auth/verifyOtp";
    authChangePassword = "/auth/change-password";
    authGetAllUsers = "/auth/getAllUsers";
    authGetCurrentUser = "/auth/currentUser";
    authDeleteUser = "/auth/deleteUser";
    authUpdateUser = "/auth/updateUser";
    authCreateUser = "/auth/createUser";
    authUploadProfileAvatar = "/auth/profile/avatar";

    // Brand endpoints
    brandUserBrands = "/brand/user";
    brandBulkUpsert = "/brand/bulk-upsert";
    brandInviteCollaborator = "/brand";

    async loginUser(payload: LoginBody) {
        try {
            if (isDev) console.log("🔐 Login Request - Email:", payload.email);

            const res = await apiClient.post(this.authLoginUrl, payload);

            if (isDev) console.log("✅ Login Response:", res.data);
            return res.data;
        } catch (error: any) {
            console.error("❌ Login Error:", error.response?.data || error.message);
            return error.response?.data || { error: true, msg: error.message || "Something went wrong" };
        }
    }

    // ✅ SINGLE method for both registration and creating new users
    async registerOrCreateUser(payload: RegisterUserBody, isAdminCreating: boolean = false) {
        try {
            const endpoint = isAdminCreating ? this.authCreateUser : this.authRegisterUrl;

            if (isDev) {
                console.log("📝 Register/Create User Request:", {
                    payload,
                    isAdminCreating,
                    endpoint
                });
            }

            // Prepare request payload
            const requestPayload = {
                name: payload.name?.trim() || '',
                email: payload.email?.trim().toLowerCase() || '',
                password: payload.password || '',
                role: payload.role || 'user',
                managerId: (payload as any).managerId,
                companyName: (payload as any).companyName,
                phone: payload.phone || '',
                department: payload.department || '',
                position: payload.position || ''
            };

            const res = await apiClient.post(endpoint, requestPayload);

            if (isDev) console.log("✅ Register/Create User Response:", res.data);

            const emailSent = typeof res.data?.emailSent === 'boolean' ? res.data.emailSent : undefined;

            if (isAdminCreating && emailSent === false) {
                toast.error('User created but invitation email could not be sent. Please check email configuration and try again.');
            }

            // Robustly extract user data based on different response structures
            // registerUser returns { result: { user: {...} } }
            // createUser returns { data: { ... } }
            let userData = null;
            if (res.data.data) {
                userData = res.data.data;
            } else if (res.data.result && res.data.result.user) {
                userData = res.data.result.user;
            } else if (res.data.user) {
                userData = res.data.user;
            } else {
                userData = res.data; // Fallback
            }

            // Return consistent response structure
            return {
                success: true,
                message: res.data.message ||
                    (isAdminCreating ? 'User created successfully' : 'Registration successful'),
                data: userData,
                emailSent
            };

        } catch (error: any) {
            console.error("❌ Register/Create User Error:", error);

            let errorMessage = isAdminCreating
                ? 'Failed to create user'
                : 'Registration failed';

            if (error.response) {
                // Server responded with error status
                if (error.response.status === 401) {
                    errorMessage = 'Unauthorized. Please login again.';
                    if (isAdminCreating) {
                        localStorage.removeItem('token');
                    }
                } else if (error.response.status === 400) {
                    errorMessage = error.response.data?.message || 'Invalid request data';
                } else if (error.response.status === 409) {
                    errorMessage = 'User with this email already exists';
                } else if (error.response.status === 422) {
                    errorMessage = error.response.data?.message || 'Validation error';
                } else {
                    errorMessage = error.response.data?.message ||
                        error.response.data?.msg ||
                        `Server error: ${error.response.status}`;
                }
            } else if (error.request) {
                errorMessage = 'No response from server. Check your connection.';
            } else {
                errorMessage = error.message || 'Unknown error occurred';
            }

            toast.error(errorMessage);

            return {
                success: false,
                error: true,
                message: errorMessage,
                data: null
            };
        }
    }

    // ✅ Alias methods for backward compatibility
    async registerUser(payload: RegisterUserBody) {
        return this.registerOrCreateUser(payload, false);
    }

    async createUser(payload: RegisterUserBody) {
        return this.registerOrCreateUser(payload, true);
    }

    async getUserBrands(userId: string) {
        try {
            const res = await apiClient.get(`${this.brandUserBrands}/${userId}`);
            return res.data;
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.msg || 'Failed to fetch brands';
            return { success: false, message, data: [] };
        }
    }

    async bulkUpsertBrands(brands: any[]) {
        try {
            const res = await apiClient.post(this.brandBulkUpsert, { brands });
            return res.data;
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.msg || 'Failed to migrate brands';
            return { success: false, message, data: [] };
        }
    }

    async inviteBrandCollaborator(brandId: string, email: string, role: string, message?: string) {
        try {
            const res = await apiClient.post(`${this.brandInviteCollaborator}/${brandId}/invite`, { email, role, message });
            return res.data;
        } catch (error: any) {
            const messageText = error.response?.data?.message || error.response?.data?.msg || 'Failed to send invite';
            return { success: false, message: messageText, data: null };
        }
    }

    async getAllUsers() {
        try {
            const res = await apiClient.get(this.authGetAllUsers);
            return res.data;
        } catch (error: any) {
            toast.error(error.response?.data?.msg || "Something went wrong");
            return null;
        }
    }

    async deleteUser(userId: string) {
        try {
            const res = await apiClient.delete(`${this.authDeleteUser}/${userId}`);
            return res.data;
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.msg || 'Failed to delete user';
            toast.error(message);
            return {
                success: false,
                error: true,
                message,
            };
        }
    }

    async updateUser(userId: string, userData: any) {
        try {
            if (isDev) console.log('Updating user:', { userId, userData });

            const token = localStorage.getItem('token');

            if (!token) {
                toast.error('Authentication token not found. Please login again.');
                return {
                    success: false,
                    message: 'Authentication token not found',
                    data: null
                };
            }

            const res = await apiClient.put(`${this.authUpdateUser}/${userId}`, userData);

            if (isDev) console.log('Update user response:', res.data);

            return {
                success: true,
                message: res.data.message || 'User updated successfully',
                data: res.data.user || res.data
            };

        } catch (error: any) {
            console.error('Error updating user:', error);

            let errorMessage = 'Failed to update user';

            if (error.response) {
                if (error.response.status === 401) {
                    errorMessage = 'Unauthorized. Please login again.';
                    localStorage.removeItem('token');
                } else if (error.response.status === 403) {
                    errorMessage = 'You do not have permission to update user';
                } else if (error.response.status === 404) {
                    errorMessage = 'User not found';
                } else if (error.response.status === 422) {
                    errorMessage = error.response.data.message || 'Validation error';
                } else {
                    errorMessage = error.response.data?.message ||
                        error.response.data?.msg ||
                        `Server error: ${error.response.status}`;
                }
            } else if (error.request) {
                errorMessage = 'No response from server. Check your connection.';
            } else {
                errorMessage = error.message || 'Unknown error occurred';
            }

            toast.error(errorMessage);

            return {
                success: false,
                message: errorMessage,
                data: null,
                error: true
            };
        }
    }

    async forgetPassword(payload: any) {
        try {
            const res = await apiClient.post(this.authForgetPassword, payload);
            return res.data;
        } catch (error: any) {
            toast.error(error.response?.data?.msg || "Something went wrong");
            return {
                error: true,
                msg: error.response?.data?.msg || "Something went wrong",
                status: error.response?.status || 500
            };
        }
    }

    async otpVerify(payload: OtpverifyPayload) {
        try {
            const res = await apiClient.post(this.authVerifyOtp, payload)
            return res.data;
        } catch (error: any) {
            const message = error.response?.data?.msg || "Something went wrong";
            toast.error(message);
            return {
                error: true,
                msg: message,
                status: error.response?.status || 500
            };
        }
    }

    async changePassword(payload: { email: string; newPassword: string }) {
        try {
            const res = await apiClient.post(this.authChangePassword, payload);
            return res.data;
        } catch (error: any) {
            const message = error.response?.data?.msg || "Something went wrong";
            toast.error(message);
            return {
                error: true,
                msg: message,
                status: error.response?.status || 500
            };
        }
    }

    async getCurrentUser() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                return {
                    success: false,
                    message: "No token found",
                    data: null
                };
            }

            const response = await apiClient.get(this.authGetCurrentUser);

            if (response.data.error) {
                return {
                    success: false,
                    data: null,
                    message: response.data.msg || "Failed to fetch user"
                };
            }

            const userData = response.data.result;

            if (!userData) {
                return {
                    success: false,
                    data: null,
                    message: "No user data received"
                };
            }

            const formattedUser = {
                ...userData,
                id: userData.id || userData._id || '',
                _id: userData._id,
                name: userData.name || 'User',
                role: userData.role || 'user',
                email: userData.email || '',
                managerId: userData.managerId || null,
                assignedBrandIds: userData.assignedBrandIds || [],
                assignedBrands: userData.assignedBrands || [],
                permissions: userData.permissions || {},
                phone: userData.phone || '',
                department: userData.department || '',
                location: userData.location || '',
                joinDate: userData.joinDate || '',
                bio: userData.bio || userData.about || '',
                skills: userData.skills || [],
                isActive: userData.isActive !== false
            };

            return {
                success: true,
                data: formattedUser,
                message: response.data.msg || "User fetched successfully"
            };
        } catch (error: any) {
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                toast.error("Session expired. Please login again.");
            }

            return {
                success: false,
                data: null,
                message: error.response?.data?.msg || error.message || "Failed to fetch current user"
            };
        }
    }

    async uploadProfileAvatar(file: File) {
        try {
            const form = new FormData();
            form.append('avatar', file);

            const res = await apiClient.post(this.authUploadProfileAvatar, form, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            return {
                success: Boolean(res.data?.success),
                message: res.data?.message || 'Avatar updated successfully',
                data: res.data?.user || null
            };
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.msg || error.message || 'Failed to upload avatar';
            toast.error(message);
            return {
                success: false,
                message,
                data: null
            };
        }
    }

    async removeProfileAvatar() {
        try {
            const res = await apiClient.delete(this.authUploadProfileAvatar);
            return {
                success: Boolean(res.data?.success),
                message: res.data?.message || 'Avatar removed successfully',
                data: res.data?.user || null
            };
        } catch (error: any) {
            const message = error.response?.data?.message || error.response?.data?.msg || error.message || 'Failed to remove avatar';
            toast.error(message);
            return {
                success: false,
                message,
                data: null
            };
        }
    }
}

export const authService = new AuthServices();
