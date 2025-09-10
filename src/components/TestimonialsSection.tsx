"use client";

export default function TestimonialsSection() {
  const testimonials = [
    {
      quote: "Working with SkillX was a game-changer for our business. Their expertise in web design helped us create a stunning online presence that resonated with our audience.",
      name: "Lorem Ipsum",
      company: "XYZ",
      avatar: "/api/placeholder/60/60"
    },
    {
      quote: "Working with SkillX was a game-changer for our business. Their expertise in web design helped us create a stunning online presence that resonated with our audience.",
      name: "Lorem Ipsum",
      company: "XYZ",
      avatar: "/api/placeholder/60/60"
    },
    {
      quote: "Working with SkillX was a game-changer for our business. Their expertise in web design helped us create a stunning online presence that resonated with our audience.",
      name: "Lorem Ipsum",
      company: "XYZ",
      avatar: "/api/placeholder/60/60"
    },
    {
      quote: "Working with SkillX was a game-changer for our business. Their expertise in web design helped us create a stunning online presence that resonated with our audience.",
      name: "Lorem Ipsum",
      company: "XYZ",
      avatar: "/api/placeholder/60/60"
    }
  ];

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
          <div className="flex gap-6 whitespace-nowrap animate-testimonial-scroll will-change-transform">
            {[...testimonials, ...testimonials].map((testimonial, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow w-[360px] shrink-0 min-h-[220px] overflow-hidden">
                <p className="text-gray-700 mb-6 leading-relaxed break-words whitespace-normal text-base">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="flex items-center space-x-3">
                  <img src={`https://i.pravatar.cc/60?img=${(index % testimonials.length) + 1}`} alt={testimonial.name} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
