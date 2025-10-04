const mongoose = require('mongoose');
require('dotenv').config();

// Define schemas directly in the script
const testimonialSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  company: String,
  content: { type: String, required: true },
  rating: { type: Number, default: 5 },
  featured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  avatar: String
}, { timestamps: true });

const featureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: String,
  category: { type: String, default: 'general' },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const partnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, required: true },
  website: String,
  category: { type: String, default: 'partner' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const careerPathSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  icon: String,
  category: { type: String, default: 'technology' },
  jobCount: { type: Number, default: 0 },
  averageSalary: { type: Number, default: 0 }
}, { timestamps: true });

const Testimonial = mongoose.model('Testimonial', testimonialSchema);
const Feature = mongoose.model('Feature', featureSchema);
const Partner = mongoose.model('Partner', partnerSchema);
const CareerPath = mongoose.model('CareerPath', careerPathSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillx';

async function seedStaticContent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Testimonial.deleteMany({});
    await Feature.deleteMany({});
    await Partner.deleteMany({});
    await CareerPath.deleteMany({});
    console.log('Cleared existing static content');

    // Seed Testimonials
    const testimonials = [
      {
        name: "Sarah Chen",
        role: "Software Engineer",
        company: "Google",
        content: "SkillX transformed my career completely. The mentorship program connected me with industry experts who guided me through the transition from student to professional.",
        rating: 5,
        featured: true,
        isActive: true,
        avatar: "https://i.pravatar.cc/100?img=1"
      },
      {
        name: "Rajesh Kumar",
        role: "Data Scientist",
        company: "Microsoft",
        content: "The internship opportunities through SkillX were incredible. I got hands-on experience with real projects and landed my dream job right after graduation.",
        rating: 5,
        featured: true,
        isActive: true,
        avatar: "https://i.pravatar.cc/100?img=2"
      },
      {
        name: "Emily Rodriguez",
        role: "UX Designer",
        company: "Adobe",
        content: "SkillX's career guidance helped me discover my passion for UX design. The personalized mentorship and skill development tracks made all the difference.",
        rating: 5,
        featured: true,
        isActive: true,
        avatar: "https://i.pravatar.cc/100?img=3"
      },
      {
        name: "Michael Thompson",
        role: "Product Manager",
        company: "Amazon",
        content: "From confused college student to confident product manager - SkillX's comprehensive approach to career development is unmatched in the industry.",
        rating: 5,
        featured: false,
        isActive: true,
        avatar: "https://i.pravatar.cc/100?img=4"
      },
      {
        name: "Priya Patel",
        role: "Cybersecurity Analyst",
        company: "Cisco",
        content: "The industry connections and real-world projects through SkillX gave me the confidence and skills to excel in cybersecurity. Highly recommended!",
        rating: 5,
        featured: false,
        isActive: true,
        avatar: "https://i.pravatar.cc/100?img=5"
      },
      {
        name: "David Kim",
        role: "Full Stack Developer",
        company: "Netflix",
        content: "SkillX's mentorship program was a game-changer. The personalized guidance and industry insights helped me land my first job at a top tech company.",
        rating: 5,
        featured: false,
        isActive: true,
        avatar: "https://i.pravatar.cc/100?img=6"
      }
    ];

    await Testimonial.insertMany(testimonials);
    console.log('✅ Seeded testimonials');

    // Seed Features
    const features = [
      {
        title: "Internships & Industry Collaboration",
        description: "Connect with verified opportunities and real-time projects from top companies",
        icon: "/internships.png",
        category: "career",
        order: 1,
        isActive: true
      },
      {
        title: "Knowledge & Skill Development",
        description: "Learn from experts with project-based tracks tailored to industry needs",
        icon: "/skills.png",
        category: "skill",
        order: 2,
        isActive: true
      },
      {
        title: "Career Discovery & Support",
        description: "Freelancing, jobs, hackathons, and personalized mentorship all in one place",
        icon: "/career-support.png",
        category: "career",
        order: 3,
        isActive: true
      },
      {
        title: "AI-Powered Career Matching",
        description: "Advanced algorithms match you with opportunities that fit your skills and interests",
        icon: "/intelligent-system.png",
        category: "technology",
        order: 4,
        isActive: true
      },
      {
        title: "Industry Mentorship Network",
        description: "Connect with experienced professionals for guidance and career advice",
        icon: "/career.png",
        category: "mentorship",
        order: 5,
        isActive: true
      }
    ];

    await Feature.insertMany(features);
    console.log('✅ Seeded features');

    // Seed Partners
    const partners = [
      {
        name: "Microsoft",
        logo: "https://logo.clearbit.com/microsoft.com",
        website: "https://microsoft.com",
        category: "enterprise",
        isActive: true
      },
      {
        name: "Google",
        logo: "/google.jpeg",
        website: "https://google.com",
        category: "enterprise",
        isActive: true
      },
      {
        name: "Adobe",
        logo: "/adobe.png",
        website: "https://adobe.com",
        category: "enterprise",
        isActive: true
      },
      {
        name: "Amazon",
        logo: "https://logo.clearbit.com/amazon.com",
        website: "https://amazon.com",
        category: "enterprise",
        isActive: true
      },
      {
        name: "Netflix",
        logo: "https://logo.clearbit.com/netflix.com",
        website: "https://netflix.com",
        category: "enterprise",
        isActive: true
      },
      {
        name: "Cisco",
        logo: "https://logo.clearbit.com/cisco.com",
        website: "https://cisco.com",
        category: "enterprise",
        isActive: true
      },
      {
        name: "Dropbox",
        logo: "https://logo.clearbit.com/dropbox.com",
        website: "https://dropbox.com",
        category: "startup",
        isActive: true
      },
      {
        name: "Slack",
        logo: "https://logo.clearbit.com/slack.com",
        website: "https://slack.com",
        category: "enterprise",
        isActive: true
      },
      {
        name: "Flipkart",
        logo: "https://logo.clearbit.com/flipkart.com",
        website: "https://flipkart.com",
        category: "enterprise",
        isActive: true
      },
      {
        name: "Tata Consultancy Services",
        logo: "https://logo.clearbit.com/tcs.com",
        website: "https://tcs.com",
        category: "enterprise",
        isActive: true
      }
    ];

    await Partner.insertMany(partners);
    console.log('✅ Seeded partners');

    // Seed Career Paths
    const careerPaths = [
      {
        name: "Artificial Intelligence",
        description: "Explore machine learning, deep learning, and AI applications",
        isActive: true,
        order: 1,
        category: "technology",
        jobCount: 150,
        averageSalary: 120000
      },
      {
        name: "Cyber Security",
        description: "Protect digital assets and learn ethical hacking techniques",
        isActive: true,
        order: 2,
        category: "technology",
        jobCount: 89,
        averageSalary: 95000
      },
      {
        name: "Web Development",
        description: "Build modern web applications using latest frameworks",
        isActive: true,
        order: 3,
        category: "technology",
        jobCount: 245,
        averageSalary: 85000
      },
      {
        name: "Software Development",
        description: "Create robust software solutions and applications",
        isActive: true,
        order: 4,
        category: "technology",
        jobCount: 320,
        averageSalary: 90000
      },
      {
        name: "Data Analytics",
        description: "Turn data into insights and drive business decisions",
        isActive: true,
        order: 5,
        category: "technology",
        jobCount: 178,
        averageSalary: 88000
      },
      {
        name: "UI / UX Designer",
        description: "Design intuitive and beautiful user experiences",
        isActive: true,
        order: 6,
        category: "design",
        jobCount: 95,
        averageSalary: 75000
      },
      {
        name: "Product Management",
        description: "Lead product strategy and development lifecycle",
        isActive: true,
        order: 7,
        category: "business",
        jobCount: 67,
        averageSalary: 110000
      }
    ];

    await CareerPath.insertMany(careerPaths);
    console.log('✅ Seeded career paths');

    console.log('\n🎉 All static content seeded successfully!');
    console.log('📊 Summary:');
    console.log(`   • ${testimonials.length} testimonials`);
    console.log(`   • ${features.length} features`);
    console.log(`   • ${partners.length} partners`);
    console.log(`   • ${careerPaths.length} career paths`);

  } catch (error) {
    console.error('Error seeding static content:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedStaticContent();