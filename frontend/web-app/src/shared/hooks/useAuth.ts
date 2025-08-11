import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { AuthUser, LoginCredentials, RegisterData, APIResponse } from '../types';
import { apiClient } from '../api/client';

// Query keys
export const authKeys = {
  user: ['auth', 'user'] as const,
  profile: (userId: number) => ['auth', 'profile', userId] as const,
};

// Get current user
export const useCurrentUser = () => {
  const { user, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: authKeys.user,
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<AuthUser>>('/auth/me');
      return response.data.data;
    },
    enabled: isAuthenticated && !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000,
    initialData: user,
  });
};

// Get user profile
export const useUserProfile = (userId: number, enabled = true) => {
  return useQuery({
    queryKey: authKeys.profile(userId),
    queryFn: async () => {
      const response = await apiClient.get<APIResponse<AuthUser>>(`/users/${userId}`);
      return response.data.data;
    },
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

// Login mutation
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { login: loginAction } = useAuthStore();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      await loginAction(credentials);
    },
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.user });
    },
    onError: (error) => {
      console.error('Login error:', error);
    },
  });
};

// Register mutation
export const useRegister = () => {
  const queryClient = useQueryClient();
  const { register: registerAction } = useAuthStore();

  return useMutation({
    mutationFn: async (data: RegisterData) => {
      await registerAction(data);
    },
    onSuccess: () => {
      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: authKeys.user });
    },
    onError: (error) => {
      console.error('Registration error:', error);
    },
  });
};

// Logout mutation
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout: logoutAction } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post('/auth/logout');
      } catch (error) {
        // Even if the API call fails, we still want to clear local state
        console.warn('Logout API call failed:', error);
      }
      logoutAction();
    },
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
    },
  });
};

// Update profile mutation
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();

  return useMutation({
    mutationFn: async (profileData: Partial<AuthUser>) => {
      const response = await apiClient.put<APIResponse<AuthUser>>('/auth/profile', profileData);
      return response.data.data;
    },
    onSuccess: (updatedUser) => {
      // Update local state
      updateUser(updatedUser);
      
      // Update cache
      queryClient.setQueryData(authKeys.user, updatedUser);
      queryClient.setQueryData(authKeys.profile(updatedUser.id), updatedUser);
    },
  });
};

// Change password mutation
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await apiClient.put<APIResponse<any>>('/auth/password', {
        currentPassword,
        newPassword,
      });
      return response.data;
    },
  });
};

// Request password reset mutation
export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      const response = await apiClient.post<APIResponse<any>>('/auth/password/reset-request', {
        email,
      });
      return response.data;
    },
  });
};

// Reset password mutation
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const response = await apiClient.post<APIResponse<any>>('/auth/password/reset', {
        token,
        newPassword,
      });
      return response.data;
    },
  });
};

// Refresh token mutation
export const useRefreshToken = () => {
  const { refreshToken: refreshTokenAction } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      await refreshTokenAction();
    },
  });
};

// Custom hook for authentication status
export const useAuthStatus = () => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  
  return {
    user,
    isAuthenticated,
    isLoading,
    isGuest: !isAuthenticated,
    hasRole: (role: string) => user?.role === role,
    hasPermission: (permission: string) => user?.permissions.includes(permission) || false,
  };
};