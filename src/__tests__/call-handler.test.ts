import { CallHandler } from "../call-handler";
import { CallRecord } from "../call-record.i";

describe("CallHandler", () => {
  let callHandler: CallHandler;

  beforeEach(() => {
    callHandler = new CallHandler();
  });

  it("should return ok for valid CSV input", async () => {
    const validCSV = `id,callStartTime,callEndTime,callType,fromNumber,toNumber,region
1,2023-10-01T10:00:00Z,2023-10-01T10:05:00Z,voice,+1234567890,+0987654321,US
2,2023-10-01T10:10:00Z,2023-10-01T10:15:00Z,video,+1234567891,+0987654322,CA`;

    const response = await callHandler.handleBatch(validCSV);
    expect(response.ok).toBe(true);
  });

  it("should return error for invalid CSV input", async () => {
    const invalidCSV = `id,callStartTime,callEndTime,callType,fromNumber,toNumber,region
1,invalid_date,2023-10-01T10:05:00Z,voice,+1234567890,+0987654321,US`;

    const response = await callHandler.handleBatch(invalidCSV);
    expect(response.ok).toBe(false);
    expect(response.error).toBe("There were parsing errors.");
  });

  it("should validate call records correctly", () => {
    const validRecord: CallRecord = {
      id: "1",
      callStartTime: "2023-10-01T10:00:00Z",
      callEndTime: "2023-10-01T10:05:00Z",
      callType: "voice",
      fromNumber: "+1234567890",
      toNumber: "+0987654321",
      region: "US",
    };

    const invalidRecord: CallRecord = {
      id: "2",
      callStartTime: "invalid_date",
      callEndTime: "2023-10-01T10:15:00Z",
      callType: "unknown",
      fromNumber: "invalid_number",
      toNumber: "+0987654322",
      region: "",
    };

    expect(isValidCallRecord(validRecord)).toBe(true);
    expect(isValidCallRecord(invalidRecord)).toBe(false);
  });

  it("should handle empty CSV input gracefully", async () => {
    const emptyCSV = "";
    const response = await callHandler.handleBatch(emptyCSV);
    expect(response.ok).toBe(false);
    expect(response.error).toBe("There were parsing errors.");
  });
});

function expect(ok: boolean) {
  throw new Error("Function not implemented.");
}
