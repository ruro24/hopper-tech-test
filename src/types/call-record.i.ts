export interface CallRecord {
  id: string;
  callStartTime: string; // ISO 8601 format
  callEndTime: string; // ISO 8601 format
  fromNumber: string;
  toNumber: string;
  callType: "voice" | "video";
  region: string;
}

export interface EnrichedCallRecord extends CallRecord {
  duration: number; // calculated in seconds
  fromOperator?: string;
  toOperator?: string;
  fromCountry?: string;
  toCountry?: string;
  estimatedCost?: number | null; // calculated based on duration and operator rates, null if lookup failed
}
