import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../../../domain/error/errors";
import { User } from "../../../infrastructure/entities/User";
import { SolarUnit } from "../../../infrastructure/entities/SolarUnit";
import { EnergyGenarationRecord } from "../../../infrastructure/entities/EnergyGenarationRecord";
import z from "zod";
import { Console } from "console";

// Zod schema matching Data API response structures
export const DataAPIEnergyGenerationRecordDto = z.object({
  _id: z.string(),
  serialNumber: z.string(),
  energyGenerated: z.number(),
  timeStamp: z.string(), // CamelCase 'T'
  intervalHours: z.number(),
  __v: z.number(),
});

export const syncMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 1. Clerk Authentication checks
    const auth = getAuth(req);
    const user = await User.findOne({ clerkUserId: auth.userId });
    if (!user) throw new NotFoundError("User not found");

    // 2. Match logged-in user to their solar asset
    const solarUnit = await SolarUnit.findOne({ userId: user._id });
    if (!solarUnit) throw new NotFoundError("Solar unit not found");

    // 3. Fetch latest raw streams from raw sensor data hardware simulator (Data-API)
    // fetch the Lates data 
    const dataAPIResponse = await fetch(
      `http://localhost:8001/api/energy-generation-records/solar-unit/${solarUnit.serialNumber}`,
    );
    if (!dataAPIResponse.ok)
      throw new Error("Failed to fetch records from Data API");

    const latestEnergyGenerationRecords =
      DataAPIEnergyGenerationRecordDto.array().parse(
        await dataAPIResponse.json(),
      );

    // 4. Look up last synced point on DB (sorting by timeStamp descending)
    const lastSyncedRecord = await EnergyGenarationRecord.findOne({
      solarUnitId: solarUnit._id,
    }).sort({ timeStamp: -1 });

    // 5. Filter for absolute newcomers (Incoming timestamp > Database timestamp)
    // determine which records are new

    const newRecords = latestEnergyGenerationRecords.filter((ApiRecord) => {
      if (!lastSyncedRecord) return true; // Synching for the very first time
      return new Date(ApiRecord.timeStamp) > lastSyncedRecord.timeStamp;
    });

    // 6. Map filter nodes back into local document structure streams
    if (newRecords.length > 0) {
     // Transform API records to match schema

      const recordsToInsert = newRecords.map((r) => ({
        solarUnitId: solarUnit._id,
        energyGenerated: r.energyGenerated,
        timeStamp: new Date(r.timeStamp), // Parse safe stream output
        intervalHours: r.intervalHours,
      }));

      // 7. Fire insert streaming directly into Mongo indexes
      await EnergyGenarationRecord.insertMany(recordsToInsert);
      console.log(
        `Synced ${recordsToInsert.length} new records for solar units.`,
      );
    } else{
      console.log("No new Record to sync")
    }

    next(); // Pass to controller endpoint
  } catch (error) {
    console.error("Sync middleware Error",error)
    next(error);
  }
};
