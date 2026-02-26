import Papa from "papaparse";
import { CallRecord } from "./call-record.i";
import { isValidCallRecord } from "./utils/validation";
import { InvalidRecord, ValidationResult } from "./types.i";
type Response = {
  ok: boolean;
  error?: string;
};
export class CallHandler {
  /**
   * Handle a batch of call records
   *
   * @param payload The raw batch of CDRs in CSV format.
   */
  public async handleBatch(payload: string): Promise<Response> {
    // TODO Handler code
    // ...
    // parse CSV in to json
    console.log("Received payload:", payload);
    const { data, errors } = Papa.parse(payload, { header: true });
    if (errors.length) {
      console.error("Parsing errors:", errors);
      return { ok: false, error: "There were parsing errors." };
    }
    // validate headers
    const expectedHeaders = [
      "id",
      "callStartTime",
      "callEndTime",
      "callType",
      "fromNumber",
      "toNumber",
      "region",
    ];
    const actualHeaders = Object.keys(data[0] || {});
    if (!expectedHeaders.every((h) => actualHeaders.includes(h))) {
      console.error(
        `Invalid CSV headers. Missing headers: ${expectedHeaders.filter((h) => !actualHeaders.includes(h)).join(", ")}`,
      );
      return { ok: false, error: "Invalid cdr record" };
    }

    // validate each record, return only valid record
    const validationResult = this.validateCsvBatch(data);
    console.log(validationResult);
    // TODO Enrich records with operator and country info, and calculate cost
    //const enrichedRecords = await this.enrichCallRecord(validRecords);
    // TODO Store enriched records in database
    //const stored = await this.storeEnrichedRecords(enrichedRecords);
    // TODO Return response with success status and any relevant information

    return { ok: true };
  }
  private validateCsvBatch(data: unknown[]): ValidationResult {
    const invalidRecords: InvalidRecord[] = [];
    const validRecords: CallRecord[] = [];

    data.forEach((record: unknown) => {
      console.log(isValidCallRecord(record as CallRecord));
      if (isValidCallRecord(record as CallRecord)) {
        validRecords.push(record as CallRecord);
      } else {
        invalidRecords.push({
          record: record as CallRecord,
          error: "Invalid record format",
        });
        console.error(`Invalid record: ${JSON.stringify(record)}`);
      }
    });
    return { validRecords: validRecords, invalidRecords: invalidRecords };
  }
  private async enrichCallRecord(records: CallRecord[]): Promise<CallRecord[]> {
    // TODO Enrich record with operator and country info, and calculate cost
    console.log("Enriching records:", records);
    return records;
  }
}
