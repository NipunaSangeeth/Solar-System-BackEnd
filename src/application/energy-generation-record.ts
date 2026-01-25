// import { NextFunction, Request, Response } from "express";
// import { EnergyGenarationRecord } from "../infrastructure/entities/EnergyGenarationRecord";
// import { GetAllEnergyGenerationRecordsQueryDto } from "../domain/dtos/solar-unit";
// import { ValidationError } from "../domain/error/errors";

// export const getallEnergyGenerationRecordBySolarUnitId = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     // Aggregration Pipeline Used(Some Cool stuf In mongo can manage the data profetional way)
//     const { id } = req.params;
//     const results = GetAllEnergyGenerationRecordsQueryDto.safeParse(req.query);
//     if (!results.success) {
//       throw new ValidationError(results.error.message);
//     }

//     const { groupBy, limit } = results.data;

//     if (!groupBy) {
//       const energyGenerationRecords = await EnergyGenarationRecord.find({
//         solarUnitId: id,
//       }).sort({ timestamp: -1 }); //sort({ timestamp: -1 }) CAN cretae the data Assending or desending ORETR
//       res.status(200).json(energyGenerationRecords);
//     }

//     if (!limit) {
//       const energyGenarationRecords = await EnergyGenarationRecord.aggregate([
//         {
//           $group: {
//             _id: {
//               date: {
//                 $dateToString: { format: "%Y-%m-%d", date: "$timeStamp" },
//               },
//             },
//             totalEnergy: { $sum: "$energyGenerated" },
//           },
//         },
//         {
//           $sort: { "_id.date": -1 },
//         },
//       ]);
//       res.status(200).json(energyGenarationRecords);
//       return;
//     }

//     if (groupBy === "date") {
//       const energyGenarationRecords = await EnergyGenarationRecord.aggregate([
//         {
//           $group: {
//             _id: {
//               date: {
//                 $dateToString: { format: "%Y-%m-%d", date: "$timeStamp" },
//               },
//             },
//             totalEnergy: { $sum: "$energyGenerated" },
//           },
//         },

//         {
//           $sort: { "_id.date": -1 },
//         },
//         {
//           $limit: parseInt(limit as string),
//         },
//       ]);

//       res
//         .status(200)
//         .json(energyGenarationRecords.slice(0, parseInt(limit as string)));

//     }
//   } catch (error) {
//     next(error);
//     res.status(500).json({ message: "Internal Server Error 🤔.." });
//   }
// };


import { NextFunction, Request, Response } from "express";
import { EnergyGenarationRecord } from "../infrastructure/entities/EnergyGenarationRecord";
import { GetAllEnergyGenerationRecordsQueryDto } from "../domain/dtos/solar-unit";
import { ValidationError } from "../domain/error/errors";

export const getallEnergyGenerationRecordBySolarUnitId = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Aggregration Pipeline Used(Some Cool stuf In mongo can manage the data profetional way)
    const { id } = req.params;
    // Validate the query parameters using the DTO
    const results = GetAllEnergyGenerationRecordsQueryDto.safeParse(req.query);
    
    // Check if validation failed
    if (!results.success) {
      // If failed, throw a custom validation error
      throw new ValidationError(results.error.message);
    }

    // Destructure validated data
    const { groupBy, limit } = results.data;

    // Case 1: No GroupBy provided (Fetch raw data)
    if (!groupBy) {
      // Find records by solar unit ID
      const energyGenerationRecords = await EnergyGenarationRecord.find({
        solarUnitId: id,
      }).sort({ timestamp: -1 }); // sort({ timestamp: -1 }) CAN cretae the data Assending or desending ORETR
      
      // Send response
      res.status(200).json(energyGenerationRecords);
      // [SENIOR FIX] Add return to stop execution here, preventing "Headers already sent" error
      return; 
    }

    // [SENIOR FIX] Handle "undefined" string explicitly. Frontend might send limit='undefined' string.
    // We check if limit is missing OR if it equals the string "undefined"
    if (!limit || limit === "undefined") {
      // Run aggregation without limiting
      const energyGenarationRecords = await EnergyGenarationRecord.aggregate([
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$timeStamp" },
              },
            },
            totalEnergy: { $sum: "$energyGenerated" },
          },
        },
        {
          $sort: { "_id.date": -1 },
        },
      ]);
      
      // Send response
      res.status(200).json(energyGenarationRecords);
      // [SENIOR FIX] Add return to stop execution
      return;
    }

    // Case 3: GroupBy is "date" AND we have a valid limit
    if (groupBy === "date") {
      // [SENIOR FIX] Parse the limit safely. We know it's not "undefined" here due to check above.
      const parsedLimit = parseInt(limit as string);

      const energyGenarationRecords = await EnergyGenarationRecord.aggregate([
        {
          $group: {
            _id: {
              date: {
                $dateToString: { format: "%Y-%m-%d", date: "$timeStamp" },
              },
            },
            totalEnergy: { $sum: "$energyGenerated" },
          },
        },

        {
          $sort: { "_id.date": -1 },
        },
        {
          // [SENIOR FIX] Use the parsed integer. MongoDB requires an Integer, not NaN.
          $limit: parsedLimit,
        },
      ]);

      // Send the aggregated data
      // No need to slice again because MongoDB already did the work with $limit
      res
        .status(200)
        .json(energyGenarationRecords);
    }
  } catch (error) {
    // Pass error to global error handler
    next(error);
    // [SENIOR FIX] Removed res.status(500)... because next(error) already handles the response.
    // calling res.json after next() causes the "Headers already sent" error.
  }
};
