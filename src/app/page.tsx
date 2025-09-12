import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import CareerPathsSection from '@/components/CareerPathsSection';
import FeaturesSection from '@/components/FeaturesSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import PartnersSection from '@/components/PartnersSection';
import NewsletterSection from '@/components/NewsletterSection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <CareerPathsSection />
      <TestimonialsSection />
      <PartnersSection />
      <NewsletterSection />
      <Footer />
    </div>
  );
}
