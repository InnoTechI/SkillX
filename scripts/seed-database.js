const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Import models
const { User } = require('../src/models/User.ts');
const { Order } = require('../src/models/Order.ts');
const { Testimonial } = require('../src/models/Testimonial.ts');
const { Feature } = require('../src/models/Feature.ts');
const { Partner } = require('../src/models/Partner.ts');

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Order.deleteMany({}),
      Testimonial.deleteMany({}),
      Feature.deleteMany({}),
      Partner.deleteMany({})
    ]);

    // Seed Users with proper password hashing
    console.log('👥 Seeding users...');
    const userList = [
      {
        firstName: 'Super',
        lastName: 'Admin',
        email: 'superadmin@skillx.com',
        password: 'superadmin123',
        role: 'super_admin',
        isEmailVerified: true,
        phone: '+1-555-0001'
      },
      {
        firstName: 'Admin',
        lastName: 'Manager',
        email: 'admin@skillx.com',
        password: 'admin12345',
        role: 'admin',
        isEmailVerified: true,
        phone: '+1-555-0002'
      },
      {
        firstName: 'Resume',
        lastName: 'Admin',
        email: 'resume.admin@skillx.com',
        password: 'resume12345',
        role: 'admin',
        isEmailVerified: true,
        phone: '+1-555-0003'
      },
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john@email.com',
        password: 'john12345',
        role: 'client',
        isEmailVerified: true,
        phone: '+1-555-1001'
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah@email.com',
        password: 'sarah12345',
        role: 'client',
        isEmailVerified: true,
        phone: '+1-555-1002'
      },
      {
        firstName: 'Mike',
        lastName: 'Davis',
        email: 'mike@email.com',
        password: 'mike12345',
        role: 'client',
        isEmailVerified: true,
        phone: '+1-555-1003'
      },
      {
        firstName: 'Emily',
        lastName: 'Chen',
        email: 'emily@email.com',
        password: 'emily12345',
        role: 'client',
        isEmailVerified: true,
        phone: '+1-555-1004'
      },
      {
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'robert@email.com',
        password: 'robert12345',
        role: 'client',
        isEmailVerified: true,
        phone: '+1-555-1005'
      },
      {
        firstName: 'Lisa',
        lastName: 'Anderson',
        email: 'lisa@email.com',
        password: 'lisa12345',
        role: 'client',
        isEmailVerified: true,
        phone: '+1-555-1006'
      },
      {
        firstName: 'David',
        lastName: 'Brown',
        email: 'david@email.com',
        password: 'david12345',
        role: 'client',
        isEmailVerified: true,
        phone: '+1-555-1007'
      }
    ];

    // Create users individually to trigger pre-save hooks
    const users = [];
    for (const userData of userList) {
      const user = new User(userData);
      await user.save();
      users.push(user);
    }

    // Seed Orders
    console.log('📋 Seeding orders...');
    const orders = await Order.insertMany([
      {
        client: users[3]._id, // John Smith
        assignedAdmin: users[1]._id, // Admin Manager
        serviceType: 'resume_writing',
        urgencyLevel: 'standard',
        status: 'in_progress',
        requirements: {
          targetRole: 'Senior Software Engineer',
          industryType: 'Technology',
          experienceLevel: 'senior_level',
          specialRequests: 'ATS optimization and modern design with tech stack highlights',
          atsOptimization: true,
          keywords: ['JavaScript', 'React', 'Node.js', 'leadership', 'management']
        },
        pricing: {
          basePrice: 150,
          urgencyFee: 0,
          totalAmount: 150,
          currency: 'USD',
          paymentStatus: 'paid'
        },
        timeline: {
          estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          lastActivity: new Date()
        }
      },
      {
        client: users[4]._id, // Sarah Johnson
        serviceType: 'resume_writing',
        urgencyLevel: 'standard',
        status: 'pending',
        requirements: {
          targetRole: 'Frontend Developer',
          industryType: 'Technology',
          experienceLevel: 'entry_level',
          specialRequests: 'Fresh graduate format with portfolio emphasis',
          atsOptimization: true,
          keywords: ['HTML', 'CSS', 'JavaScript', 'React', 'responsive design']
        },
        pricing: {
          basePrice: 100,
          urgencyFee: 0,
          totalAmount: 100,
          currency: 'USD',
          paymentStatus: 'pending'
        },
        timeline: {
          estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          lastActivity: new Date()
        }
      },
      {
        client: users[5]._id, // Mike Davis
        assignedAdmin: users[2]._id, // Resume Admin
        serviceType: 'cv_writing',
        urgencyLevel: 'urgent',
        status: 'client_review',
        requirements: {
          targetRole: 'Product Manager',
          industryType: 'Technology',
          experienceLevel: 'mid_level',
          specialRequests: 'Career transition focus from engineering to product management',
          atsOptimization: true,
          keywords: ['product management', 'agile', 'strategy', 'user experience']
        },
        pricing: {
          basePrice: 125,
          urgencyFee: 62.5,
          totalAmount: 187.5,
          currency: 'USD',
          paymentStatus: 'paid'
        },
        timeline: {
          estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          lastActivity: new Date()
        }
      },
      {
        client: users[6]._id, // Emily Chen
        assignedAdmin: users[1]._id, // Admin Manager
        serviceType: 'linkedin_optimization',
        urgencyLevel: 'standard',
        status: 'completed',
        requirements: {
          targetRole: 'Data Scientist',
          industryType: 'Technology',
          experienceLevel: 'mid_level',
          specialRequests: 'LinkedIn profile optimization with industry keywords',
          atsOptimization: true,
          keywords: ['data science', 'machine learning', 'Python', 'analytics']
        },
        pricing: {
          basePrice: 75,
          urgencyFee: 0,
          totalAmount: 75,
          currency: 'USD',
          paymentStatus: 'paid'
        },
        timeline: {
          estimatedCompletion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          actualCompletionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          lastActivity: new Date()
        }
      },
      {
        client: users[7]._id, // Robert Wilson
        serviceType: 'cover_letter',
        urgencyLevel: 'express',
        status: 'payment_pending',
        requirements: {
          targetRole: 'Marketing Manager',
          industryType: 'Marketing & Advertising',
          experienceLevel: 'senior_level',
          specialRequests: 'Cover letter for specific job application at Google',
          atsOptimization: true,
          keywords: ['digital marketing', 'campaign management', 'ROI', 'analytics']
        },
        pricing: {
          basePrice: 50,
          urgencyFee: 25,
          totalAmount: 75,
          currency: 'USD',
          paymentStatus: 'pending'
        },
        timeline: {
          estimatedCompletion: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          lastActivity: new Date()
        }
      },
      {
        client: users[8]._id, // Lisa Anderson
        assignedAdmin: users[2]._id, // Resume Admin
        serviceType: 'resume_writing',
        urgencyLevel: 'standard',
        status: 'draft_ready',
        requirements: {
          targetRole: 'UX Designer',
          industryType: 'Design & Creative',
          experienceLevel: 'mid_level',
          specialRequests: 'Creative resume highlighting design portfolio and user research skills',
          atsOptimization: true,
          keywords: ['UX design', 'user research', 'prototyping', 'Figma', 'design thinking']
        },
        pricing: {
          basePrice: 120,
          urgencyFee: 0,
          totalAmount: 120,
          currency: 'USD',
          paymentStatus: 'paid'
        },
        timeline: {
          estimatedCompletion: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
          lastActivity: new Date()
        }
      },
      {
        client: users[9]._id, // David Brown
        serviceType: 'career_consultation',
        urgencyLevel: 'standard',
        status: 'in_review',
        requirements: {
          targetRole: 'DevOps Engineer',
          industryType: 'Technology',
          experienceLevel: 'entry_level',
          specialRequests: 'Career guidance for transitioning from system admin to DevOps',
          atsOptimization: false,
          keywords: ['DevOps', 'AWS', 'Docker', 'Kubernetes', 'CI/CD']
        },
        pricing: {
          basePrice: 200,
          urgencyFee: 0,
          totalAmount: 200,
          currency: 'USD',
          paymentStatus: 'pending'
        },
        timeline: {
          estimatedCompletion: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          lastActivity: new Date()
        }
      }
    ]);

    // Seed Testimonials
    console.log('💭 Seeding testimonials...');
    await Testimonial.insertMany([
      {
        name: 'Priya Sharma',
        role: 'Software Engineer',
        company: 'Google',
        content: 'SkillX completely transformed my career journey. The personalized mentorship and industry connections helped me land my dream job at Google!',
        rating: 5,
        isActive: true,
        order: 1
      },
      {
        name: 'Rahul Verma',
        role: 'Product Manager',
        company: 'Microsoft',
        content: 'The resume writing service was exceptional. Within a week of updating my resume through SkillX, I got calls from top tech companies.',
        rating: 5,
        isActive: true,
        order: 2
      },
      {
        name: 'Anita Patel',
        role: 'Data Scientist',
        company: 'Amazon',
        content: 'SkillX platform provided me with the right skills and networking opportunities. The career guidance was spot-on!',
        rating: 5,
        isActive: true,
        order: 3
      },
      {
        name: 'Vikram Singh',
        role: 'UX Designer',
        company: 'Adobe',
        content: 'Amazing platform for career development. The mentors are industry experts and the learning tracks are very practical.',
        rating: 4,
        isActive: true,
        order: 4
      }
    ]);

    // Seed Features
    console.log('⭐ Seeding features...');
    await Feature.insertMany([
      {
        title: 'Internships & Industry Collaboration',
        description: 'Connect with verified opportunities and real-time projects from top companies',
        icon: '/internships.png',
        category: 'career',
        isActive: true,
        order: 1
      },
      {
        title: 'Knowledge & Skill Development',
        description: 'Learn from industry experts with project-based learning tracks and certifications',
        icon: '/skills.png',
        category: 'skill',
        isActive: true,
        order: 2
      },
      {
        title: 'Career Discovery & Support',
        description: 'Freelancing opportunities, job placements, hackathons, and personalized mentorship',
        icon: '/career-support.png',
        category: 'career',
        isActive: true,
        order: 3
      },
      {
        title: 'AI-Powered Resume Builder',
        description: 'Create ATS-optimized resumes with our intelligent resume building system',
        icon: '/resume-builder.png',
        category: 'skill',
        isActive: true,
        order: 4
      },
      {
        title: 'Industry Mentorship',
        description: 'Get guidance from seasoned professionals and industry leaders',
        icon: '/mentorship.png',
        category: 'mentorship',
        isActive: true,
        order: 5
      }
    ]);

    // Seed Partners
    console.log('🤝 Seeding partners...');
    await Partner.insertMany([
      {
        name: 'Microsoft',
        logo: 'https://logo.clearbit.com/microsoft.com',
        website: 'https://microsoft.com',
        category: 'enterprise',
        isActive: true,
        order: 1
      },
      {
        name: 'Google',
        logo: '/google.jpeg',
        website: 'https://google.com',
        category: 'enterprise',
        isActive: true,
        order: 2
      },
      {
        name: 'Adobe',
        logo: '/adobe.png',
        website: 'https://adobe.com',
        category: 'enterprise',
        isActive: true,
        order: 3
      },
      {
        name: 'Amazon',
        logo: 'https://logo.clearbit.com/amazon.com',
        website: 'https://amazon.com',
        category: 'enterprise',
        isActive: true,
        order: 4
      },
      {
        name: 'Flipkart',
        logo: 'https://logo.clearbit.com/flipkart.com',
        website: 'https://flipkart.com',
        category: 'enterprise',
        isActive: true,
        order: 5
      },
      {
        name: 'Tata Consultancy Services',
        logo: 'https://logo.clearbit.com/tcs.com',
        website: 'https://tcs.com',
        category: 'enterprise',
        isActive: true,
        order: 6
      },
      {
        name: 'Infosys',
        logo: 'https://logo.clearbit.com/infosys.com',
        website: 'https://infosys.com',
        category: 'enterprise',
        isActive: true,
        order: 7
      },
      {
        name: 'Wipro',
        logo: 'https://logo.clearbit.com/wipro.com',
        website: 'https://wipro.com',
        category: 'enterprise',
        isActive: true,
        order: 8
      }
    ]);

    console.log('✅ Database seeding completed successfully!');
    console.log(`📊 Seeded:
    - ${users.length} users (3 admins, 7 clients)
    - ${orders.length} orders
    - 4 testimonials
    - 5 features
    - 8 partners`);

    console.log('\n🔐 Login Credentials:');
    console.log('ADMIN ACCOUNTS:');
    console.log('- superadmin@skillx.com / superadmin123 (Super Admin)');
    console.log('- admin@skillx.com / admin12345 (Admin Manager)');
    console.log('- resume.admin@skillx.com / resume12345 (Resume Admin)');
    console.log('\nCLIENT ACCOUNTS:');
    console.log('- john@email.com / john12345 (John Smith)');
    console.log('- sarah@email.com / sarah12345 (Sarah Johnson)');
    console.log('- mike@email.com / mike12345 (Mike Davis)');
    console.log('- emily@email.com / emily12345 (Emily Chen)');
    console.log('- robert@email.com / robert12345 (Robert Wilson)');
    console.log('- lisa@email.com / lisa12345 (Lisa Anderson)');
    console.log('- david@email.com / david12345 (David Brown)');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };