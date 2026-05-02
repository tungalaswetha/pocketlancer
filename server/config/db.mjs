import mongoose from "mongoose";

// Sensible Fix: Always check if the URI exists before trying to connect
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ ERROR: MONGO_URI is not defined in your .env file.");
  process.exit(1);
}

const connectDB = async () => {
  try {
    // Industry Standard 2026: No need for useNewUrlParser or useUnifiedTopology anymore
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      // Connection Pooling: Allows the app to handle many users at once
      maxPoolSize: 10,
    });

    console.log(`✅ PocketLancer MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    // Long-term Fix: Better error logging
    console.error(
      `❌ MongoDB Connection Error: ${err instanceof Error ? err.message : err}`,
    );

    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;
