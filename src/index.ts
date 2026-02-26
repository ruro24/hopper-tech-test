import { CallHandler } from "./call-handler";
import fs from "fs";

const callHandler = new CallHandler();
const payload = fs.readFileSync("examples/call-batch.csv", "utf-8");
callHandler.handleBatch(payload);
