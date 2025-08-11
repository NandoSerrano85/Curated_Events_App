'use client';

import React from 'react';
import { Layout } from '../../../components/layout/Layout';
import { RegisterForm } from '../../../shared/components/organisms/RegisterForm';

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return (
    <Layout showFooter={false}>
      <div className="min-h-screen pt-16 flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-50">
        <div className="w-full max-w-md">
          <RegisterForm />
        </div>
      </div>
    </Layout>
  );
}