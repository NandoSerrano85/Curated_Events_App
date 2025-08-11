'use client';

import React from 'react';
import { Layout } from '../../components/layout/Layout';
import { EventsListing } from '../../components/pages/EventsListing';

export const dynamic = 'force-dynamic';

export default function EventsPage() {
  return (
    <Layout>
      <EventsListing />
    </Layout>
  );
}