"use client";

import { useEffect, useState } from 'react';

interface Partner {
  _id: string;
  name: string;
  logo: string;
  website?: string;
  category: string;
}

export default function PartnersSection() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners?limit=10');
      const data = await response.json();
      
      if (data.success && data.data) {
        setPartners(data.data);
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
      // Fallback to default partners if API fails
      setPartners([
        { _id: '1', name: "Microsoft", logo: "https://logo.clearbit.com/microsoft.com", category: "enterprise" },
        { _id: '2', name: "Google", logo: "/google.jpeg", category: "enterprise" },
        { _id: '3', name: "Adobe", logo: "/adobe.png", category: "enterprise" },
        { _id: '4', name: "HP", logo: "https://logo.clearbit.com/hp.com", category: "enterprise" },
        { _id: '5', name: "Dropbox", logo: "https://logo.clearbit.com/dropbox.com", category: "startup" },
        { _id: '6', name: "Slack", logo: "https://logo.clearbit.com/slack.com", category: "enterprise" },
        { _id: '7', name: "Flipkart", logo: "https://logo.clearbit.com/flipkart.com", category: "enterprise" },
        { _id: '8', name: "Tata", logo: "https://logo.clearbit.com/tata.com", category: "enterprise" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    // Fallback to a placeholder or hide the image
    img.style.display = 'none';
    const parent = img.parentElement;
    if (parent) {
      parent.innerHTML = `<span class="text-gray-500 text-sm">${img.alt}</span>`;
    }
  };

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading partners...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16 text-left">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            <span className="text-gray-900">Partnered with Industry Leaders</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-3xl">
            We collaborate with top universities and companies to provide the best opportunities for the students.
          </p>
        </div>

        {/* Partners Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {partners.map((partner) => (
            <div key={partner._id} className="bg-[#FFF6F6] border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center">
              <img
                src={partner.logo}
                onError={handleImgError}
                alt={`${partner.name} logo`}
                className="max-h-10 object-contain mix-blend-multiply"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
