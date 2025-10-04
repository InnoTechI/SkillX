const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function assignOrdersToAdmin() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('SkillX');
    const ordersCollection = db.collection('orders');
    const usersCollection = db.collection('users');
    
    // Find the admin shrey@gmail.com
    const admin = await usersCollection.findOne({ email: 'shrey@gmail.com' });
    if (!admin) {
      console.log('❌ Admin shrey@gmail.com not found');
      return;
    }
    
    console.log(`\n=== ADMIN: ${admin.firstName} ${admin.lastName} (${admin.email}) ===`);
    console.log(`Admin ID: ${admin._id}`);
    
    // Find unassigned orders
    const unassignedOrders = await ordersCollection.find({ 
      $or: [
        { assignedAdmin: { $exists: false } },
        { assignedAdmin: null }
      ]
    }).toArray();
    
    console.log(`\n=== UNASSIGNED ORDERS (${unassignedOrders.length}) ===`);
    unassignedOrders.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order.orderId} - Client: ${order.clientId}`);
    });
    
    if (unassignedOrders.length === 0) {
      console.log('\n✅ No unassigned orders found');
      return;
    }
    
    // Assign all unassigned orders to this admin
    const result = await ordersCollection.updateMany(
      { 
        $or: [
          { assignedAdmin: { $exists: false } },
          { assignedAdmin: null }
        ]
      },
      { $set: { assignedAdmin: admin._id } }
    );
    
    console.log(`\n=== ASSIGNMENT RESULTS ===`);
    console.log(`✅ Assigned ${result.modifiedCount} orders to admin ${admin.email}`);
    
    // Verify the assignment
    const assignedToAdmin = await ordersCollection.find({ 
      assignedAdmin: admin._id 
    }).toArray();
    
    console.log(`\n=== VERIFICATION ===`);
    console.log(`Total orders now assigned to ${admin.email}: ${assignedToAdmin.length}`);
    assignedToAdmin.forEach((order, index) => {
      console.log(`${index + 1}. Order ${order.orderId}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

assignOrdersToAdmin();