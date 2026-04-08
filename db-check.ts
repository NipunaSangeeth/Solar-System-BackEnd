import mongoose from "mongoose";
import { connectDB } from "./src/infrastructure/db";
import { EnergyGenarationRecord } from "./src/infrastructure/entities/EnergyGenarationRecord";
import "dotenv/config"; // Loads environment variables (like MONGODB_URI)

/**
 * Diagnostic Utility: checkData
 * Purpose: Analyzes the database to troubleshoot data gaps and sync issues.
 */
async function checkData() {
  // Step 1: Establish a connection to the MongoDB cluster
  await connectDB();

  // Step 2: Get the total number of production records in the entire database
  const count = await EnergyGenarationRecord.countDocuments();
  console.log("Total records in DB:", count);

  // Step 3: Find the single most recent record to see the "Last Active" timestamp
  const recent = await EnergyGenarationRecord.find()
    .sort({ timeStamp: -1 })
    .limit(1);
  console.log("Most recent record data:", JSON.stringify(recent, null, 2));

  // Step 4: Check if any records exist within the actual last 7 days (current time)
  // This is where we discovered the gap between March and April!
  const stats7DaysCount = await EnergyGenarationRecord.countDocuments({
    timeStamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
  });
  console.log("Records found in the literal last 7 days:", stats7DaysCount);

  // Step 5: Close the script process
  process.exit(0);
}

// Execute the diagnostic
checkData();
