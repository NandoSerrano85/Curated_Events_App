import React from 'react';
import { BaseComponentProps } from '../../types';

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  autoComplete?: string;
  autoFocus?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  name?: string;
  id?: string;
  label?: string;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  placeholder,
  value,
  defaultValue,
  disabled = false,
  required = false,
  readOnly = false,
  autoComplete,
  autoFocus = false,
  maxLength,
  minLength,
  min,
  max,
  step,
  pattern,
  name,
  id,
  label,
  helperText,
  error,
  fullWidth = false,
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  testId,
  onChange,
  onBlur,
  onFocus,
  onKeyDown
}) => {
  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'block border rounded-md shadow-sm focus:outline-none focus:ring-1 transition-colors duration-200';
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };
  
  const stateClasses = error 
    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
    
  const disabledClasses = disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white';
  const fullWidthClasses = fullWidth ? 'w-full' : '';
  
  const inputClasses = [
    baseClasses,
    sizeClasses[size],
    stateClasses,
    disabledClasses,
    fullWidthClasses,
    icon ? (iconPosition === 'left' ? 'pl-10' : 'pr-10') : '',
    className
  ].filter(Boolean).join(' ');
  
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(event.target.value, event);
  };
  
  const renderIcon = () => {
    if (!icon) return null;
    
    const iconClasses = `absolute inset-y-0 ${iconPosition === 'left' ? 'left-0 pl-3' : 'right-0 pr-3'} flex items-center pointer-events-none text-gray-400`;
    
    return (
      <div className={iconClasses}>
        {icon}
      </div>
    );
  };
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <input
          type={type}
          id={inputId}
          name={name}
          className={inputClasses}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          readOnly={readOnly}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          minLength={minLength}
          min={min}
          max={max}
          step={step}
          pattern={pattern}
          data-testid={testId}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
        />
        {renderIcon()}
      </div>
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};