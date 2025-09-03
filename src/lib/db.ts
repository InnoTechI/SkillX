import mongoose from 'mongoose';

let isConnected = 0; // 0 = disconnected, 1 = connected

export async function connectDB() {
  if (isConnected) return mongoose.connection;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  const conn = await mongoose.connect(uri);
  isConnected = 1;
  return conn.connection;
}

export async function disconnectDB() {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = 0;
  }
}
