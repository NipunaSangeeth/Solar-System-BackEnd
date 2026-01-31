import express from "express";
import { getallEnergyGenerationRecordBySolarUnitId } from "../application/energy-generation-record";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const energyGenerationRecordRouter = express.Router();

energyGenerationRecordRouter
  .route("/solar-unit/:id")
  .get(authenticationMiddleware,getallEnergyGenerationRecordBySolarUnitId)


export default energyGenerationRecordRouter;
