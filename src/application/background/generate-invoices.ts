import { SolarUnit } from "../../infrastructure/entities/SolarUnit";
import { Invoice } from "../../infrastructure/entities/Invoice";
import { EnergyGenarationRecord } from "../../infrastructure/entities/EnergyGenarationRecord";

/**
 * Monthly Invoice Generation Service
 * Purpose: Automatically calculates energy production for the billing cycle
 * and creates pending invoices for each solar unit.
 */

export const generateInvoices = async () => {
  console.log("--- Starting Monthly Invoice Generation ---");

  // 1. Get all active solar units
  const units = await SolarUnit.find({ status: "ACTIVE" });

  for (const unit of units) {
    try {
      // 2. Find where to start billing from
      const lastInvoice = await Invoice.findOne({ solarUnitId: unit._id })
        .sort({ billingPeriodEnd: -1 });

      const billingStart = lastInvoice
        ? lastInvoice.billingPeriodEnd   // continue from last invoice
        : unit.installationDate;         // first invoice: start from install date

      // 3. Calculate the 30-day billing window
      const billingEnd = new Date(billingStart);
      billingEnd.setDate(billingEnd.getDate() + 30);

      // 4. Don't bill if the period hasn't ended yet(30-day period)
      if (billingEnd > new Date()) {
        console.log(`[Billing] Skipping ${unit.serialNumber}: period not reached yet.`);
        continue;
      }

      // 5. Sum all kWh readings from this window (MongoDB aggregation)
      const energyAggregation = await EnergyGenarationRecord.aggregate([
        {
          $match: {
            solarUnitId: unit._id,
            timeStamp: { $gte: billingStart, $lt: billingEnd }
          }
        },
        {
          $group: {
            _id: null,
            totalKWh: { $sum: "$energyGenerated" }
          }
        }
      ]);

      const totalKWh = energyAggregation.length > 0 ? energyAggregation[0].totalKWh : 0;

      // 6. Save the invoice (PENDING, no dollar amount — Stripe handles that)
      await Invoice.create({
        solarUnitId: unit._id,
        userId: unit.userId,
        billingPeriodStart: billingStart,
        billingPeriodEnd: billingEnd,
        totalEnergyGenerated: totalKWh,
        paymentStatus: "PENDING"
      });

      console.log(`[Billing] Created invoice for ${unit.serialNumber}: ${totalKWh.toFixed(2)} kWh`);

    } catch (error) {
      console.error(`[Billing Error] Failed for ${unit.serialNumber}:`, error);
    }
  }

  console.log("--- Invoice Generation Complete ---");
};
