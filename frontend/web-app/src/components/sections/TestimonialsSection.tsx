'use client';

import React from 'react';

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      id: 1,
      content: "EventHub has completely transformed how I discover and attend events. The platform is intuitive, and I've met so many amazing people through the events I've joined.",
      author: "Sarah Chen",
      role: "Software Engineer",
      company: "TechCorp",
      avatar: "/api/placeholder/64/64",
      rating: 5,
    },
    {
      id: 2,
      content: "As an event organizer, EventHub has made my life so much easier. The tools are comprehensive, and the community engagement is outstanding. Highly recommended!",
      author: "Marcus Rodriguez",
      role: "Community Manager",
      company: "Innovation Lab",
      avatar: "/api/placeholder/64/64",
      rating: 5,
    },
    {
      id: 3,
      content: "I've attended over 20 events through EventHub this year alone. The quality of events and the seamless experience keep me coming back for more.",
      author: "Emily Johnson",
      role: "Marketing Director",
      company: "Creative Agency",
      avatar: "/api/placeholder/64/64",
      rating: 5,
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-neutral-50 to-pastel-purple">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary-100 to-secondary-100 border border-primary-200/50 mb-6">
            <span className="text-sm font-medium text-primary-700">
              Testimonials
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl font-bold text-neutral-900 mb-6">
            What Our <span className="gradient-text">Community</span> Says
          </h2>
          
          <p className="text-xl text-neutral-600 max-w-3xl mx-auto leading-relaxed">
            Don't just take our word for it. Here's what event organizers and attendees have to say about their experience.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={testimonial.id}
              className="card p-8 animate-slide-up hover:scale-105 transition-transform duration-300"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              {/* Stars */}
              <div className="flex items-center mb-6">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-neutral-700 text-lg leading-relaxed mb-8">
                "{testimonial.content}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-400 to-secondary-400 flex items-center justify-center mr-4">
                  <span className="text-white font-semibold text-lg">
                    {testimonial.author.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-neutral-900">
                    {testimonial.author}
                  </div>
                  <div className="text-sm text-neutral-500">
                    {testimonial.role} at {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <p className="text-lg text-neutral-600 mb-8">
            Join thousands of satisfied users and start your event journey today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-primary px-8 py-4 text-lg font-semibold">
              Get Started Now
            </button>
            <button className="btn-ghost px-8 py-4 text-lg font-semibold">
              Read More Reviews
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};