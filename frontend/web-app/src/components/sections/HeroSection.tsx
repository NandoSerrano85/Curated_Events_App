'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const HeroSection: React.FC = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const popularSearches = [
    'Tech Conferences',
    'Music Festivals',
    'Business Networking',
    'Art Exhibitions',
    'Food & Wine',
    'Startup Events',
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-bg-pastel">
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-pastel-blue to-pastel-purple rounded-full opacity-30 float-animation blur-sm"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-pastel-pink to-pastel-rose rounded-full opacity-25 float-animation blur-sm" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-16 h-16 bg-gradient-to-br from-pastel-mint to-pastel-emerald rounded-full opacity-35 float-animation blur-sm" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-20 h-20 bg-gradient-to-br from-pastel-lavender to-pastel-sky rounded-full opacity-30 float-animation blur-sm" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-gradient-to-br from-pastel-peach to-pastel-orange rounded-full opacity-20 float-animation blur-md" style={{ animationDelay: '3s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.5) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-secondary-100 border border-primary-200/50 mb-8">
            <span className="w-2 h-2 bg-accent-400 rounded-full mr-2 animate-pulse"></span>
            <span className="text-sm font-medium text-primary-700">
              Join 50,000+ event enthusiasts
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-6">
            <span className="block text-neutral-900 mb-2">
              Discover Amazing
            </span>
            <span className="block gradient-text">
              Events Near You
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-xl sm:text-2xl text-neutral-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Connect with like-minded people, learn new skills, and create unforgettable memories at events tailored just for you.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                <svg 
                  className="h-6 w-6 text-neutral-400" 
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for events, topics, or locations..."
                className="w-full pl-14 pr-32 py-6 text-lg bg-white bg-opacity-80 backdrop-blur-sm border-2 border-neutral-200 border-opacity-50 rounded-2xl shadow-soft focus:border-primary-400 focus:ring-4 focus:ring-primary-400 focus:ring-opacity-20 focus:outline-none transition-all duration-300 placeholder-neutral-400"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <button
                  type="submit"
                  className="btn-primary px-8 py-4 text-base font-semibold"
                >
                  Search
                </button>
              </div>
            </div>
          </form>

          {/* Popular Searches */}
          <div className="mb-12">
            <p className="text-sm text-neutral-500 mb-4">Popular searches:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {popularSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => router.push(`/search?q=${encodeURIComponent(search)}`)}
                  className="px-4 py-2 bg-white/60 backdrop-blur-sm border border-neutral-200/50 rounded-full text-sm font-medium text-neutral-700 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700 transition-all duration-200 hover:-translate-y-0.5"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link 
              href="/events"
              className="btn-primary px-10 py-4 text-lg font-semibold min-w-[200px]"
            >
              Explore Events
            </Link>
            <Link 
              href="/create-event"
              className="btn-outline px-10 py-4 text-lg font-semibold min-w-[200px]"
            >
              Create Event
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold gradient-text-cool mb-2">
                10,000+
              </div>
              <div className="text-neutral-600 text-sm font-medium">
                Events Created
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold gradient-text-warm mb-2">
                50,000+
              </div>
              <div className="text-neutral-600 text-sm font-medium">
                Happy Members
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
                100+
              </div>
              <div className="text-neutral-600 text-sm font-medium">
                Cities Worldwide
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce-soft">
        <div className="w-6 h-10 border-2 border-neutral-300 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-neutral-400 rounded-full mt-2 animate-pulse-soft"></div>
        </div>
      </div>
    </section>
  );
};