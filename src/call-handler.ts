import Papa from "papaparse";
import { CallRecord, EnrichedCallRecord } from "./call-record.i";
import { InvalidRecord, ValidationResult } from "./types.i";
import { validateCallRecord } from "./utils/validation";
import { lookupOperator } from "./operator-lookup";
import { DatabaseManager } from "./db/dbManager";
type Response = {
  status: number;
  message?: string;
  error?: string;
};
export class CallHandler {
  private dbManager: DatabaseManager;

  constructor() {
    this.dbManager = new DatabaseManager();
  }
  /**
   * Handle a batch of call records
   *
   * @param payload The raw batch of CDRs in CSV format.
   */
  public async handleBatch(payload: string): Promise<Response> {
    console.log("payload", payload);
    const { data, errors } = Papa.parse(payload, { header: true });
    if (errors.length) {
      console.error("Parsing errors:", errors);
      return { status: 400, error: "There were parsing errors." };
    }
    // validate headers
    if (!this.checkHeaders(data[0])) {
      console.error("Invalid CSV headers:", data[0]);
      return { status: 400, error: "Invalid CSV headers." };
    }

    // validate each record, return only valid record
    const { validRecords, invalidRecords } = this.validateCsvBatch(data);
    const enrichedRecords = await this.enrichCallRecord(validRecords);
    await this.dbManager.connect();
    if (enrichedRecords.length > 0) {
      await this.dbManager.insertIntoCollection("collection1", enrichedRecords);
    }
    return { status: 200, message: "Batch processed successfully." };
  }
  private checkHeaders(record: unknown): boolean {
    const expectedHeaders = [
      "id",
      "callStartTime",
      "callEndTime",
      "callType",
      "fromNumber",
      "toNumber",
      "region",
    ];
    const actualHeaders = Object.keys(record as Record<string, unknown>);

    if (expectedHeaders.length !== actualHeaders.length) return false;

    const sortedExpected = expectedHeaders.sort();
    const sortedActual = actualHeaders.sort();
    return sortedExpected.every(
      (header, index) => header === sortedActual[index],
    );
  }

  private validateCsvBatch(data: unknown[]): ValidationResult {
    const invalidRecords: InvalidRecord[] = [];
    const validRecords: CallRecord[] = [];

    data.forEach((record: unknown) => {
      const validatedRecords = validateCallRecord(record as CallRecord);
      if (validatedRecords.isValid) {
        validRecords.push(record as CallRecord);
      } else {
        invalidRecords.push({
          record: record as CallRecord,
          error:
            validatedRecords.errors?.join(", ") || "Unknown validation error",
        });
        console.error(`Invalid record: ${JSON.stringify(record)}`);
      }
    });
    return { validRecords: validRecords, invalidRecords: invalidRecords };
  }

  private async enrichCallRecord(
    records: CallRecord[],
  ): Promise<EnrichedCallRecord[]> {
    const enrichedRecords = records.map(async (record) => {
      // Make calls to operator lookup service
      const fromNumberInfo = await lookupOperator(
        record.fromNumber,
        record.callStartTime.slice(2, 10),
      ).catch((error) => {
        console.error(error);
        return {
          operator: "",
          country: "",
          estimatedCostPerMinute: 0,
        };
      });

      const toNumberInfo = await lookupOperator(
        record.toNumber,
        record.callStartTime.slice(2, 10),
      ).catch((error) => {
        console.error(error);
        return { operator: "", country: "", estimatedCostPerMinute: 0 };
      });

      const duration =
        Math.floor(new Date(record.callEndTime).getTime() / 1000) -
        Math.floor(new Date(record.callStartTime).getTime() / 1000);

      // cost rounded to 2dp
      const estimatedCost =
        fromNumberInfo.estimatedCostPerMinute > 0
          ? Math.round(
              ((fromNumberInfo.estimatedCostPerMinute * duration) / 60) * 100,
            ) / 100
          : -1; // -1 indicates cost could not be estimated due to missing operator info

      return {
        ...record,
        fromOperator: fromNumberInfo.operator,
        fromCountry: fromNumberInfo.country,
        toOperator: toNumberInfo.operator,
        toCountry: toNumberInfo.country,
        duration: duration,
        estimatedCost: estimatedCost,
      };
    });

    const results = await Promise.allSettled(enrichedRecords);
    return results.reduce((acc, result) => {
      if (result.status === "fulfilled" && result.value !== undefined) {
        return [...acc, result.value];
      }
      return acc;
    }, [] as EnrichedCallRecord[]);
  }
}
