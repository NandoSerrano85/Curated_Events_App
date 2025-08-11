import React, { useState } from 'react';
import { Input, Button } from '../atoms';
import { useLogin } from '../../hooks/useAuth';
import { LoginCredentials } from '../../types';

export interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
  onForgotPasswordClick?: () => void;
  className?: string;
  testId?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onRegisterClick,
  onForgotPasswordClick,
  className = '',
  testId
}) => {
  const [formData, setFormData] = useState<LoginCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<LoginCredentials>>({});
  const [rememberMe, setRememberMe] = useState(false);

  const loginMutation = useLogin();

  const validateForm = (): boolean => {
    const newErrors: Partial<LoginCredentials> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await loginMutation.mutateAsync(formData);
      onSuccess?.();
    } catch (error) {
      console.error('Login failed:', error);
      // Error is already handled by the mutation and displayed via notifications
    }
  };

  const handleInputChange = (field: keyof LoginCredentials) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`} data-testid={testId}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Sign In
          </h2>
          <p className="text-gray-600">
            Welcome back! Please sign in to your account.
          </p>
        </div>

        {/* Email Field */}
        <Input
          type="email"
          name="email"
          label="Email Address"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleInputChange('email')}
          error={errors.email}
          required
          autoComplete="email"
          autoFocus
          fullWidth
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          }
          testId={`${testId}-email`}
        />

        {/* Password Field */}
        <Input
          type="password"
          name="password"
          label="Password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleInputChange('password')}
          error={errors.password}
          required
          autoComplete="current-password"
          fullWidth
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
          testId={`${testId}-password`}
        />

        {/* Remember Me & Forgot Password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-600">
              Remember me
            </span>
          </label>

          {onForgotPasswordClick && (
            <button
              type="button"
              onClick={onForgotPasswordClick}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              data-testid={`${testId}-forgot-password`}
            >
              Forgot password?
            </button>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={loginMutation.isPending}
          disabled={loginMutation.isPending}
          testId={`${testId}-submit`}
        >
          {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
        </Button>

        {/* Register Link */}
        {onRegisterClick && (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={onRegisterClick}
                className="text-blue-600 hover:text-blue-500 font-medium"
                data-testid={`${testId}-register-link`}
              >
                Create one here
              </button>
            </p>
          </div>
        )}

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Login Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={() => {
              // Implement Google OAuth
              console.log('Google OAuth not implemented');
            }}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            }
            testId={`${testId}-google`}
          >
            Google
          </Button>
          
          <Button
            variant="outline"
            size="md"
            fullWidth
            onClick={() => {
              // Implement Apple OAuth
              console.log('Apple OAuth not implemented');
            }}
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.017 0C6.396 0 1.807 4.589 1.807 10.209c0 4.497 2.915 8.318 6.959 9.674.507-.937.886-2.057 1.136-3.121-.124-.65-.235-1.326-.235-2.025 0-2.318 1.87-4.188 4.188-4.188 2.318 0 4.188 1.87 4.188 4.188 0 .699-.111 1.375-.235 2.025.25 1.064.629 2.184 1.136 3.121 4.044-1.356 6.959-5.177 6.959-9.674C22.227 4.589 17.638 0 12.017 0z"/>
              </svg>
            }
            testId={`${testId}-apple`}
          >
            Apple
          </Button>
        </div>
      </form>
    </div>
  );
};