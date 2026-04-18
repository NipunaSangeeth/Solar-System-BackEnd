import { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { Invoice } from "../infrastructure/entities/Invoice";
import { User } from "../infrastructure/entities/User";
import { NotFoundError, UnauthorizedError } from "../domain/error/errors";

// GET /api/invoices — Get all invoices for the logged-in user
export const getInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    const user = await User.findOne({ clerkUserId: auth.userId });
    if (!user) throw new NotFoundError("User not found");

    const { status } = req.query;
    const filter: any = { userId: user._id };
    if (status) filter.paymentStatus = status;

    const invoices = await Invoice.find(filter)
      .populate("solarUnitId")
      .sort({ createdAt: -1 });

    res.status(200).json(invoices);
  } catch (error) {
    next(error);
  }
};

// GET /api/invoices/:id — Get one specific invoice
export const getInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id?.trim();

    const auth = getAuth(req);
    const user = await User.findOne({ clerkUserId: auth.userId });
    if (!user) throw new NotFoundError("User not found");

    const invoice = await Invoice.findById(id).populate("solarUnitId");
    if (!invoice) throw new NotFoundError("Invoice not found");

    // Security: user can only see their own invoice (Verify ownership)
    if (invoice.userId.toString() !== user._id.toString()) {
      throw new UnauthorizedError("You do not have access to this invoice");
    }

    res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: getAllInvoices (Admin Only)
 * Purpose: Retrieves all invoices in the system for admin oversight.
 */
export const getAllInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.paymentStatus = status;

    const invoices = await Invoice.find(filter)
      .populate("userId", "firstName lastName")
      .populate("solarUnitId", "serialNumber")
      .sort({ createdAt: -1 });

    res.status(200).json(invoices);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: getInvoiceBySessionId
 * Purpose: Finds the invoice linked to a completed Stripe session.
 * Used by the payment complete page to fetch invoice data for PDF generation.
 */
export const getInvoiceBySessionId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;

    const invoice = await Invoice.findOne({ stripeSessionId: sessionId }).populate("solarUnitId");
    if (!invoice) throw new NotFoundError("Invoice not found for this session");

    res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
};