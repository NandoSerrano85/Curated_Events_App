'use client';

import React from 'react';
import Link from 'next/link';

export const CategoriesSection: React.FC = () => {
  const categories = [
    {
      name: 'Technology',
      description: 'Conferences, workshops, and meetups about the latest tech trends',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
      count: '2,847',
      color: 'from-gradient-cool to-gradient-cool-end',
      bgColor: 'from-pastel-blue to-pastel-sky',
      href: '/categories/technology',
    },
    {
      name: 'Business',
      description: 'Networking events, conferences, and professional development',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      count: '1,923',
      color: 'from-gradient-nature to-gradient-nature-end',
      bgColor: 'from-pastel-mint to-pastel-emerald',
      href: '/categories/business',
    },
    {
      name: 'Arts & Culture',
      description: 'Exhibitions, performances, and creative workshops',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
      count: '856',
      color: 'from-pastel-purple to-pastel-pink',
      bgColor: 'from-pastel-lavender to-pastel-rose',
      href: '/categories/arts',
    },
    {
      name: 'Sports & Fitness',
      description: 'Tournaments, training sessions, and wellness events',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      count: '1,234',
      color: 'from-gradient-warm to-gradient-warm-end',
      bgColor: 'from-pastel-peach to-pastel-orange',
      href: '/categories/sports',
    },
    {
      name: 'Music',
      description: 'Concerts, festivals, and music industry events',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      count: '2,156',
      color: 'from-primary-500 to-secondary-500',
      bgColor: 'from-pastel-purple to-pastel-lavender',
      href: '/categories/music',
    },
    {
      name: 'Food & Drink',
      description: 'Tastings, cooking classes, and culinary experiences',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
        </svg>
      ),
      count: '1,687',
      color: 'from-pastel-yellow to-pastel-peach',
      bgColor: 'from-pastel-yellow to-pastel-orange',
      href: '/categories/food',
    },
  ];

  return (
    <section className="py-24 gradient-bg-pastel relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-16 left-16 w-24 h-24 bg-gradient-to-br from-pastel-mint to-pastel-emerald rounded-full float-animation blur-sm"></div>
        <div className="absolute bottom-16 right-16 w-32 h-32 bg-gradient-to-br from-pastel-lavender to-pastel-sky rounded-full float-animation blur-sm" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/4 w-20 h-20 bg-gradient-to-br from-pastel-peach to-pastel-pink rounded-full float-animation blur-sm" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-pastel-mint to-pastel-blue border border-primary-200/50 mb-6">
            <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 animate-pulse"></span>
            <span className="text-sm font-medium text-primary-700">
              Event Categories
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
            Explore by <span className="gradient-text">Interest</span>
          </h2>
          
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            Whether you're passionate about technology, arts, business, or any other field, find events that match your interests.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              href={category.href}
              className="group block"
            >
              <div 
                className={`h-full p-8 rounded-2xl bg-gradient-to-br ${category.bgColor} border border-white/50 hover:shadow-large transition-all duration-300 hover:-translate-y-2 animate-slide-up`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-r ${category.color} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {category.icon}
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-neutral-900 mb-3 group-hover:text-primary-600 transition-colors duration-200">
                  {category.name}
                </h3>
                
                <p className="text-neutral-600 mb-6 leading-relaxed">
                  {category.description}
                </p>

                {/* Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-neutral-500">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {category.count} events
                  </div>
                  
                  <svg 
                    className="w-5 h-5 text-neutral-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-200" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M17 8l4 4m0 0l-4 4m4-4H3" 
                    />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Browse All Categories */}
        <div className="text-center">
          <Link 
            href="/categories"
            className="inline-flex items-center btn-outline px-8 py-4 text-lg font-semibold group"
          >
            <span>Browse All Categories</span>
            <svg 
              className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M17 8l4 4m0 0l-4 4m4-4H3" 
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
};