'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

interface Feature {
  _id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
}

interface Statistics {
  studentsSupported: number;
  industryMentors: number;
  internshipPartnerships: number;
}

export default function FeaturesSection() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    studentsSupported: 10000,
    industryMentors: 500,
    internshipPartnerships: 200
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatures();
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/analytics');
      const data = await response.json();
      
      if (data.success && data.data) {
        setStatistics({
          studentsSupported: data.data.totalUsers || 10000,
          industryMentors: data.data.totalMentors || 500,
          internshipPartnerships: data.data.totalPartners || 200
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Keep default values if API fails
    }
  };

  const fetchFeatures = async () => {
    try {
      const response = await fetch('/api/features?limit=3');
      const data = await response.json();
      
      if (data.success && data.data) {
        setFeatures(data.data);
      }
    } catch (error) {
      console.error('Error fetching features:', error);
      // Fallback to default features if API fails
      setFeatures([
        {
          _id: '1',
          title: "Internships & Industry Collaboration",
          description: "Connect with verified opportunities and real-time projects",
          icon: "/internships.png",
          category: "career"
        },
        {
          _id: '2',
          title: "Knowledge & Skill Development",
          description: "Learn from experts with project based tracks",
          icon: "/skills.png",
          category: "skill"
        },
        {
          _id: '3',
          title: "Career Discovery & Support",
          description: "Freelancing, jobs, hackathons, and personalized mentorship",
          icon: "/career-support.png",
          category: "career"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading features...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-gray-900">Your Career Journey,</span>
              
              <span className="text-gray-500"> Reimagined</span>
            </h2>
          </div>
          <div className="flex items-start">
            <p className="text-gray-900 text-lg leading-relaxed">
              Skill X bridges the gap between classroom learning and real-world skills through internships, mentorship, and industry-backed learning tracks.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div key={feature._id} className="bg-white rounded-3xl p-6 hover:shadow-lg transition-shadow">
              <div className="relative w-full h-78 rounded-lg overflow-hidden">
                <Image src={feature.icon} alt={feature.title} fill className="object-cover" />
                <button className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors shadow-lg">
                  <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mt-6">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left - Value Proposition */}
          <div className="space-y-6">
            
            <h3 className="text-4xl font-bold leading-tight">
              <span className="text-gray-900">Because Career Building Deserves More</span>
              <br />
              <span className="text-gray-500">Than Just a Resume</span>
            </h3>
          </div>

          {/* Right - Statistics */}
          <div className="grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">{statistics.studentsSupported.toLocaleString()}+</div>
              <div className="text-gray-600">Students Supported</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">{statistics.industryMentors.toLocaleString()}+</div>
              <div className="text-gray-600">Industry Mentors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2">{statistics.internshipPartnerships.toLocaleString()}+</div>
              <div className="text-gray-600">Internship Partnerships</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
