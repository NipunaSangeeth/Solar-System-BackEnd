import express from "express";
import {
  createSolarUnit,
  createSolarUnitValidator,
  deleteSolarUnit,
  getAllSolarUnits,

  getSolarUnitById,
  getSolarUnitForUser,
  updateSolarUnit,
} from "../application/solar-unit";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const solarUnitRouter = express.Router();
// didn't put the parameters same levels

solarUnitRouter
  .route("/")
  .get(getAllSolarUnits)
  .post(createSolarUnitValidator, createSolarUnit);
 solarUnitRouter
  .route("/me")
  .get(authenticationMiddleware, getSolarUnitForUser); 
solarUnitRouter
  .route("/:id")
  .get(getSolarUnitById)
  .put(updateSolarUnit)
  .delete(deleteSolarUnit);


export default solarUnitRouter;
