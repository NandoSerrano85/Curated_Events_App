'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { EventCard } from '../../shared/components/molecules/EventCard';
import { Button } from '../../shared/components/atoms/Button';
import { LoadingSpinner } from '../../shared/components/atoms/LoadingSpinner';
import { useAuthStore } from '../../shared/store/authStore';
// import { useUserEvents, useUserRegistrations } from '../../shared/hooks/useEvents';

export const Dashboard: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'created' | 'registered' | 'profile'>('overview');

  // Mock data for demonstration
  const mockStats = {
    eventsCreated: 5,
    eventsRegistered: 12,
    eventsAttended: 8,
    totalViews: 1247
  };

  const mockCreatedEvents = [
    {
      id: 1,
      title: "React Workshop 2024",
      description: "Learn the latest React patterns and best practices",
      date: "2024-03-15T09:00:00Z",
      location: "San Francisco, CA",
      capacity: 50,
      currentRegistrations: 35,
      category: "TECHNOLOGY",
      tags: ["React", "JavaScript"],
      price: 99,
      currency: "USD",
      createdBy: user?.id || 1,
      imageUrl: "/api/placeholder/400/240",
      status: "PUBLISHED",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-15T00:00:00Z",
    }
  ];

  const mockRegisteredEvents = [
    {
      id: 2,
      title: "AI Conference 2024",
      description: "Latest developments in artificial intelligence",
      date: "2024-03-20T10:00:00Z",
      location: "New York, NY",
      capacity: 200,
      currentRegistrations: 150,
      category: "TECHNOLOGY",
      tags: ["AI", "Machine Learning"],
      price: 299,
      currency: "USD",
      createdBy: 2,
      imageUrl: "/api/placeholder/400/240",
      status: "PUBLISHED",
      createdAt: "2024-01-02T00:00:00Z",
      updatedAt: "2024-01-16T00:00:00Z",
    }
  ];

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="max-w-4xl mx-auto text-center py-16">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-4">
            Sign In Required
          </h1>
          <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
            Please sign in to access your dashboard and manage your events.
          </p>
          <div className="space-x-4">
            <Link href="/auth/login">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button variant="ghost" size="lg">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'created', label: 'My Events', icon: '📅' },
    { id: 'registered', label: 'Registered', icon: '🎫' },
    { id: 'profile', label: 'Profile', icon: '👤' },
  ] as const;

  const handleRegister = (eventId: number) => {
    console.log(`Register for event ${eventId}`);
  };

  const handleViewDetails = (eventId: number) => {
    window.location.href = `/events/${eventId}`;
  };

  const handleEditEvent = (eventId: number) => {
    console.log(`Edit event ${eventId}`);
    // Navigate to edit page
  };

  return (
    <div className="min-h-screen pt-24 bg-gradient-to-b from-neutral-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center">
              <span className="text-white text-2xl font-bold">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">
                Welcome back, {user?.name || 'User'}!
              </h1>
              <p className="text-neutral-600">
                Manage your events and track your activity
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="glass rounded-2xl p-2 mb-8">
          <nav className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 shadow-soft'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-primary-600 mb-2">
                    {mockStats.eventsCreated}
                  </div>
                  <p className="text-neutral-600">Events Created</p>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-secondary-600 mb-2">
                    {mockStats.eventsRegistered}
                  </div>
                  <p className="text-neutral-600">Events Registered</p>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-accent-600 mb-2">
                    {mockStats.eventsAttended}
                  </div>
                  <p className="text-neutral-600">Events Attended</p>
                </div>
                <div className="glass rounded-2xl p-6 text-center">
                  <div className="text-3xl font-bold text-neutral-700 mb-2">
                    {mockStats.totalViews.toLocaleString()}
                  </div>
                  <p className="text-neutral-600">Total Views</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="glass rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Link href="/events/create">
                    <Button className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                      <span className="text-2xl">➕</span>
                      <span>Create Event</span>
                    </Button>
                  </Link>
                  <Link href="/events">
                    <Button variant="ghost" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                      <span className="text-2xl">🔍</span>
                      <span>Browse Events</span>
                    </Button>
                  </Link>
                  <Link href="/profile">
                    <Button variant="ghost" className="w-full h-20 flex flex-col items-center justify-center space-y-2">
                      <span className="text-2xl">⚙️</span>
                      <span>Settings</span>
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="glass rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 rounded-xl bg-green-50">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600">✓</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">Successfully registered for AI Conference 2024</p>
                      <p className="text-sm text-neutral-600">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 rounded-xl bg-blue-50">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600">📅</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">Created React Workshop 2024</p>
                      <p className="text-sm text-neutral-600">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 rounded-xl bg-purple-50">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600">👥</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900">5 new registrations for your event</p>
                      <p className="text-sm text-neutral-600">3 days ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'created' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-neutral-900">My Events</h2>
                <Link href="/events/create">
                  <Button>Create New Event</Button>
                </Link>
              </div>

              {mockCreatedEvents.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📅</div>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">No events created yet</h3>
                  <p className="text-neutral-600 mb-6">Start by creating your first event!</p>
                  <Link href="/events/create">
                    <Button>Create Your First Event</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockCreatedEvents.map((event) => (
                    <div key={event.id} className="relative">
                      <EventCard
                        event={event}
                        onRegister={handleRegister}
                        onViewDetails={handleViewDetails}
                        showRegisterButton={false}
                        showViewDetailsButton={true}
                        compact={false}
                        className="h-full"
                      />
                      <div className="absolute top-4 right-4 flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditEvent(event.id)}
                          className="bg-white/90 hover:bg-white shadow-sm"
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'registered' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Registered Events</h2>

              {mockRegisteredEvents.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">🎫</div>
                  <h3 className="text-xl font-semibold text-neutral-900 mb-2">No registered events</h3>
                  <p className="text-neutral-600 mb-6">Browse events and register for ones you're interested in!</p>
                  <Link href="/events">
                    <Button>Browse Events</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockRegisteredEvents.map((event) => (
                    <div key={event.id}>
                      <EventCard
                        event={event}
                        onRegister={handleRegister}
                        onViewDetails={handleViewDetails}
                        showRegisterButton={false}
                        showViewDetailsButton={true}
                        compact={false}
                        className="h-full"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-neutral-900">Profile Settings</h2>
              
              <div className="glass rounded-2xl p-8 space-y-8">
                {/* Profile Information */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-neutral-900">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        defaultValue={user?.name || ''}
                        className="input-field w-full"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        defaultValue={user?.email || ''}
                        className="input-field w-full"
                        placeholder="Enter your email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        className="input-field w-full"
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        className="input-field w-full"
                        placeholder="City, State"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Bio
                    </label>
                    <textarea
                      rows={4}
                      className="input-field w-full"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-6 pt-6 border-t border-neutral-200">
                  <h3 className="text-xl font-semibold text-neutral-900">Preferences</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">Email Notifications</p>
                        <p className="text-sm text-neutral-600">Receive updates about your events</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">SMS Notifications</p>
                        <p className="text-sm text-neutral-600">Receive text message reminders</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-neutral-900">Event Recommendations</p>
                        <p className="text-sm text-neutral-600">Show personalized event suggestions</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-4 pt-6 border-t border-neutral-200">
                  <Button>Save Changes</Button>
                  <Button variant="ghost">Cancel</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};