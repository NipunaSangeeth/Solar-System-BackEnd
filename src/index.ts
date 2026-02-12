import "dotenv/config";
import express from "express";
import solarUnitRouter from "./api/solar-unit";
import { connectDB } from "./infrastructure/db";
import energyGenerationRecordRouter from "./api/energy-generation-record";
import { loggerMiddleware } from "./api/middlewares/logger-middleware";
import { globalErrorHandler } from "./api/middlewares/global-error-handling-middleware";
import cors from "cors";
import webhooksRouter from "./api/webhooks";
import { clerkMiddleware } from "@clerk/express";
import usersRouter from "./api/users";

const server = express();
// CORS Rule (POST configure)
server.use(cors({ origin: "http://localhost:5173" }));

server.use(loggerMiddleware);

server.use("/api/webhooks", webhooksRouter);
server.use(clerkMiddleware())
server.use(express.json());

server.use("/api/solar-units", solarUnitRouter);
server.use("/api/energy-generation-records", energyGenerationRecordRouter);
server.use("/api/users", usersRouter);


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
