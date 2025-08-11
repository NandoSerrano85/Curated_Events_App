import React, { useState } from 'react';
import { Input, Button } from '../atoms';
import { useRegister } from '../../hooks/useAuth';
import { RegisterData } from '../../types';

export interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
  className?: string;
  testId?: string;
}

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
  agreeToTerms: boolean;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onLoginClick,
  className = '',
  testId
}) => {
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Partial<RegisterFormData>>({});

  const registerMutation = useRegister();

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterFormData> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordRequirements = [];
      if (formData.password.length < 8) {
        passwordRequirements.push('at least 8 characters');
      }
      if (!/[A-Z]/.test(formData.password)) {
        passwordRequirements.push('one uppercase letter');
      }
      if (!/[a-z]/.test(formData.password)) {
        passwordRequirements.push('one lowercase letter');
      }
      if (!/[0-9]/.test(formData.password)) {
        passwordRequirements.push('one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(formData.password)) {
        passwordRequirements.push('one special character');
      }

      if (passwordRequirements.length > 0) {
        newErrors.password = `Password must contain ${passwordRequirements.join(', ')}`;
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Terms agreement validation
    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms and conditions';
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
      const { confirmPassword, agreeToTerms, ...registerData } = formData;
      await registerMutation.mutateAsync(registerData);
      onSuccess?.();
    } catch (error) {
      console.error('Registration failed:', error);
      // Error is already handled by the mutation and displayed via notifications
    }
  };

  const handleInputChange = (field: keyof RegisterFormData) => (value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

    if (score === 0) return { score, label: 'Too weak', color: 'text-red-500' };
    if (score <= 2) return { score, label: 'Weak', color: 'text-red-500' };
    if (score <= 3) return { score, label: 'Fair', color: 'text-yellow-500' };
    if (score <= 4) return { score, label: 'Good', color: 'text-blue-500' };
    return { score, label: 'Strong', color: 'text-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className={`w-full max-w-md mx-auto ${className}`} data-testid={testId}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Create Account
          </h2>
          <p className="text-gray-600">
            Join us to discover amazing events in your area.
          </p>
        </div>

        {/* Name Field */}
        <Input
          type="text"
          name="name"
          label="Full Name"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleInputChange('name')}
          error={errors.name}
          required
          autoComplete="name"
          autoFocus
          fullWidth
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
          testId={`${testId}-name`}
        />

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
          fullWidth
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
            </svg>
          }
          testId={`${testId}-email`}
        />

        {/* Password Field */}
        <div className="space-y-2">
          <Input
            type="password"
            name="password"
            label="Password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleInputChange('password')}
            error={errors.password}
            required
            autoComplete="new-password"
            fullWidth
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            testId={`${testId}-password`}
          />
          
          {/* Password Strength Indicator */}
          {formData.password && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Password strength:</span>
                <span className={`font-medium ${passwordStrength.color}`}>
                  {passwordStrength.label}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    passwordStrength.score <= 2 ? 'bg-red-500' :
                    passwordStrength.score <= 3 ? 'bg-yellow-500' :
                    passwordStrength.score <= 4 ? 'bg-blue-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <Input
          type="password"
          name="confirmPassword"
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          error={errors.confirmPassword}
          required
          autoComplete="new-password"
          fullWidth
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          testId={`${testId}-confirm-password`}
        />

        {/* Terms Agreement */}
        <div className="space-y-2">
          <label className="flex items-start space-x-2">
            <input
              type="checkbox"
              checked={formData.agreeToTerms}
              onChange={(e) => handleInputChange('agreeToTerms')(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <span className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-500 underline">
                Terms of Service
              </a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-500 underline">
                Privacy Policy
              </a>
            </span>
          </label>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600">{errors.agreeToTerms}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={registerMutation.isPending}
          disabled={registerMutation.isPending}
          testId={`${testId}-submit`}
        >
          {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
        </Button>

        {/* Login Link */}
        {onLoginClick && (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onLoginClick}
                className="text-blue-600 hover:text-blue-500 font-medium"
                data-testid={`${testId}-login-link`}
              >
                Sign in here
              </button>
            </p>
          </div>
        )}
      </form>
    </div>
  );
};