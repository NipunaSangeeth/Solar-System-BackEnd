import express from "express";
import { createSolarUnit, createSolarUnitValidator, deleteSolarUnit, getAllSolarUnits, getSolarUnitById, updateSolarUnit } from "../application/solar-unit";

const solarUnitRouter = express.Router();

solarUnitRouter.route("/").get(getAllSolarUnits).post(createSolarUnitValidator,createSolarUnit)
solarUnitRouter
  .route("/:id")
  .get(getSolarUnitById)
  .put(updateSolarUnit)
  .delete(deleteSolarUnit);



export default solarUnitRouter;
