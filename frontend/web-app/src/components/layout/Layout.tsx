'use client';

import React from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { ErrorBoundary } from '../../shared/components/organisms/ErrorBoundary';
import { NotificationSystem } from '../organisms/NotificationSystem';

interface LayoutProps {
  children: React.ReactNode;
  showFooter?: boolean;
  className?: string;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  showFooter = true,
  className = '' 
}) => {
  return (
    <div className={`min-h-screen bg-gradient-to-br from-neutral-50 via-white to-pastel-purple ${className}`}>
      <ErrorBoundary level="page">
        <Header />
        <main className="pt-16">
          <ErrorBoundary level="component">
            {children}
          </ErrorBoundary>
        </main>
        {showFooter && <Footer />}
        <NotificationSystem />
      </ErrorBoundary>
    </div>
  );
};