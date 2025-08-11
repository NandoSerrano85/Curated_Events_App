'use client';

import React from 'react';
import Link from 'next/link';

export const CTASection: React.FC = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-gradient-cool via-primary-600 to-gradient-cool-end relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Animated shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full float-animation blur-sm"></div>
        <div className="absolute top-20 right-20 w-24 h-24 bg-white/10 rounded-full float-animation blur-sm" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-white/10 rounded-full float-animation blur-sm" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-32 right-1/3 w-20 h-20 bg-white/10 rounded-full float-animation blur-sm" style={{ animationDelay: '1s' }}></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.5) 1px, transparent 0)`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="animate-slide-up">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <span className="w-2 h-2 bg-yellow-300 rounded-full mr-2 animate-pulse"></span>
            <span className="text-sm font-medium text-white">
              Ready to get started?
            </span>
          </div>

          {/* Heading */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-8 leading-tight">
            Your Next Amazing Event is Just{' '}
            <span className="text-yellow-300">One Click Away</span>
          </h2>

          {/* Description */}
          <p className="text-xl text-primary-100 mb-12 max-w-3xl mx-auto leading-relaxed">
            Join our community of event enthusiasts and organizers. Whether you're looking to attend or create events, we've got you covered.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Link 
              href="/auth/register"
              className="inline-flex items-center px-10 py-5 bg-white text-primary-700 font-bold text-lg rounded-2xl hover:bg-primary-50 hover:scale-105 transition-all duration-300 shadow-large hover:shadow-color-lg group min-w-[220px] transform hover:-translate-y-1"
            >
              <span>Join Free Today</span>
              <svg 
                className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform duration-200" 
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

            <Link 
              href="/create-event"
              className="inline-flex items-center px-10 py-5 bg-transparent border-2 border-white text-white font-bold text-lg rounded-2xl hover:bg-white hover:text-primary-700 hover:scale-105 transition-all duration-300 group min-w-[220px]"
            >
              <span>Create Event</span>
              <svg 
                className="ml-2 w-6 h-6 group-hover:translate-x-1 transition-transform duration-200" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
            </Link>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Quick Setup
              </h3>
              <p className="text-primary-100 text-sm text-center">
                Create your account and start discovering events in under 2 minutes
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Connect
              </h3>
              <p className="text-primary-100 text-sm text-center">
                Meet like-minded people and build meaningful connections
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Enjoy
              </h3>
              <p className="text-primary-100 text-sm text-center">
                Create unforgettable memories at amazing events
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};