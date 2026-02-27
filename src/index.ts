import express from "express";
import fs from "fs/promises";
import { CallHandler } from "./call-handler";

const app = express();
const PORT = 3000;

app.use(express.json());

app.post("/", async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: "filePath is required" });
  }

  try {
    // Read the CSV file
    const csvData = await fs.readFile(filePath, "utf-8");

    // Process CSV
    const callHandler = new CallHandler();
    const result = await callHandler.handleBatch(csvData);
    if (result.status !== 200) {
      res.status(result.status).json({ success: false, error: result.error });
    } else {
      res.status(200).json({ success: true, result });
    }
  } catch (err: any) {
    console.error("Error processing CSV:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

//close database connection on shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");
  // Here you would close any database connections if needed
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down gracefully...");
  // Here you would close any database connections if needed
  process.exit(0);
});
app.listen(PORT, () => {
  console.log(`CSV processor API running on http://localhost:${PORT}`);
});
