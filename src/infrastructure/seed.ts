// // this File do Add the New Data and Clear the MongoDB
// import mongoose from "mongoose";
// import { SolarUnit } from "./entities/SolarUnit";
// import { EnergyGenarationRecord } from "./entities/EnergyGenarationRecord";
// import { User } from "./entities/User";
// import dotenv from "dotenv";
// import { connectDB } from "./db";

// dotenv.config();

// async function seed() {
//   try {
//     // Connect to DB
//     await connectDB();

//     // Clear existing data
//     await EnergyGenarationRecord.deleteMany({});
//     await SolarUnit.deleteMany({});
//     await User.deleteMany({});

//     //Create a new user
//     const user = await User.create({
//       name: "Alice Example",
//       email: "alice@example.com",
//     });

//     // Create a new solar unit linked to the user
//     const solarUnit = await SolarUnit.create({
//       userId: user._id,
//       serialNumber: "SU-0001",
//       installationDate: new Date("2025-09-21"),
//       capacity: 5000,
//       status: "ACTIVE",
//     });

//     // Create 10 sequential energy generation records every 2 hours
//     const records = [];
//     const baseDate = new Date("2025-09-21T00:00:00Z");
//     for (let i = 0; i < 10; i++) {
//       records.push({
//         solarUnitId: solarUnit._id,
//         timestamp: new Date(baseDate.getTime() + i * 2 * 60 * 60 * 1000), // every 2 hours
//         energyGenerated: 100 + i * 10, // e.g., 100, 110, ..., 190
//       });
//     }
//     await EnergyGenarationRecord.insertMany(records);

//     console.log("Database seeded successfully.");
//   } catch (err) {
//     console.error("Seeding error:", err);
//   } finally {
//     await mongoose.disconnect();
//   }
// }

// seed();

import mongoose from "mongoose";
import { SolarUnit } from "./entities/SolarUnit";
import { EnergyGenarationRecord } from "./entities/EnergyGenarationRecord";
import { User } from "./entities/User";
import dotenv from "dotenv";
import { connectDB } from "./db";

dotenv.config();

async function seed() {
  try {
    // Connect to DB
    await connectDB();

    // Clear existing data
    await EnergyGenarationRecord.deleteMany({});
    await SolarUnit.deleteMany({});
    await User.deleteMany({});

    // Create a new user
    const user = await User.create({
      name: "Alice Example",
      email: "alice@example.com",
    });

    // Create a new solar unit linked to the user
    const solarUnit = await SolarUnit.create({
      userId: user._id,
      serialNumber: "SU-0001",
      installationDate: new Date("2025-10-05"),
      capacity: 5000,
      status: "ACTIVE",
    });

    //
    // Create 10 sequential energy generation records every 2 hours
    //   const records = [];
    //   const baseDate = new Date("2025-10-05T00:00:00Z");
    //   for (let i = 0; i < 10; i++) {
    //     records.push({
    //       solarUnitId: solarUnit._id,
    //       timestamp: new Date(baseDate.getTime() + i * 2 * 60 * 60 * 1000), // every 2 hours
    //       energyGenerated: 100 + i * 10, // e.g., 100, 110, ..., 190
    //     });
    //   }
    //   await EnergyGenarationRecord.insertMany(records);

    //   console.log("Database seeded successfully.");
    // } catch (err) {
    //   console.error("Seeding error:", err);
    // } finally {
    //   await mongoose.disconnect();

    //______Adding new part(seasonal variation Add in to the seed) in session 11__________
    // Create historical energy generation records from Aug 1, 2025 8pm to Oct 12, 2025 8am every 2 hours
    const records = [];
    const startDate = new Date("2025-11-01T08:00:00Z"); // August 1, 2025 8am UTC
    const endDate = new Date("2025-12-22T08:00:00Z"); // Desember 22, 2025 8am UTC

    let currentDate = new Date(startDate);
    let recordCount = 0;

    while (currentDate <= endDate) {
      // Generate realistic energy values based on time of day and season
      const hour = currentDate.getUTCHours();
      const month = currentDate.getUTCMonth(); // 0-11

      // Base energy generation (higher in summer months)
      let baseEnergy = 200;
      if (month >= 5 && month <= 7) {
        // June-August (summer)
        baseEnergy = 300;
      } else if (month >= 2 && month <= 4) {
        // March-May (spring)
        baseEnergy = 250;
      } else if (month >= 8 && month <= 10) {
        // September-November (fall)
        baseEnergy = 200;
      } else {
        // December-February (winter)
        baseEnergy = 150;
      }

      // Adjust based on time of day (solar panels generate more during daylight)
      let timeMultiplier = 1;
      if (hour >= 6 && hour <= 18) {
        // Daylight hours
        timeMultiplier = 1.2;
        if (hour >= 10 && hour <= 14) {
          // Peak sun hours
          timeMultiplier = 1.5;
        }
      } else {
        // Night hours
        timeMultiplier = 0; // Minimal generation at night
      }

      // Add some random variation (±20%)
      const variation = 0.8 + Math.random() * 0.4;
      const energyGenerated = Math.round(
        baseEnergy * timeMultiplier * variation
      );

      records.push({
        solarUnitId: solarUnit._id,
        timeStamp: new Date(currentDate),
        energyGenerated: energyGenerated,
      });

      // Move to next 2-hour interval
      currentDate = new Date(currentDate.getTime() + 2 * 60 * 60 * 1000);
      recordCount++;
    }
    await EnergyGenarationRecord.insertMany(records);

    console.log(
      `Database seeded successfully. Generated ${recordCount} energy generation records from August 1, 2025 8am to December 22, 2025 8am.`
    );
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
  }
  // }
}

seed();
