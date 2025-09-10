import Image from 'next/image';

export default function AboutSection() {
  return (
    <section id="about" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            
            <h2 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="text-gray-900">Building the Future of Career Development through</span>
              
              <span className="text-gray-500"> Innovation, Opportunity, and Empowerment.</span>
            </h2>
          </div>
          <div className="flex items-start">
            <p className="text-gray-900 text-lg leading-relaxed">
              Founded with a vision to transform the education-to-employment pipeline, Inno-Tech is a future-focused technology company building scalable, intelligent solution for career growth and industry transformation.
            </p>
          </div>
        </div>

        {/* Three Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Card 1: Platform Development */}
          <div className="bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow">
            <div className="relative mb-6">
              <div className="w-full h-78 rounded-lg overflow-hidden relative">
                <Image
                  src="/platform-dev.jpg"
                  alt="Platform Development"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
              <button className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors shadow-lg">
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Platform Development</h3>
            <p className="text-gray-500">Scalable, user-centric solution</p>
          </div>

          {/* Card 2: Digital Transformation */}
          <div className="bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow">
            <div className="relative mb-6">
              <div className="w-full h-78 rounded-lg overflow-hidden relative">
                <Image
                  src="/digital-transform.jpg"
                  alt="Digital Transformation"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
              <button className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors shadow-lg">
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Digital Transformation</h3>
            <p className="text-gray-500">Future-focused technology integration</p>
          </div>

          {/* Card 3: Intelligent System */}
          <div className="bg-white rounded-2xl p-6 hover:shadow-lg transition-shadow">
            <div className="relative mb-6">
              <div className="w-full h-78 rounded-lg overflow-hidden relative">
                <Image
                  src="/intelligent-system.png"
                  alt="Intelligent System"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
              <button className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors shadow-lg">
                <svg className="w-5 h-5 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                </svg>
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Intelligent System</h3>
            <p className="text-gray-500">AI-powered career intelligence</p>
          </div>
        </div>
      </div>
    </section>
  );
}
