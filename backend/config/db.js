/**
 * config/db.js
 * Connects to MongoDB using Mongoose.
 * Call connectDB() once at server startup.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Mongoose 8 no longer needs deprecated options,
      // but these are safe to include for older drivers:
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
