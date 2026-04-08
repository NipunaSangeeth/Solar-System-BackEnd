import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { EnergyGenarationRecord } from "../infrastructure/entities/EnergyGenarationRecord";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { ValidationError } from "../domain/error/errors";

/**
 * Controller: getSolarAnalytics
 * Purpose: Aggregates solar data to provide efficiency and financial insights.
 */
export const getSolarAnalytics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params; // Get the Solar Unit ID from the route path
    const PRICE_PER_UNIT = 37.00; // Hardcoded energy rate (LKR per Unit) for calculation

    // Step 1: Find the specific Solar Unit to get its technical metadata
    const solarUnit = await SolarUnit.findById(id);
    if (!solarUnit) {
      throw new ValidationError("Solar unit not found"); 
    }

    // Capture the rated capacity (e.g., 5kW or 10kW) for efficiency math
    const ratedCapacityKW = solarUnit.capacity;

    // Step 2: Adaptive Time-Sync logic
    // We check the database for the MOST RECENT record to ensure the dashboard has data
    // even if the simulator hasn't run in a few days.
    const latestRecord = await EnergyGenarationRecord.findOne({ solarUnitId: solarUnit._id }).sort({ timeStamp: -1 });
    const lastTimestamp = latestRecord ? latestRecord.timeStamp : new Date();

    // Fetch the last 24 hours of data relative to that most recent record for the current gauge
    const last24hRecords = await EnergyGenarationRecord.find({
      solarUnitId: solarUnit._id,
      timeStamp: { $gte: new Date(lastTimestamp.getTime() - 24 * 60 * 60 * 1000) }
    }).sort({ timeStamp: -1 });

    // Step 3: Calculate Current Capacity Factor %
    const recentRecords = last24hRecords.slice(0, 3); // Take the 3 most recent points
    let currentCapacityFactor = 0;
    if (recentRecords.length > 0) {
      const totalGenerated = recentRecords.reduce((sum, r) => sum + r.energyGenerated, 0); // Total kWh produced
      const totalInterval = recentRecords.reduce((sum, r) => sum + (r.intervalHours || 2), 0); // Total hours passed
      const maxPossible = ratedCapacityKW * totalInterval; // Theoretical max generation
      currentCapacityFactor = (totalGenerated / maxPossible) * 100; // Percentage of efficiency
    }

    // Step 4: MongoDB Aggregation for the 7-Day Performance History
    const stats7Days = await EnergyGenarationRecord.aggregate([
      {
        $match: {
          solarUnitId: new mongoose.Types.ObjectId(id) // Match only records for THIS solar unit
        }
      },
      {
        $group: {
          // Group records by their YYYY-MM-DD date string
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timeStamp" } },
          dailyEnergy: { $sum: "$energyGenerated" }, // Sum up all energy for that day
          totalIntervalHours: { $sum: "$intervalHours" } // Sum total reporting hours
        }
      },
      { $sort: { "_id": -1 } }, // Sort desending to get newest first
      { $limit: 7 },           // Take only the last 7 production days
      { $sort: { "_id": 1 } }  // Sort back to ascending for horizontal chart display
    ]);

    // Step 5: Simulation Mapping (Converting raw energy into Financials)
    const dailyAnalytics = stats7Days.map(day => {
      const totalGenerated = day.dailyEnergy;
      
      // We simulate a 60/40 Split between Home vs Grid export
      const homeUsage = totalGenerated * 0.6; // 60% consumed at home
      const gridExport = totalGenerated * 0.4; // 40% sent back to the grid
      
      // Calculate monetary value based on the PRICE_PER_UNIT
      const savings = homeUsage * PRICE_PER_UNIT; 
      const earnings = gridExport * PRICE_PER_UNIT;
      
      // Simulate Government Unit Take (5% tax/donation model)
      const govtTakeUnits = totalGenerated * 0.05;

      // Calculate efficiency percentage for that specific day
      const maxPossible = ratedCapacityKW * day.totalIntervalHours;
      const capacityFactor = (totalGenerated / maxPossible) * 100;

      return {
        date: day._id,
        totalGenerated: Number(totalGenerated.toFixed(2)),
        homeUsage: Number(homeUsage.toFixed(2)),
        gridExport: Number(gridExport.toFixed(2)),
        savings: Number(savings.toFixed(2)),
        earnings: Number(earnings.toFixed(2)),
        govtTakeUnits: Number(govtTakeUnits.toFixed(2)),
        efficiency: Number(capacityFactor.toFixed(1))
      };
    });

    // Step 6: Accumulate Grand Totals for the Pie Chart
    const overallTotals = dailyAnalytics.reduce((acc, curr) => ({
      homeUsage: acc.homeUsage + curr.homeUsage,
      gridExport: acc.gridExport + curr.gridExport,
      savings: acc.savings + curr.savings,
      earnings: acc.earnings + curr.earnings,
      govtTakeUnits: acc.govtTakeUnits + curr.govtTakeUnits
    }), { homeUsage: 0, gridExport: 0, savings: 0, earnings: 0, govtTakeUnits: 0 });

    // Send final structured JSON to the frontend
    res.status(200).json({
      summary: {
        currentEfficiency: Number(currentCapacityFactor.toFixed(1)),
        pricePerUnit: PRICE_PER_UNIT,
        currency: "LKR",
        totals: overallTotals
      },
      daily: dailyAnalytics
    });

  } catch (error) {
    next(error); // Pass error to global error handler middleware
  }
};
