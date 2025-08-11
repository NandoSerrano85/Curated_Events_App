import React, { useState } from 'react';
import { Input, Button } from '../atoms';
import { BaseComponentProps } from '../../types';

export interface SearchBarProps extends BaseComponentProps {
  placeholder?: string;
  value?: string;
  onSearch?: (query: string) => void;
  onClear?: () => void;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  showSearchButton?: boolean;
  showClearButton?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search events...',
  value: controlledValue,
  onSearch,
  onClear,
  loading = false,
  disabled = false,
  fullWidth = true,
  showSearchButton = true,
  showClearButton = true,
  className = '',
  testId
}) => {
  const [internalValue, setInternalValue] = useState('');
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = controlledValue !== undefined ? () => {} : setInternalValue;
  
  const handleInputChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
  };
  
  const handleSearch = () => {
    if (value.trim()) {
      onSearch?.(value.trim());
    }
  };
  
  const handleClear = () => {
    if (controlledValue === undefined) {
      setInternalValue('');
    }
    onClear?.();
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  const searchIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
  
  const clearIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
  
  return (
    <div className={`flex items-center gap-2 ${fullWidth ? 'w-full' : ''} ${className}`} data-testid={testId}>
      <div className={`relative ${fullWidth ? 'flex-1' : ''}`}>
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          fullWidth={fullWidth}
          icon={searchIcon}
          iconPosition="left"
          className="pr-10"
        />
        
        {showClearButton && value && (
          <button
            type="button"
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear search"
          >
            {clearIcon}
          </button>
        )}
      </div>
      
      {showSearchButton && (
        <Button
          onClick={handleSearch}
          disabled={disabled || loading || !value.trim()}
          loading={loading}
          icon={searchIcon}
          variant="primary"
          testId={`${testId}-search-button`}
        >
          Search
        </Button>
      )}
    </div>
  );
};