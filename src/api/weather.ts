import express from "express";
import { getWeatherData } from "../application/weather";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const weatherRouter = express.Router();

// GET /api/weather?lat=6.9271&lng=79.8612
weatherRouter.route("/").get(authenticationMiddleware, getWeatherData);

export default weatherRouter;
