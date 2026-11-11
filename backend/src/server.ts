// Starts the CryptoVerse server after establishing the database connection.

import "dotenv/config";

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = Number(process.env.PORT) || 5000;

async function startServer(): Promise<void> {
  // Connect to MongoDB before starting the HTTP server.
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`🚀 CryptoVerse API running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/api/v1/health`);
  });

  // Gracefully shut down the HTTP server.
  const shutdown = (signal: string): void => {
    console.log(`${signal} received. Closing server...`);

    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

// Stop startup if the database connection fails.
startServer().catch((error: unknown) => {
  console.error("Failed to start CryptoVerse:", error);
  process.exit(1);
});
