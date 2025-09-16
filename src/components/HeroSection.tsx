'use client';

import { useState } from 'react';
import Image from 'next/image';
import AuthStatus from './AuthStatus';

export default function HeroSection() {
  const [email, setEmail] = useState('');

  const _handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log('Email submitted:', email);
    setEmail('');
  };

  return (
    <section
      className="relative min-h-screen flex items-center"
      style={{
        background:
          'radial-gradient(69.05% 165.98% at 15.4% 72.36%, rgba(0, 0, 0, 0.92) 15.02%, #202FE9 62.5%,rgb(85, 81, 81) 140%)',
      }}
    >
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Image
              src="/logo.png"
              alt="SkillX Logo"
              width={38}
              height={38}
              className="rounded"
            />
            <span className="text-white text-2xl font-bold">SkillX</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#about" className="text-white hover:text-gray-300 transition-colors">About</a>
            <a href="#features" className="text-white hover:text-gray-300 transition-colors">Features</a>
            <a href="#domains" className="text-white hover:text-gray-300 transition-colors">Domains</a>
            <a href="#companies" className="text-white hover:text-gray-300 transition-colors">For Companies</a>
            <a href="#testimonials" className="text-white hover:text-gray-300 transition-colors">Testimonials</a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <AuthStatus />
          </div>
        </div>
      </header>

      {/* Hero Content */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-16 w-full">
        {/* Content */}
        <div className="space-y-8">
          <div className="space-y-4 max-w-2xl">
            <p className="text-white text-lg leading-relaxed">
              India&apos;s first all-in-one, domain-agnostic career development platform for students and early-career professionals.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button className="bg-lime-300 text-black px-8 py-4 rounded-full font-semibold hover:bg-lime-400 transition-colors flex items-center justify-center space-x-2">
              <span>Start Exploring</span>
              <span>→</span>
            </button>
            <a href="#companies" className="text-white underline hover:text-gray-300 transition-colors">
              Join as a Company
            </a>
          </div>

          {/* Headline moved under CTA in a horizontal layout */}
          <h1
            className="text-white"
            style={{
              fontFamily: 'Inter, Arial, sans-serif',
              fontWeight: 800,
              fontStyle: 'normal',
              fontSize: 'clamp(60px, 8vw, 120px)',
              lineHeight: 'clamp(65px, 8.5vw, 125px)',
              letterSpacing: '-0.06em',
            }}
          >
            <div>One Platform Every</div>
            <div>Opportunity</div>
          </h1>

          <p className="text-white/70 text-sm">(Scroll for more)</p>
        </div>
      </div>
    </section>
  );
}
