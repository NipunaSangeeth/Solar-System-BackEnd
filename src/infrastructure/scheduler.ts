import cron from "node-cron";
import { syncEnergyGenerationRecords } from "../application/background/sync-energy-generation-records";
import { generateInvoices } from "../application/background/generate-invoices";

/**
 * Initializes and starts all automated background cron jobs.
 * Offers configuration via environment variables for dynamic scheduling.
 */
export const initializeScheduler = () => {
  // Run daily at 00:00 (midnight) - cron expression: '0 0 * * *'
  const schedule = process.env.SYNC_CRON_SCHEDULE || "0 0 * * *";

  cron.schedule(schedule, async () => {
    console.log(
      `[${new Date().toISOString()}] Starting daily energy generation records sync...`,
    );
    try {
      await syncEnergyGenerationRecords();
      console.log(
        `[${new Date().toISOString()}] Daily sync completed successfully`,
      );
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Daily sync failed:`, error);
    }
  });

  console.log(
    `[Scheduler] Energy generation records sync scheduled for: ${schedule}`,
  );
};

  // Run monthly invoice generation — at midnight on day 1 of each month
  const billingSchedule = process.env.BILLING_CRON_SCHEDULE || "0 0 1 * *";

  cron.schedule(billingSchedule, async () => {
    console.log(`[${new Date().toISOString()}] Starting monthly billing generation...`);
    try {
      await generateInvoices();
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Billing failed:`, error);
    }
  });

  console.log(`[Scheduler] Monthly billing generation scheduled for: ${billingSchedule}`);

