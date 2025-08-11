'use client';

import React from 'react';
import { Layout } from '../components/layout/Layout';
import { HeroSection } from '../components/sections/HeroSection';
import { FeaturedEvents } from '../components/sections/FeaturedEvents';
import { CategoriesSection } from '../components/sections/CategoriesSection';
import { StatsSection } from '../components/sections/StatsSection';
import { TestimonialsSection } from '../components/sections/TestimonialsSection';
import { CTASection } from '../components/sections/CTASection';

export default function HomePage() {
  return (
    <Layout>
      <HeroSection />
      <FeaturedEvents />
      <CategoriesSection />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
    </Layout>
  );
}