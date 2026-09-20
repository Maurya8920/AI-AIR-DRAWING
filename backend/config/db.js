import mongoose from 'mongoose';

mongoose.connection.on('disconnected', () => console.warn('❌ MongoDB DISCONNECTED'));
mongoose.connection.on('error', (e) => console.warn('❌ MongoDB error:', e.message));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Fatal MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
