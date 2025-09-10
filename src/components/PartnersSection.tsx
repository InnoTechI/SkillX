"use client";

export default function PartnersSection() {
  const partners: { name: string; logos: string[] }[] = [
    { name: "Microsoft", logos: ["https://logo.clearbit.com/microsoft.com"] },
    { name: "HP", logos: ["https://logo.clearbit.com/hp.com"] },
    { name: "Dropbox", logos: ["https://logo.clearbit.com/dropbox.com"] },
    { name: "Slack", logos: ["https://logo.clearbit.com/slack.com"] },
    { name: "Dribbble", logos: ["https://logo.clearbit.com/dribbble.com"] },
    { name: "Adobe", logos: [
      "https://logo.clearbit.com/adobe.com",
      "https://cdn.simpleicons.org/adobe/ff0000",
      "https://upload.wikimedia.org/wikipedia/commons/4/4f/Adobe_Systems_logo_and_wordmark.svg"
    ] },
    { name: "Flipkart", logos: ["https://logo.clearbit.com/flipkart.com"] },
    { name: "Tata", logos: ["https://logo.clearbit.com/tata.com"] },
    { name: "Google", logos: [
      "https://logo.clearbit.com/google.com",
      "https://cdn.simpleicons.org/google/4285F4",
      "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg"
    ] }
  ];

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const fallbacks = (img.dataset.fallbacks || "").split("|").filter(Boolean);
    const idx = Number(img.dataset.fallbackIndex || "0");
    if (idx < fallbacks.length) {
      img.dataset.fallbackIndex = String(idx + 1);
      img.src = fallbacks[idx];
    } else {
      // last resort: show text placeholder
      img.style.display = 'none';
      const parent = img.parentElement;
      if (parent) {
        parent.innerHTML = `<span class="text-gray-500 text-sm">${img.alt}</span>`;
      }
    }
  };

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
          {partners.map((partner, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center">
              <img
                src={partner.logos[0]}
                data-fallbacks={partner.logos.slice(1).join("|")}
                data-fallback-index="0"
                onError={handleImgError}
                alt={`${partner.name} logo`}
                className="max-h-10 object-contain"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
