'use client';

import React from 'react';
import Link from 'next/link';
import { EventCard } from '../../shared/components/molecules/EventCard';
import { Event, EventCategory, EventStatus } from '../../shared/types';

export const FeaturedEvents: React.FC = () => {
  // Mock data - this would come from the API in real implementation
  const featuredEvents: Event[] = [
    {
      id: 1,
      title: "React Summit 2024",
      description: "Join us for the biggest React conference of the year featuring talks from industry leaders, hands-on workshops, and networking opportunities.",
      date: "2024-03-15T09:00:00Z",
      location: "San Francisco, CA",
      capacity: 500,
      currentRegistrations: 342,
      category: EventCategory.TECHNOLOGY,
      tags: ["React", "JavaScript", "Web Development"],
      price: 299,
      currency: "USD",
      createdBy: 1,
      imageUrl: "/api/placeholder/400/240",
      status: EventStatus.PUBLISHED,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    },
    {
      id: 2,
      title: "AI & Machine Learning Workshop",
      description: "Dive deep into artificial intelligence and machine learning with hands-on projects and real-world applications.",
      date: "2024-03-20T14:00:00Z",
      location: "New York, NY",
      capacity: 100,
      currentRegistrations: 78,
      category: EventCategory.TECHNOLOGY,
      tags: ["AI", "Machine Learning", "Python"],
      price: 199,
      currency: "USD",
      createdBy: 2,
      imageUrl: "/api/placeholder/400/240",
      status: EventStatus.PUBLISHED,
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-16T00:00:00Z",
    },
    {
      id: 3,
      title: "Startup Pitch Competition",
      description: "Present your startup idea to a panel of investors and industry experts. Win funding and mentorship opportunities.",
      date: "2024-03-25T18:00:00Z",
      location: "Austin, TX",
      capacity: 200,
      currentRegistrations: 156,
      category: EventCategory.BUSINESS,
      tags: ["Startup", "Pitch", "Investment"],
      price: 0,
      currency: "USD",
      createdBy: 3,
      imageUrl: "/api/placeholder/400/240",
      status: EventStatus.PUBLISHED,
      createdAt: "2024-01-03T00:00:00Z",
      updatedAt: "2024-01-17T00:00:00Z",
    },
    {
      id: 4,
      title: "Digital Art Exhibition",
      description: "Explore the intersection of technology and creativity in this immersive digital art experience.",
      date: "2024-03-30T10:00:00Z",
      location: "Los Angeles, CA",
      capacity: 300,
      currentRegistrations: 234,
      category: EventCategory.ARTS,
      tags: ["Digital Art", "NFT", "Creativity"],
      price: 45,
      currency: "USD",
      createdBy: 4,
      imageUrl: "/api/placeholder/400/240",
      status: EventStatus.PUBLISHED,
      createdAt: "2024-01-04T00:00:00Z",
      updatedAt: "2024-01-18T00:00:00Z",
    },
  ];

  const handleRegister = (eventId: number) => {
    console.log(`Register for event ${eventId}`);
    // This would handle the registration logic
  };

  const handleViewDetails = (eventId: number) => {
    window.location.href = `/events/${eventId}`;
  };

  return (
    <section className="py-24 gradient-bg-nature relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-pastel-mint to-pastel-emerald rounded-full float-animation blur-sm"></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-gradient-to-br from-pastel-blue to-pastel-lavender rounded-full float-animation blur-sm" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/3 w-16 h-16 bg-gradient-to-br from-pastel-peach to-pastel-orange rounded-full float-animation blur-sm" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-slide-up">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-pastel-mint to-pastel-blue border border-accent-200/50 mb-6">
            <span className="w-2 h-2 bg-accent-500 rounded-full mr-2 animate-pulse"></span>
            <span className="text-sm font-medium text-accent-700">
              Featured Events
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
            <span className="gradient-text">Don't Miss Out</span> on These Events
          </h2>
          
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            Handpicked events that offer exceptional experiences, learning opportunities, and networking potential.
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mb-12">
          {featuredEvents.map((event) => (
            <div key={event.id} className="animate-slide-up" style={{ animationDelay: `${event.id * 100}ms` }}>
              <EventCard
                event={event}
                onRegister={handleRegister}
                onViewDetails={handleViewDetails}
                showRegisterButton={true}
                showViewDetailsButton={true}
                compact={false}
                className="h-full hover:scale-105 transition-transform duration-300"
                testId={`featured-event-${event.id}`}
              />
            </div>
          ))}
        </div>

        {/* View All Events Button */}
        <div className="text-center animate-slide-up" style={{ animationDelay: '400ms' }}>
          <Link 
            href="/events"
            className="inline-flex items-center btn-primary px-10 py-4 text-lg font-semibold group shadow-large hover:shadow-color-lg transform hover:-translate-y-1 hover:scale-105"
          >
            <span>View All Events</span>
            <svg 
              className="ml-3 w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" 
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

        {/* Trust Indicators */}
        <div className="mt-20 pt-16 border-t border-accent-200/30 animate-slide-up" style={{ animationDelay: '600ms' }}>
          <div className="text-center mb-10">
            <p className="text-lg font-medium text-neutral-700 mb-2">
              Trusted by organizers from
            </p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-accent-400 to-secondary-400 mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 opacity-70">
            {/* Mock company logos */}
            {['TechCorp', 'Startup Inc', 'Creative Co', 'Innovation Lab'].map((company, index) => (
              <div 
                key={index}
                className="flex items-center justify-center p-6 card-pastel-mint hover:opacity-100 transition-all duration-300 transform hover:-translate-y-1"
                style={{ animationDelay: `${800 + index * 100}ms` }}
              >
                <span className="text-lg font-semibold text-accent-600">
                  {company}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};