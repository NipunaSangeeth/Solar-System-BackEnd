import express from "express";
import { getallEnergyGenerationRecordBySolarUnitId } from "../application/energy-generation-record";

const energyGenerationRecordRouter = express.Router();

energyGenerationRecordRouter
  .route("/solar-unit/:id")
  .get(getallEnergyGenerationRecordBySolarUnitId)


export default energyGenerationRecordRouter;
