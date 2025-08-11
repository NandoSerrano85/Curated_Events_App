'use client';

import React from 'react';
import { Layout } from '../../../components/layout/Layout';
import { LoginForm } from '../../../shared/components/organisms/LoginForm';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Layout showFooter={false}>
      <div className="min-h-screen pt-16 flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </Layout>
  );
}