import React from 'react';
import { BaseComponentProps } from '../../types';

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'pastel' | 'gradient';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  type = 'button',
  icon,
  iconPosition = 'left',
  className = '',
  testId
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl focus:outline-none focus:ring-4 focus:ring-opacity-20 transition-all duration-200 transform active:scale-95';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-color hover:shadow-color-lg focus:ring-primary-500 hover:-translate-y-0.5',
    secondary: 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white shadow-soft hover:shadow-medium focus:ring-secondary-500 hover:-translate-y-0.5',
    outline: 'border-2 border-primary-500 hover:bg-primary-50 text-primary-600 hover:text-primary-700 focus:ring-primary-500 hover:border-primary-600',
    ghost: 'hover:bg-primary-50 text-primary-600 hover:text-primary-700 focus:ring-primary-500',
    danger: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-soft hover:shadow-medium focus:ring-red-500 hover:-translate-y-0.5',
    pastel: 'bg-gradient-to-r from-pastel-pink to-pastel-lavender hover:from-pastel-purple hover:to-pastel-blue text-primary-700 shadow-soft hover:shadow-medium focus:ring-primary-300 hover:-translate-y-0.5',
    gradient: 'bg-gradient-to-r from-gradient-cool to-gradient-cool-end hover:from-gradient-nature hover:to-gradient-nature-end text-white shadow-large focus:ring-primary-500 hover:-translate-y-1 hover:shadow-color-lg'
  };
  
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };
  
  const disabledClasses = 'opacity-50 cursor-not-allowed';
  const fullWidthClasses = fullWidth ? 'w-full' : '';
  
  const classes = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    disabled ? disabledClasses : '',
    fullWidthClasses,
    className
  ].filter(Boolean).join(' ');
  
  const renderIcon = () => {
    if (loading) {
      return (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    if (icon) {
      return (
        <span className={iconPosition === 'left' ? 'mr-2' : 'ml-2'}>
          {icon}
        </span>
      );
    }
    
    return null;
  };
  
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      data-testid={testId}
    >
      {iconPosition === 'left' && renderIcon()}
      {children}
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
};