// import { CreateSolarUnitDto } from "../domain/dtos/solar-unit";
// import { SolarUnit } from "../infrastructure/entities/SolarUnit";
// import { Request, Response } from "express";

// export const getAllSolarUnits = async (req: Request, res: Response) => {
//   try {
//     const solarUnits = await SolarUnit.find();
//     res.status(200).json(solarUnits);
//   } catch (error) {
//     res.status(500).json({ message: "Internal Server Error 🤔.." });
//   }
// };

// export const createSolarUnit = async (req: Request, res: Response) => {
//   try {
//     //const { serialNumber, installationDate, capacity, status } = req.body;
//     const result = CreateSolarUnitDto.safeParse(req.body);
//     if(!result.success){
//       return res.status(400).json({message:result.error.message})
//     }

//     const newSolarUnit = {
//       serialNumber:result.data.serialNumber,
//       installationDate:new Date(result.data.installationDate),
//       capacity:result.data.capacity,
//       status:result.data.status,
//       userId:result.data.userId,
//     };

//     const creaetedSolarUnit = await SolarUnit.create(newSolarUnit);
//     res.status(201).json(creaetedSolarUnit);
//   } catch (error) {
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const getSolarUnitById = async (req: Request, res: Response) => {
//   // params is assign to the id (/#api/#so-un/#assign to ID(id))
//   try {
//     const { id } = req.params;
//     const solarUnit = await SolarUnit.findById(id);

//     if (!solarUnit) {
//       return res.status(404).json({ message: "Solar unit not found" });
//     }
//     res.status(200).json(solarUnit);
//   } catch (error) {
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

// export const updateSolarUnit = async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const { serialNumber, installationDate, capacity, status } = req.body;
//   const solarUnit = await SolarUnit.findById(id);

//   if (!solarUnit) {
//     return res.status(404).json({ message: "Solar unit not found" });
//   }

//   const updatedSolarUnit = await SolarUnit.findByIdAndUpdate(id, {
//     serialNumber,
//     installationDate,
//     capacity,
//     status,
//   });

//   res.status(200).json(updatedSolarUnit);
// };

// export const deleteSolarUnit = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const solarUnit = await SolarUnit.findById(id);

//     if (!solarUnit) {
//       return res.status(404).json({ message: "Solar unit not found" });
//     }

//     await SolarUnit.findByIdAndDelete(id);
//     res.status(204).send();
//   } catch (error) {
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

import { z } from "zod";
import { CreateSolarUnitDto } from "../domain/dtos/solar-unit";
import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { NextFunction, Request, Response } from "express";
import { NotFoundError, ValidationError } from "../domain/error/errors";

export const getAllSolarUnits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const solarUnits = await SolarUnit.find();
    res.status(200).json(solarUnits);
  } catch (error) {
    next(error);
  }
};

export const createSolarUnitValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = CreateSolarUnitDto.safeParse(req.body);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

export const createSolarUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const data: z.infer<typeof CreateSolarUnitDto> = req.body;

    const newSolarUnit = {
      serialNumber: data.serialNumber,
      installationDate: new Date(data.installationDate),
      capacity: data.capacity,
      status: data.status,
      userId: data.userId,
    };

    const createdSolarUnit = await SolarUnit.create(newSolarUnit);
    res.status(201).json(createdSolarUnit);
  } catch (error) {
    next(error);
  }
};

export const getSolarUnitById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const solarUnit = await SolarUnit.findById(id);

    if (!solarUnit) {
      throw new NotFoundError("Solar unit not found");
    }
    res.status(200).json(solarUnit);
  } catch (error) {
    next(error);
  }
};

export const updateSolarUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { serialNumber, installationDate, capacity, status } = req.body;
  const solarUnit = await SolarUnit.findById(id);

  if (!solarUnit) {
    throw new NotFoundError("Solar unit not found");
  }

  const updatedSolarUnit = await SolarUnit.findByIdAndUpdate(id, {
    serialNumber,
    installationDate,
    capacity,
    status,
  });

  res.status(200).json(updatedSolarUnit);
};

export const deleteSolarUnit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const solarUnit = await SolarUnit.findById(id);

    if (!solarUnit) {
      throw new NotFoundError("Solar unit not found");
    }

    await SolarUnit.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
