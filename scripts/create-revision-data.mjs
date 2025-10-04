import mongoose from 'mongoose';
import '../src/models/User.ts';
import '../src/models/Order.ts';
import '../src/models/Revision.ts';

const MONGODB_URI = 'mongodb+srv://shreyansh:Eshbp%402005@cluster0.2ek6toj.mongodb.net/SkillX';

// Define schemas directly since import might not work
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  role: String
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  orderNumber: String,
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  serviceType: String,
  status: String
}, { timestamps: true });

const revisionSchema = new mongoose.Schema({
  orderNumber: String,
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revisionNumber: { type: Number, default: 1 },
  status: { 
    type: String, 
    enum: ['requested', 'in_progress', 'completed', 'rejected'],
    default: 'requested'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  description: String,
  estimatedCompletion: Date,
  feedback: String,
  adminNotes: String
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
const Revision = mongoose.models.Revision || mongoose.model('Revision', revisionSchema);

async function createSampleData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find existing users
    const users = await User.find({ role: 'client' }).limit(3);
    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log('No users found. Creating sample users...');
      
      const sampleUsers = await User.insertMany([
        {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@example.com',
          password: 'password123',
          role: 'client'
        },
        {
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@example.com',
          password: 'password123',
          role: 'client'
        },
        {
          firstName: 'Mike',
          lastName: 'Davis',
          email: 'mike.davis@example.com',
          password: 'password123',
          role: 'client'
        }
      ]);
      
      console.log('Created sample users:', sampleUsers.length);
    }

    // Find or create orders
    let orders = await Order.find().limit(3);
    
    if (orders.length === 0) {
      console.log('No orders found. Creating sample orders...');
      
      const allUsers = await User.find({ role: 'client' }).limit(3);
      
      const sampleOrders = await Order.insertMany([
        {
          orderNumber: 'ORD-001',
          client: allUsers[0]._id,
          serviceType: 'resume_writing',
          urgencyLevel: 'standard',
          status: 'completed',
          priority: 1,
          requirements: {
            industryType: 'Technology',
            experienceLevel: 'mid_level',
            targetRole: 'Software Engineer',
            atsOptimization: true
          },
          pricing: {
            basePrice: 150,
            totalAmount: 150,
            currency: 'USD',
            paymentStatus: 'paid'
          },
          timeline: {
            estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            lastActivity: new Date()
          },
          files: [],
          revisions: [],
          communications: []
        },
        {
          orderNumber: 'ORD-002',
          client: allUsers[1]._id,
          serviceType: 'cover_letter',
          urgencyLevel: 'standard',
          status: 'in_progress',
          priority: 2,
          requirements: {
            industryType: 'Marketing',
            experienceLevel: 'senior_level',
            targetRole: 'Marketing Manager',
            atsOptimization: true
          },
          pricing: {
            basePrice: 75,
            totalAmount: 75,
            currency: 'USD',
            paymentStatus: 'paid'
          },
          timeline: {
            estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
            lastActivity: new Date()
          },
          files: [],
          revisions: [],
          communications: []
        },
        {
          orderNumber: 'ORD-003',
          client: allUsers[2]._id,
          serviceType: 'linkedin_optimization',
          urgencyLevel: 'urgent',
          status: 'completed',
          priority: 3,
          requirements: {
            industryType: 'Finance',
            experienceLevel: 'entry_level',
            targetRole: 'Financial Analyst',
            atsOptimization: false
          },
          pricing: {
            basePrice: 100,
            urgencyFee: 25,
            totalAmount: 125,
            currency: 'USD',
            paymentStatus: 'paid'
          },
          timeline: {
            estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            lastActivity: new Date()
          },
          files: [],
          revisions: [],
          communications: []
        }
      ]);
      
      orders = sampleOrders;
      console.log('Created sample orders:', orders.length);
    }

    // Create sample revisions
    const existingRevisions = await Revision.find();
    if (existingRevisions.length === 0) {
      console.log('Creating sample revisions...');
      
      const allUsers = await User.find({ role: 'client' }).limit(3);
      
      const sampleRevisions = [
        {
          order: orders[0]._id,
          orderNumber: orders[0].orderNumber,
          requestedBy: allUsers[0]._id,
          revisionNumber: 1,
          status: 'requested',
          priority: 'high',
          description: 'Please add my recent project experience and update the skills section',
          estimatedCompletion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
        },
        {
          order: orders[1]._id,
          orderNumber: orders[1].orderNumber,
          requestedBy: allUsers[1]._id,
          revisionNumber: 1,
          status: 'in_progress',
          priority: 'medium',
          description: 'Minor formatting adjustments and add a professional summary',
          estimatedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
          adminNotes: 'Working on the formatting changes'
        },
        {
          order: orders[2]._id,
          orderNumber: orders[2].orderNumber,
          requestedBy: allUsers[2]._id,
          revisionNumber: 1,
          status: 'completed',
          priority: 'medium',
          description: 'Change the format to ATS-friendly and update contact information',
          estimatedCompletion: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          feedback: 'Updated the format as requested and optimized for ATS systems'
        }
      ];

      const createdRevisions = await Revision.insertMany(sampleRevisions);
      console.log('Created sample revisions:', createdRevisions.length);
    } else {
      console.log(`Found ${existingRevisions.length} existing revisions`);
    }

    console.log('Sample data creation completed successfully!');
    
  } catch (error) {
    console.error('Error creating sample data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createSampleData();