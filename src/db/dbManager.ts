import { EnrichedCallRecord } from "../call-record.i";
import fs from "fs";

export class DatabaseManager {
  private client: null | { db: Record<string, EnrichedCallRecord[]> } = null;
  public async connect() {
    // Simulate database connection delay
    if (!this.client) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      this.client = { db: { collection1: [], collection2: [] } };
    }
    console.log("Connected to database");
  }

  public async insertIntoCollection(
    collectionName: string,
    records: EnrichedCallRecord[],
  ) {
    if (!this.client) {
      throw new Error("Database not connected");
    }
    if (!this.client.db[collectionName as keyof typeof this.client.db]) {
      this.client.db[collectionName as keyof typeof this.client.db] = [];
    }
    this.client.db[collectionName as keyof typeof this.client.db].push(
      ...records,
    );
    fs.appendFileSync(
      `./src/db/${collectionName}.log`,
      records.map((r) => JSON.stringify(r)).join("\n") + "\n",
    );
    console.log(`Inserted ${records.length} records into ${collectionName}`);
  }

  public async close() {
    if (this.client) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      this.client = null;
      console.log("Database connection closed");
    }
  }
}
