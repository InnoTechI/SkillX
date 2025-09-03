import mongoose from 'mongoose';
import { config } from 'dotenv';
config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI missing');
  process.exit(1);
}

(async () => {
  await mongoose.connect(uri);
  const collections = await mongoose.connection.db.listCollections().toArray();
  const colNames = collections.map(c => c.name);
  console.log('Collections:', colNames);

  // Try users collection
  const users = await mongoose.connection.db.collection('users');
  const count = await users.countDocuments();
  const latest = await users.find().sort({ _id: -1 }).limit(1).toArray();
  console.log('Users count:', count);
  console.log('Latest user:', latest[0] || null);

  await mongoose.disconnect();
})();
