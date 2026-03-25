import { CallHandler } from "../call-handler";
import { validateCallRecord } from "../utils/validation";
import { DatabaseManager } from "../db/dbManager";
import { lookupOperator, OperatorInfo } from "../operator-lookup";
import { CallRecord } from "../types/call-record.i";

jest.mock("../operator-lookup", () => ({
  lookupOperator: jest.fn(),
}));

jest.mock("fs", () => ({
  appendFileSync: jest.fn(),
}));

describe("validation utilities", () => {
  it("accepts a valid call record", () => {
    const rec = {
      id: "abc",
      callStartTime: "2025-01-01T00:00:00Z",
      callEndTime: "2025-01-01T00:01:00Z",
      fromNumber: "+14155551234",
      toNumber: "+442071838750",
      callType: "voice",
      region: "US",
    } as CallRecord;
    const { isValid, errors } = validateCallRecord(rec);
    expect(isValid).toBe(true);
    expect(errors).toBeUndefined();
  });

  it("rejects an invalid record and returns errors", () => {
    const rec = {
      id: "",
      callStartTime: "not-a-date",
      callEndTime: "2025-01-01T00:01:00Z",
      fromNumber: "1234",
    } as any;
    const { isValid, errors } = validateCallRecord(rec);
    expect(isValid).toBe(false);
    expect(errors).toContainEqual(expect.stringContaining("id"));
    expect(errors).toContainEqual(expect.stringContaining("callStartTime"));
    expect(errors).toContainEqual(expect.stringContaining("fromNumber"));
  });
});

describe("CallHandler", () => {
  const sampleCsv = `id,callStartTime,callEndTime,callType,fromNumber,toNumber,region
1,2025-01-01T00:00:00Z,2025-01-01T00:10:00Z,voice,+14155551234,+442071838750,US`;

  const largeCsv = `id,callStartTime,callEndTime,callType,fromNumber,toNumber,region
${Array.from({ length: 10 }, (_, i) => {
  const id = `cdr_${i + 1}`;
  const start = new Date(2025, 0, 1, 0, i).toISOString();
  const end = new Date(2025, 0, 1, 0, i + 10).toISOString();
  return `${id},${start},${end},voice,+14155551234,+442071838750,US`;
}).join("\n")}`;

  beforeEach(() => {
    jest.clearAllMocks();
    (lookupOperator as jest.Mock).mockResolvedValue({
      operator: "TestOp",
      country: "TestLand",
      estimatedCostPerMinute: 0.1,
    } as OperatorInfo);
    jest
      .spyOn(DatabaseManager.prototype, "connect")
      .mockResolvedValue(undefined as any);
    jest
      .spyOn(DatabaseManager.prototype, "insertIntoCollection")
      .mockResolvedValue(undefined as any);
  });

  it("returns 400 if headers are invalid", async () => {
    const handler = new CallHandler();
    const badCsv = `foo,bar\n1,2\n`;
    const res = await handler.handleBatch(badCsv);
    expect(res.status).toBe(400);
  });

  it("processes a valid batch and persists enriched records", async () => {
    const handler = new CallHandler();
    const res = await handler.handleBatch(sampleCsv);
    expect(res.status).toBe(200);

    expect(lookupOperator).toHaveBeenCalledTimes(2); // from & to lookups
    expect(DatabaseManager.prototype.connect).toHaveBeenCalled();
    expect(DatabaseManager.prototype.insertIntoCollection).toHaveBeenCalledWith(
      "collection1",
      expect.arrayContaining([
        expect.objectContaining({
          id: "1",
          fromOperator: "TestOp",
          toOperator: "TestOp",
        }),
      ]),
    );
  });

  it("acknowledges within 500 ms when external dependencies are fast", async () => {
    const handler = new CallHandler();
    const start = performance.now();
    await handler.handleBatch(sampleCsv);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(10);
  });

  it("acknowledges within 500 ms when external dependencies are slow", async () => {
    (lookupOperator as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                operator: "TestOp",
                country: "TestLand",
                estimatedCostPerMinute: 0.1,
              }),
            300,
          ),
        ),
    );
    const handler = new CallHandler();
    const start = performance.now();
    await handler.handleBatch(largeCsv);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
  it("handles operator lookup failures gracefully", async () => {
    (lookupOperator as jest.Mock).mockRejectedValueOnce(
      new Error("Service down"),
    );
    const handler = new CallHandler();
    const res = await handler.handleBatch(sampleCsv);
    expect(res.status).toBe(200);
    expect(DatabaseManager.prototype.insertIntoCollection).toHaveBeenCalledWith(
      "collection1",
      expect.arrayContaining([
        expect.objectContaining({
          id: "1",
          fromOperator: "",
          toOperator: "TestOp",
          estimatedCost: null,
        }),
      ]),
    );
  });
});
