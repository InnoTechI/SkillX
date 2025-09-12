'use client';

import { useState } from 'react';

export default function NewsletterSection() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Email submitted:', email);
    setEmail('');
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900">
              Never Miss an Opportunity <img src="/newsletter-logo.png" alt="emoji" className="inline-block align-middle" style={{ width: '1.25em', height: '1em' }} />
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed">
              Join thousands of students who get exclusive access to internships, hackathons, and career opportunities delivered to their inbox.
            </p>
            
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="flex-1 px-6 py-4 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100 text-gray-700 placeholder-gray-500"
                required
              />
              <button
                type="submit"
                className="bg-gray-900 text-white px-8 py-4 rounded-full font-semibold hover:bg-gray-700 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Right Content - Illustration */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-40 h-70 rounded-2xl overflow-hidden">
              <img src="/newsletter.png" alt="Newsletter" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
