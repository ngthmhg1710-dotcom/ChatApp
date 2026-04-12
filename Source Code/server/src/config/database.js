import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Auto-migrate: thêm pinnedMessages:[] cho conversation cũ chưa có field này
    // Chạy mỗi lần khởi động nhưng chỉ update document thực sự thiếu field
    const result = await mongoose.connection
      .collection('conversations')
      .updateMany(
        { pinnedMessages: { $exists: false } },
        { $set: { pinnedMessages: [] } }
      );
    if (result.modifiedCount > 0) {
      console.log(`🔧 Migration: added pinnedMessages to ${result.modifiedCount} conversations`);
    }

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// Connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ MongoDB error: ${err}`);
});