'use client';

import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { Dashboard } from '../../components/pages/Dashboard';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}