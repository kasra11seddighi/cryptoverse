// Establishes and manages the MongoDB connection using Mongoose.

import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  // Read the database connection string from environment variables.
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  // Connect to the MongoDB cluster.
  await mongoose.connect(mongoUri);

  console.log(`MongoDB connected: ${mongoose.connection.host}`);
}
