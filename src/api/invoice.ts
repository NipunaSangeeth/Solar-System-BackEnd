import express from "express";
import { getInvoices, getInvoiceById } from "../application/invoice";
import { authenticationMiddleware } from "./middlewares/authentication-middleware";

const router = express.Router();

router.get("/", authenticationMiddleware, getInvoices);
router.get("/:id", authenticationMiddleware, getInvoiceById);

export default router;
