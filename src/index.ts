import "dotenv/config";
import express from "express";
import solarUnitRouter from "./api/solar-unit";
import { connectDB } from "./infrastructure/db";
import energyGenerationRecordRouter from "./api/energy-generation-record";
import { loggerMiddleware } from "./api/middlewares/logger-middleware";
import { globalErrorHandler } from "./api/middlewares/global-error-handling-middleware";
import cors from "cors";

const server = express();
server.use(express.json());
// CORS Rule (POST configure)
server.use(cors({origin:"http://localhost:5173"}))

server.use(loggerMiddleware);

server.use("/api/solar-units", solarUnitRouter);
server.use("/api/energy-generation-records", energyGenerationRecordRouter);

server.use(globalErrorHandler);

connectDB();

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/* Identify the resources
Solar Unit
Energy Generation Record
User
House
*/
