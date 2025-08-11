'use client';

import React, { Suspense } from 'react';
import { Layout } from '../../components/layout/Layout';
import { SearchResults } from '../../components/pages/SearchResults';
import { LoadingSpinner } from '../../shared/components/atoms/LoadingSpinner';

function SearchResultsWrapper() {
  return <SearchResults />;
}

export default function SearchPage() {
  return (
    <Layout>
      <Suspense fallback={
        <div className="min-h-screen pt-24 flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-neutral-600">Loading search...</p>
          </div>
        </div>
      }>
        <SearchResultsWrapper />
      </Suspense>
    </Layout>
  );
}