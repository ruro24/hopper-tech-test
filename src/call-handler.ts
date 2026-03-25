import Papa from "papaparse";
import { CallRecord, EnrichedCallRecord } from "./types/call-record.i";
import { InvalidRecord, ValidationResult } from "./types/types.i";
import { validateCallRecord } from "./utils/validation";
import { lookupOperator } from "./operator-lookup";
import { DatabaseManager } from "./db/dbManager";

type Response = {
  status: number;
  message?: string;
  error?: string;
};

export class CallHandler {
  private dbManager = new DatabaseManager();

  /**
   * FAST PATH — must respond within 500ms
   */
  public async handleBatch(payload: string): Promise<Response> {
    if (!payload || typeof payload !== "string" || payload.trim() === "") {
      return { status: 400, error: "Empty or invalid payload" };
    }
    const { data, errors } = Papa.parse(payload, { header: true });

    if (errors.length) {
      return {
        status: 400,
        error: `CSV parsing failed: ${errors.map((e) => e.message).join("; ")}`,
      };
    }

    if (
      !data.length ||
      !this.checkHeaders((data[0] as Record<string, string>) || null)
    ) {
      return { status: 400, error: "Invalid CSV headers" };
    }

    //these invalid records could be logged for later review
    const { validRecords, invalidRecords } = this.validateCsvBatch(
      data as CallRecord[],
    );

    if (!validRecords.length) {
      return { status: 400, error: "No valid records to process" };
    }

    // Here I call an async process, but this could be a call to a seperate service
    try {
      await this.enrichBatchAsync(validRecords as CallRecord[]);
      return {
        status: 200,
        message: `Batch processed: ${validRecords.length} valid records, ${invalidRecords.length} invalid records`,
      };
    } catch (err) {
      return {
        status: 500,
        error: `Something went wrong with the enrichment process: ${err}`,
      };
    }
  }

  /**
   * Enriches and persists valid cdr batches
   * @params cdrs - array of valid call records to enrich and persist
   * @returns void
   */
  private async enrichBatchAsync(cdrs: CallRecord[]): Promise<void> {
    try {
      const enrichedRecords = await this.enrichCallRecords(cdrs);

      if (enrichedRecords.length) {
        await this.dbManager.connect();
        await this.dbManager.insertIntoCollection(
          "collection1",
          enrichedRecords,
        );
      }
    } catch (err) {
      throw new Error(`Batch processing failed: ${err}`);
    }
  }

  /**
   * Checks if the CSV headers match the expected format.
   * @params record - the first line from
   */
  private checkHeaders(record: Record<string, string>): boolean {
    //could be passed in from environment instead of hardcoded
    const expectedHeaders = [
      "id",
      "callStartTime",
      "callEndTime",
      "callType",
      "fromNumber",
      "toNumber",
      "region",
    ];

    const actualHeaders = Object.keys(record as Record<string, string>);

    if (expectedHeaders.length !== actualHeaders.length) return false;

    return expectedHeaders
      .slice()
      .sort()
      .every((h, i) => h === actualHeaders.sort()[i]);
  }

  private validateCsvBatch(data: CallRecord[]): ValidationResult {
    const validRecords: CallRecord[] = [];
    const invalidRecords: InvalidRecord[] = [];

    for (const record of data) {
      const result = validateCallRecord(record as CallRecord);
      if (result.isValid) {
        validRecords.push(record as CallRecord);
      } else {
        invalidRecords.push({
          record: record as CallRecord,
          error: result.errors?.join(", ") ?? "Unknown validation error",
        });
      }
    }

    return { validRecords, invalidRecords };
  }

  /**
   * Enrich Call Records with operator info and estimated cost.
   * Will return enriched records for valid lookups, and fill missing info with defaults for failed lookups.
   */
  private async enrichCallRecords(
    records: CallRecord[],
  ): Promise<EnrichedCallRecord[]> {
    //process in parellel to reduce time
    const tasks = records.map(async (record) => {
      const date = record.callStartTime.slice(2, 10);
      //process in parellel to reduce time
      const [fromInfo, toInfo] = await Promise.allSettled([
        lookupOperator(record.fromNumber, date).catch(() => null),
        lookupOperator(record.toNumber, date).catch(() => null),
      ]);

      const duration =
        Math.floor(new Date(record.callEndTime).getTime() / 1000) -
        Math.floor(new Date(record.callStartTime).getTime() / 1000);

      const fullfilledFromInfo =
        fromInfo.status === "fulfilled" && fromInfo.value !== null;
      const fullfilledToInfo =
        toInfo.status === "fulfilled" && toInfo.value !== null;

      if (!fullfilledFromInfo || !fullfilledToInfo) {
        console.warn(
          `Operator lookup failed for record ${record.id}. fromInfo: ${fullfilledFromInfo ? "success" : "failed"}, toInfo: ${fullfilledToInfo ? "success" : "failed"}`,
        );
      }
      const estimatedCost =
        fullfilledFromInfo && fromInfo.value?.estimatedCostPerMinute
          ? Math.round(
              ((fromInfo.value.estimatedCostPerMinute * duration) / 60) * 100,
            ) / 100
          : null;

      return {
        ...record,
        fromOperator: fullfilledFromInfo ? fromInfo.value?.operator : "",
        fromCountry: fullfilledFromInfo ? fromInfo.value?.country : "",
        toOperator: fullfilledToInfo ? toInfo.value?.operator : "",
        toCountry: fullfilledToInfo ? toInfo.value?.country : "",
        duration,
        estimatedCost,
      };
    });

    const results = await Promise.allSettled(tasks);

    return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  }
}
