// Check admin assignments for orders
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function checkAdminAssignments() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');
    
    const db = client.db('SkillX');
    
    // Find the admin user
    const admin = await db.collection('users').findOne({email: 'shrey@gmail.com'});
    if (!admin) {
      console.log('Admin not found');
      return;
    }
    
    console.log(`\n=== ADMIN: ${admin.firstName} ${admin.lastName} (${admin.email}) ===`);
    console.log(`Admin ID: ${admin._id}`);
    
    // Check all orders
    const allOrders = await db.collection('orders').find({}).toArray();
    console.log(`\n=== ALL ORDERS (${allOrders.length}) ===`);
    
    let assignedToAdmin = 0;
    let unassignedOrders = 0;
    
    allOrders.forEach((order, index) => {
      const isAssigned = order.assignedAdmin && order.assignedAdmin.toString() === admin._id.toString();
      const assignmentStatus = order.assignedAdmin ? 
        (isAssigned ? '✅ ASSIGNED TO THIS ADMIN' : '👤 ASSIGNED TO OTHER') : 
        '❌ UNASSIGNED';
      
      console.log(`${index + 1}. Order ${order.orderId || order.orderNumber} - ${assignmentStatus}`);
      
      if (isAssigned) assignedToAdmin++;
      if (!order.assignedAdmin) unassignedOrders++;
    });
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total Orders: ${allOrders.length}`);
    console.log(`Assigned to ${admin.firstName}: ${assignedToAdmin}`);
    console.log(`Unassigned: ${unassignedOrders}`);
    console.log(`Assigned to others: ${allOrders.length - assignedToAdmin - unassignedOrders}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAdminAssignments();