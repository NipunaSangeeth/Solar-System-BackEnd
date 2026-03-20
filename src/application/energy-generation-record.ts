

import { NextFunction, Request, Response } from "express";
import { EnergyGenarationRecord } from "../infrastructure/entities/EnergyGenarationRecord";
import { GetAllEnergyGenerationRecordsQueryDto } from "../domain/dtos/solar-unit";
import { ValidationError } from "../domain/error/errors";
import mongoose from "mongoose"; // [FIX] Added to allow string ID casting into MongoDB ObjectId

export const getallEnergyGenerationRecordBySolarUnitId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Extract the string 'id' from the router parameters (e.g., solar unit ID)
    const { id } = req.params;

    // 2. Validate incoming query params (eg. groupBy, limit) using Zod DTO
    const results = GetAllEnergyGenerationRecordsQueryDto.safeParse(req.query);
    
    // 3. If validation fails, throw a custom ValidationError to allow the global handler to respond
    if (!results.success) {
      throw new ValidationError(results.error.message);
    }

    // 4. Destructure the safe parsed values
    const { groupBy, limit } = results.data;

    // --- CASE 1: No GroupBy provided (Fetch raw reading lists) ---
    if (!groupBy) {
      const energyGenerationRecords = await EnergyGenarationRecord.find({
        solarUnitId: id, // Normal Find handles string to ObjectId conversion automatically
      }).sort({ timeStamp: -1 }); // ⚠️ Used timeStamp (CamelCase) matching the schema
      
      res.status(200).json(energyGenerationRecords);
      return; // Stop execution early to prevent "Headers already sent" errors
    }

    // --- [SENIOR FIX] Safe Limit Protection ---
    // If the limit is missing ("undefined" string or NaN), default to a safe 7 days
    let parsedLimit = parseInt(limit as string);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      parsedLimit = 7; 
    }

    // --- CASE 2/3: GroupBy is "date" (Aggregate Totals) ---
    if (groupBy === "date") {
      const energyGenarationRecords = await EnergyGenarationRecord.aggregate([
        {
          $match: {
            // 🛑 CRITICAL MATCH FILTER: Forces MongoDB to only pull data for this unit ONLY.
            // Aggregations REQUIRE manual casting of string IDs into ObjectIds.
            solarUnitId: new mongoose.Types.ObjectId(id), 
          },
        },
        {
          $group: {
            // Group matching documents by the formatted Date string
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$timeStamp" },
              },
            },
            // Sum all energy generated values inside the grouping bucket
            totalEnergy: { $sum: "$energyGenerated" },
          },
        },
        {
          // Sort the buckets in descending date order (newest first)
          $sort: { "_id.date": -1 },
        },
        {
          // Limit the rows returned back directly on the database engine level (performance optimization)
          $limit: parsedLimit, 
        },
      ]);

      res.status(200).json(energyGenarationRecords);
      return;
    }

  } catch (error) {
    next(error); // Pass the error safely back into our global handler
  }
};
