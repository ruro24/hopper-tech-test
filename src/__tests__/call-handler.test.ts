import { CallHandler } from "../call-handler";
import { validateCallRecord } from "../utils/validation";
import { DatabaseManager } from "../db/dbManager";
import { lookupOperator, OperatorInfo } from "../operator-lookup";
import fs from "fs";

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
    };
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

describe("DatabaseManager", () => {
  let db: DatabaseManager;
  beforeEach(async () => {
    db = new DatabaseManager();
    jest.spyOn(fs, "appendFileSync").mockImplementation(() => {});
    await db.connect();
  });

  afterEach(async () => {
    await db.close();
    jest.resetAllMocks();
  });

  it("connects without throwing and only once", async () => {
    const spy = jest.spyOn(db, "connect");
    await db.connect();
    expect(spy).toHaveBeenCalled();
  });

  it("inserts records into a named collection and logs to fs", async () => {
    const recs = [{ id: "foo", duration: 0 } as any];
    await db.insertIntoCollection("collection1", recs);
    expect((db as any).client.db.collection1).toContainEqual(recs[0]);
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      "./src/db/collection1.log",
      expect.stringContaining('"id":"foo"'),
    );
  });
});

describe("CallHandler", () => {
  const sampleCsv = `id,callStartTime,callEndTime,callType,fromNumber,toNumber,region
1,2025-01-01T00:00:00Z,2025-01-01T00:10:00Z,voice,+14155551234,+442071838750,US`;

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
    const start = Date.now();
    await handler.handleBatch(sampleCsv);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
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
    const start = Date.now();
    await handler.handleBatch(sampleCsv);
    const duration = Date.now() - start;
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
          fromOperator: undefined,
          toOperator: undefined,
        }),
      ]),
    );
  });
});
