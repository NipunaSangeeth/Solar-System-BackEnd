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
    const results = GetAllEnergyGenerationRecordsQueryDto.safeParse(req.query);
    if (!results.success) {
      throw new ValidationError(results.error.message);
    }

    const { groupBy, limit } = req.query;

    if (!groupBy) {
      const energyGenerationRecords = await EnergyGenarationRecord.find({
        solarUnitId: id,
      }).sort({ timestamp: -1 }); //sort({ timestamp: -1 }) CAN cretae the data Assending or desending ORETR
      res.status(200).json(energyGenerationRecords);
    }

    if (!limit) {
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
      res.status(200).json(energyGenarationRecords)
      return
    }

    if (groupBy === "date") {
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
        // {
        //   $sort: { "_id.date": -1 },
        //   $limit: parseInt(limit as string),
        // },
        {
          $sort: { "_id.date": -1 },
        },
        {
          $limit: parseInt(limit as string),
        },
      ]);
      // if (!limit) {
      //   res.status(200).json(energyGenarationRecords.slice);
      //   return;
      // }
      // res.status(200).json(energyGenarationRecords.slice(0, parseInt(limit as string)));
      res
        .status(200)
        .json(energyGenarationRecords);
    }
  } catch (error) {
    next(error);
    // res.status(500).json({ message: "Internal Server Error 🤔.." });
  }
};
