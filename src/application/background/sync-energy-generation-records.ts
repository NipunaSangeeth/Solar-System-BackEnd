// Help to to the pulls data for everyone automatically. 
import { z } from "zod";
import { SolarUnit } from "../../infrastructure/entities/SolarUnit";
import { EnergyGenarationRecord } from "../../infrastructure/entities/EnergyGenarationRecord";

export const DataAPIEnergyGenerationRecordDto = z.object({
    _id: z.string(),
    serialNumber: z.string(),
    energyGenerated: z.number(),
    timeStamp: z.string(),
    intervalHours: z.number(),
    __v: z.number(),
});

/**
 * Synchronizes energy generation records from the data API
 * Fetches latest records and merges new data with existing records
 */
export const syncEnergyGenerationRecords = async () => {
    try {

        const solarUnits = await SolarUnit.find();

        for (const solarUnit of solarUnits) {

            // Get latest synced timestamp to only fetch new data
            const lastSyncedRecord = await EnergyGenarationRecord
                .findOne({ solarUnitId: solarUnit._id })
                .sort({ timestamp: -1 });

            // Build URL with sinceTimestamp query parameter
            const baseUrl = `http://localhost:8001/api/energy-generation-records/solar-unit/${solarUnit.serialNumber}`;
            const url = new URL(baseUrl);

            if (lastSyncedRecord?.timeStamp) {
                url.searchParams.append('sinceTimestamp', lastSyncedRecord.timeStamp.toISOString());
            }

            // Fetch latest records from data API with server-side filtering
            const dataAPIResponse = await fetch(url.toString());
            if (!dataAPIResponse.ok) {
                throw new Error("Failed to fetch energy generation records from data API");
            }

            const newRecords = DataAPIEnergyGenerationRecordDto
                .array()
                .parse(await dataAPIResponse.json());

            if (newRecords.length > 0) {
                // Transform API records to match schema
                const recordsToInsert = newRecords.map(record => ({
                    solarUnitId: solarUnit._id,
                    energyGenerated: record.energyGenerated,
                    timestamp: new Date(record.timeStamp),
                    intervalHours: record.intervalHours,
                }));

                await EnergyGenarationRecord.insertMany(recordsToInsert);
                console.log(`Synced ${recordsToInsert.length} new energy generation records`);
            }
            else {
                console.log("No new records to sync");
            }
        }
    } catch (error) {
        console.error("Sync Job error:", error);
    }
};