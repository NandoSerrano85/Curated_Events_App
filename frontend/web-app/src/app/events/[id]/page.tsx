'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Layout } from '../../../components/layout/Layout';
import { EventDetails } from '../../../components/pages/EventDetails';

export const dynamic = 'force-dynamic';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = parseInt(params.id as string, 10);

  return (
    <Layout>
      <EventDetails eventId={eventId} />
    </Layout>
  );
}