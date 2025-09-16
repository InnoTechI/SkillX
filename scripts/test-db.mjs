// Simple database connection test
import { connectDB } from '../src/lib/db.js';

async function testDBConnection() {
  try {
    console.log('🔌 Testing database connection...');
    await connectDB();
    console.log('✅ Database connection successful!');
    
    // Import User model and test basic query
    const { User } = await import('../src/models/User.js');
    const userCount = await User.countDocuments();
    console.log(`📊 Total users in database: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    process.exit(0);
  }
}

testDBConnection();
