'use client';

import React from 'react';

export const StatsSection: React.FC = () => {
  const stats = [
    {
      number: '10,000+',
      label: 'Events Created',
      description: 'Amazing events hosted on our platform',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      number: '50,000+',
      label: 'Active Members',
      description: 'Event enthusiasts in our community',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
    },
    {
      number: '100+',
      label: 'Cities',
      description: 'Events happening worldwide',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      number: '98%',
      label: 'Satisfaction Rate',
      description: 'Happy attendees and organizers',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-r from-primary-600 via-primary-700 to-secondary-600 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.5) 1px, transparent 0)`,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Our <span className="text-yellow-300">Impact</span> in Numbers
          </h2>
          <p className="text-xl text-primary-100 max-w-3xl mx-auto leading-relaxed">
            Join a thriving community that's making connections and creating memories across the globe.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="text-center animate-slide-up group"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-xl mb-6 group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
                <div className="text-white">
                  {stat.icon}
                </div>
              </div>

              {/* Number */}
              <div className="text-4xl sm:text-5xl font-bold text-white mb-3 group-hover:scale-110 transition-transform duration-300">
                {stat.number}
              </div>

              {/* Label */}
              <div className="text-xl font-semibold text-yellow-300 mb-2">
                {stat.label}
              </div>

              {/* Description */}
              <div className="text-primary-100 text-sm leading-relaxed">
                {stat.description}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};