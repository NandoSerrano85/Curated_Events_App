'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../../shared/store/authStore';
import { useAppStore } from '../../shared/store/appStore';

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const { mobileMenuOpen, toggleMobileMenu, closeMobileMenu } = useAppStore();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when pathname changes
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  const navigation = [
    { name: 'Discover', href: '/events' },
    { name: 'Create Event', href: '/create-event' },
    { name: 'Categories', href: '/categories' },
  ];

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'glass-pastel border-b border-pastel-purple/20 shadow-large backdrop-blur-lg' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-gradient-cool to-gradient-cool-end flex items-center justify-center group-hover:scale-110 transition-all duration-200 shadow-soft group-hover:shadow-color">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-xl font-bold gradient-text group-hover:text-primary-600 transition-colors duration-200">
                EventHub
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors duration-200 relative group ${
                  isActiveLink(item.href)
                    ? 'text-primary-600'
                    : 'text-neutral-600 hover:text-primary-500'
                }`}
              >
                {item.name}
                <span 
                  className={`absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 transform transition-transform duration-200 ${
                    isActiveLink(item.href) 
                      ? 'scale-x-100' 
                      : 'scale-x-0 group-hover:scale-x-100'
                  }`} 
                />
              </Link>
            ))}
          </nav>

          {/* Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg 
                  className="h-4 w-4 text-neutral-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search events..."
                className="input-field pl-10 py-2 text-sm bg-white/80 border-pastel-purple/20 focus:border-primary-400 focus:bg-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const query = (e.target as HTMLInputElement).value;
                    if (query.trim()) {
                      window.location.href = `/search?q=${encodeURIComponent(query)}`;
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link 
                  href="/dashboard"
                  className="btn-ghost py-2"
                >
                  Dashboard
                </Link>
                <div className="flex items-center space-x-2 p-2 rounded-xl hover:bg-pastel-blue/20 hover:backdrop-blur-sm transition-all duration-200 group">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gradient-warm to-gradient-warm-end flex items-center justify-center shadow-soft group-hover:shadow-medium">
                    <span className="text-white text-sm font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-neutral-700 group-hover:text-primary-600">
                    {user?.name || 'User'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link 
                  href="/auth/login"
                  className="btn-ghost py-2"
                >
                  Sign In
                </Link>
                <Link 
                  href="/auth/register"
                  className="btn-primary py-2"
                >
                  Join Now
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="p-2 rounded-lg text-neutral-600 hover:text-primary-500 hover:bg-neutral-50 transition-colors duration-200"
              onClick={toggleMobileMenu}
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              <svg 
                className="h-6 w-6" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                ) : (
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 6h16M4 12h16M4 18h16" 
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        className={`md:hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen 
            ? 'max-h-screen opacity-100' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="glass-dark border-t border-white/10 px-4 pt-4 pb-6 space-y-4">
          {/* Mobile Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg 
                className="h-4 w-4 text-neutral-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search events..."
              className="input-field pl-10 py-3 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = (e.target as HTMLInputElement).value;
                  if (query.trim()) {
                    window.location.href = `/search?q=${encodeURIComponent(query)}`;
                  }
                }
              }}
            />
          </div>

          {/* Mobile Navigation */}
          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-4 py-3 rounded-xl text-base font-medium transition-colors duration-200 ${
                  isActiveLink(item.href)
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-primary-500'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Mobile User Menu */}
          <div className="pt-4 border-t border-neutral-200">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="text-base font-medium text-neutral-900">
                      {user?.name || 'User'}
                    </div>
                    <div className="text-sm text-neutral-500">
                      {user?.email}
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="block px-4 py-3 rounded-xl text-base font-medium text-neutral-600 hover:bg-neutral-50 hover:text-primary-500 transition-colors duration-200"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="block px-4 py-3 rounded-xl text-base font-medium text-neutral-600 hover:bg-neutral-50 hover:text-primary-500 transition-colors duration-200"
                >
                  Profile
                </Link>
                <button
                  className="block w-full text-left px-4 py-3 rounded-xl text-base font-medium text-red-600 hover:bg-red-50 transition-colors duration-200"
                  onClick={() => {
                    // This will be implemented with the logout function
                    console.log('Logout');
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/auth/login"
                  className="block w-full btn-ghost text-center"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="block w-full btn-primary text-center"
                >
                  Join Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};