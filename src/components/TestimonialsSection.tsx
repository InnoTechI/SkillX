"use client";

import { useEffect, useState } from 'react';

interface Testimonial {
  _id: string;
  name: string;
  role: string;
  company?: string;
  content: string;
  rating: number;
  avatar?: string;
}

export default function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const response = await fetch('/api/testimonials?limit=6');
      const data = await response.json();
      
      if (data.success && data.data) {
        setTestimonials(data.data);
      }
    } catch (error) {
      console.error('Error fetching testimonials:', error);
      // Fallback to empty array if API fails
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section id="testimonials" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading testimonials...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonials" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16 text-left">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-gray-900">Transforming Careers</span>
            <br />
            <span className="text-gray-500">Everyday</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl">
            Hear from Students who found their dream careers through Skill X
          </p>
        </div>

        {/* Auto-scrolling Testimonials */}
        <div className="relative overflow-hidden">
          {testimonials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No testimonials available</p>
            </div>
          ) : (
            <div className="flex gap-6 whitespace-nowrap animate-testimonial-scroll will-change-transform">
              {[...testimonials, ...testimonials].map((testimonial, index) => (
                <div key={`${testimonial._id}-${index}`} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow w-[360px] shrink-0 min-h-[220px] overflow-hidden">
                  <p className="text-gray-700 mb-6 leading-relaxed break-words whitespace-normal text-base">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div className="flex items-center space-x-3">
                    <img 
                      src={testimonial.avatar || `https://i.pravatar.cc/60?img=${(index % testimonials.length) + 1}`} 
                      alt={testimonial.name} 
                      className="w-12 h-12 rounded-full object-cover" 
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.name}</div>
                      <div className="text-sm text-gray-500">
                        {testimonial.role}
                        {testimonial.company && ` at ${testimonial.company}`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes testimonial-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-testimonial-scroll {
            animation: testimonial-scroll 30s linear infinite;
          }
        `}</style>
      </div>
    </section>
  );
}
