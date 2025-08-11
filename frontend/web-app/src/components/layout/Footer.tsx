'use client';

import React from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Platform',
      links: [
        { name: 'Discover Events', href: '/events' },
        { name: 'Create Event', href: '/create-event' },
        { name: 'Categories', href: '/categories' },
        { name: 'How it Works', href: '/how-it-works' },
      ],
    },
    {
      title: 'Community',
      links: [
        { name: 'Blog', href: '/blog' },
        { name: 'Help Center', href: '/help' },
        { name: 'Contact Us', href: '/contact' },
        { name: 'Events API', href: '/developers' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About', href: '/about' },
        { name: 'Careers', href: '/careers' },
        { name: 'Press Kit', href: '/press' },
        { name: 'Privacy Policy', href: '/privacy' },
      ],
    },
  ];

  const socialLinks = [
    {
      name: 'Twitter',
      href: 'https://twitter.com/eventhub',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
        </svg>
      ),
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/eventhub',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      ),
    },
    {
      name: 'Instagram',
      href: 'https://instagram.com/eventhub',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.624 5.367 11.99 11.988 11.99s11.99-5.366 11.99-11.99C24.007 5.367 18.641.001 12.017.001zm4.624 7.512l-2.077 2.077c.055.31.088.633.088.967a4.905 4.905 0 01-4.905-4.905c0-.334.033-.657.088-.967L7.758 7.512a6.996 6.996 0 000 9.976l2.077-2.077a4.863 4.863 0 01-.088-.967 4.905 4.905 0 014.905-4.905c.334 0 .657.033.967.088l2.077-2.077a6.996 6.996 0 00-9.976 0z"/>
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-gradient-to-br from-neutral-50 to-pastel-blue border-t border-neutral-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-2">
            <Link 
              href="/" 
              className="flex items-center space-x-2 group mb-6"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="text-2xl font-bold gradient-text">
                EventHub
              </span>
            </Link>
            
            <p className="text-neutral-600 mb-6 max-w-md leading-relaxed">
              Discover amazing events, connect with like-minded people, and create unforgettable experiences. Join thousands of event organizers and attendees worldwide.
            </p>

            {/* Newsletter Signup */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-neutral-800 mb-3">
                Stay Updated
              </h4>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="input-field flex-1 text-sm"
                />
                <button className="btn-primary text-sm px-4 py-3 whitespace-nowrap">
                  Subscribe
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Get weekly updates about new events and features.
              </p>
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title} className="col-span-1">
              <h4 className="text-lg font-semibold text-neutral-800 mb-4">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-neutral-600 hover:text-primary-600 transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-200/50 my-12"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col lg:flex-row items-center justify-between space-y-6 lg:space-y-0">
          {/* Copyright */}
          <div className="text-center lg:text-left">
            <p className="text-sm text-neutral-600">
              © {currentYear} EventHub. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 mt-2">
              <Link 
                href="/terms" 
                className="text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-200"
              >
                Terms of Service
              </Link>
              <span className="text-neutral-300">•</span>
              <Link 
                href="/privacy" 
                className="text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <span className="text-neutral-300">•</span>
              <Link 
                href="/cookies" 
                className="text-xs text-neutral-500 hover:text-primary-600 transition-colors duration-200"
              >
                Cookie Policy
              </Link>
            </div>
          </div>

          {/* Social Links */}
          <div className="flex items-center space-x-6">
            <span className="text-sm font-medium text-neutral-700">
              Follow us:
            </span>
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200 group"
                  aria-label={social.name}
                >
                  <span className="group-hover:scale-110 transition-transform duration-200 block">
                    {social.icon}
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Made with Love */}
        <div className="text-center mt-8">
          <p className="text-xs text-neutral-500 flex items-center justify-center space-x-1">
            <span>Made with</span>
            <span className="text-red-500 animate-pulse-soft">♥</span>
            <span>for event organizers everywhere</span>
          </p>
        </div>
      </div>
    </footer>
  );
};