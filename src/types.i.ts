import { CallRecord } from "./call-record.i";

export interface ValidationResult {
  invalidRecords: InvalidRecord[];
  validRecords: CallRecord[];
}

export interface InvalidRecord {
  record: CallRecord;
  error: string;
}
