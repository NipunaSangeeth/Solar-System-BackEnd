import express from "express";
import { getInvoices, getInvoiceById, getInvoiceBySessionId } from "../application/invoice";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const router = express.Router();

router.get("/", authenticationMiddleware, getInvoices);
router.get("/by-session/:sessionId", authenticationMiddleware, getInvoiceBySessionId);
router.get("/:id", authenticationMiddleware, getInvoiceById);

export default router;
