import express from "express";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";
import { getSolarAnalytics } from "../application/analytics";

// Initialize the Express Router for Analytics
const router = express.Router();

/**
 * Endpoint: GET /api/analytics/:id
 * Description: Fetches analytical data and financial estimates for a specific solar unit.
 * ID: The MongoDB _id of the SolarUnit.
 * Middlewares: 
 *  1. authenticationMiddleware: Ensures the user is logged into Clerk before proceeding.
 */
router.get("/:id", authenticationMiddleware, getSolarAnalytics);

export default router;
