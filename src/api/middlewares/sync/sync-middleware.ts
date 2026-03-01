import { getAuth } from "@clerk/express";
import { NextFunction, Request, Response } from "express";
import { NotFoundError } from "../../../domain/error/errors";
import { User } from "../../../infrastructure/entities/User";
import { SolarUnit } from "../../../infrastructure/entities/SolarUnit";
import { EnergyGenarationRecord } from "../../../infrastructure/entities/EnergyGenarationRecord";
import z from "zod";
import { timeStamp } from "node:console";



export const DataAPIEnergyGenerationRecordDto = z.object({
    _id: z.string(),
    serialNumber: z.string(),
    energyGenerated: z.number(),
    timeStamp: z.string(),
    intervalHours: z.number(),
    __v: z.number(),
});


export const syncMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
    // try{}catch(error){}
    const auth = getAuth(req)
    const user  = await User.findOne({clerkUserId:auth.userId})
    if (!user){
        throw new NotFoundError("User Not found")
    }

    const solarUnit = await SolarUnit.findOne({userId: user._id})
    if(!solarUnit){
        throw new NotFoundError("Solar Unit Not found")
    }

    // call the SolarUnit Data services to the Fecth he Missing data 
    const dataAPIResponse = await fetch(`http://localhost:8001/api/energy-generation-records/solar-unit/${solarUnit.serialNumber}`) 
    if(!dataAPIResponse.ok){
        throw new Error("Faild to fetch Energy generation records")
    }

    const latestEnergyGenerationRecords = DataAPIEnergyGenerationRecordDto.array().parse(await dataAPIResponse.json())
    console.log(latestEnergyGenerationRecords)

     const existingEnergyGenerationRecords = await EnergyGenarationRecord.find({serialNumber:solarUnit.serialNumber}).sort({timeStamp:1})

    const missingEnergyGenerationRecords =  latestEnergyGenerationRecords.filter((record:any)=>!existingEnergyGenerationRecords.some((existingRecord:any)=>existingRecord.timeStamp === record.timeStamp))
    console.log(missingEnergyGenerationRecords)

    await EnergyGenarationRecord.insertMany(missingEnergyGenerationRecords)

    next()


}

