export default function CareerPathsSection() {
  const careerPaths = [
    { id: 1, name: "Artificial Intelligence", isActive: true },
    { id: 2, name: "Cyber Security", isActive: false },
    { id: 3, name: "Web Development", isActive: false },
    { id: 4, name: "Software Development", isActive: false },
    { id: 5, name: "Data Analytics", isActive: false },
    { id: 6, name: "UI / UX Designer", isActive: false },
    { id: 7, name: "Product Management", isActive: false },
  ];

  return (
    <section id="domains" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-left">
            <span className="text-gray-900">Explore your</span>
            <br />
            <span className="text-gray-500">Career Path</span>
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl">
            Discover opportunities across diverse domains and find your perfect career match
          </p>
        </div>

        {/* Career Paths Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {careerPaths.map((path) => (
            <div
              key={path.id}
              className={`p-6 rounded-2xl transition-all duration-300 hover:shadow-lg ${
                path.isActive 
                  ? 'bg-gray-50 text-gray-900' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`text-sm font-medium ${
                  path.isActive ? 'text-gray-400' : 'text-gray-400'
                }`}>
                  {path.id.toString().padStart(2, '0')} /
                </span>
                <h3 className={`text-xl font-bold ${
                  path.isActive ? 'text-gray-900' : 'text-gray-900'
                }`}>
                  {path.name}
                </h3>
              </div>
            </div>
          ))}
        </div>

        {/* For Companies Section */}
        <div className="mt-20 bg-gray-50 rounded-3xl p-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              
              <h3 className="text-4xl font-bold">
                <span className="text-gray-900">Hire Future</span>
                <br />
                <span className="text-gray-500">Ready Talent</span>
              </h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Companies can post internships, access candidates, and gain access to motivated, trained young professionals ready to make an impact.
              </p>
              
              <div className="space-y-4">
                {[
                  "Access to vetted, trained candidates",
                  "Reduced hiring time and costs",
                  "Custom assessment tools",
                  "Direct university partnerships"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-lime-300 text-black px-8 py-3 rounded-full font-semibold hover:bg-lime-400 transition-colors flex items-center justify-center space-x-2">
                  <span>Join as a Hiring Partner</span>
                  <span>→</span>
                </button>
                <a href="#learn-more" className="text-gray-900 underline hover:text-gray-700 transition-colors self-center">
                  Learn More
                </a>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="w-80 h-[24rem] rounded-2xl overflow-hidden">
                <img src="/hire-talent.png" alt="Hire Future Ready Talent" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
