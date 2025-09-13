export default function Footer() {
  return (
    <footer className="text-white py-16" style={{ background: 'radial-gradient(69.05% 165.98% at 15.4% 72.36%, rgba(0, 0, 0, 0.92) 15.02%, #202FE9 62.5%, #666666 140%)' }}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Side - Company Info */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <img src="/footer-logo.png" alt="SkillX" className="w-15 h-15 rounded-lg" />
              <span className="text-white text-4xl font-bold">SkillX</span>
            </div>
            
            <p className="text-gray-300 text-sm">Powered by INNO-TECH</p>
            
            <p className="text-gray-300 leading-relaxed">
              India&apos;s first all-in-one, domain-agnostic career development platform connecting students with real opportunities and industry mentors.
            </p>
            
            <div className="space-y-2 text-gray-300">
              <p>Email: hello@skillx.com</p>
              <p>Phone: +91 9876543234</p>
              <p>Address: Bangalore, India</p>
            </div>
          </div>

          {/* Right Side - Navigation Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* Platform */}
            <div>
              <h3 className="font-semibold mb-4">Platform</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#about" className="hover:text-white transition-colors">About skillX</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
                <li><a href="#domains" className="hover:text-white transition-colors">Career Domains</a></li>
                <li><a href="#success-stories" className="hover:text-white transition-colors">Success Stories</a></li>
              </ul>
            </div>

            {/* For Students */}
            <div>
              <h3 className="font-semibold mb-4">For Students</h3>
              <ul className ="space-y-2 text-gray-300">
                <li><a href="#internships" className="hover:text-white transition-colors">Find Internships</a></li>
                <li><a href="#skill-development" className="hover:text-white transition-colors">Skill Development</a></li>
                <li><a href="#mock-interviews" className="hover:text-white transition-colors">Mock Interviews</a></li>
                <li><a href="#resume-builder" className="hover:text-white transition-colors">Resume Builder</a></li>
              </ul>
            </div>

            {/* For Companies */}
            <div>
              <h3 className="font-semibold mb-4">For Companies</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#post-opportunities" className="hover:text-white transition-colors">Post Opportunities</a></li>
                <li><a href="#hire-talent" className="hover:text-white transition-colors">Hire Talent</a></li>
                <li><a href="#partnership" className="hover:text-white transition-colors">Partnership Program</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#help-center" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#contact" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#community" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#resources" className="hover:text-white transition-colors">Resources</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            ©2025 Skill X by INNO-TECH. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#privacy" className="text-gray-400 hover:text-white transition-colors text-sm">Privacy Policy</a>
            <a href="#terms" className="text-gray-400 hover:text-white transition-colors text-sm">Terms of Service</a>
            <a href="#cookies" className="text-gray-400 hover:text-white transition-colors text-sm">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
