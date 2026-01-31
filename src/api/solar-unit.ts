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
import { authorizationMiddleware } from "./middlewares/authorization-middleware";

const solarUnitRouter = express.Router();
// didn't put the parameters same levels

solarUnitRouter
  .route("/")
  .get(authenticationMiddleware, authorizationMiddleware, getAllSolarUnits)
  .post(
    authenticationMiddleware,
    authorizationMiddleware,
    createSolarUnitValidator,
    createSolarUnit,
  );
solarUnitRouter.route("/me").get(authenticationMiddleware, getSolarUnitForUser);
solarUnitRouter
  .route("/:id")
  .get(authenticationMiddleware, authorizationMiddleware, getSolarUnitById)
  .put(authenticationMiddleware, authorizationMiddleware, updateSolarUnit)
  .delete(authenticationMiddleware, authorizationMiddleware, deleteSolarUnit);

export default solarUnitRouter;
