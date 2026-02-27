import { z } from "zod";

const phoneRegex = /^\+\d{10,15}$/;

const callRecordSchema = z.object({
  id: z.string().min(1, "ID cannot be empty"),
  callStartTime: z.iso.datetime("Invalid ISO 8601 format for callStartTime"),
  callEndTime: z.iso.datetime("Invalid ISO 8601 format for callEndTime"),
  fromNumber: z
    .string()
    .regex(phoneRegex, "Invalid phone number format for fromNumber"),
  toNumber: z
    .string()
    .regex(phoneRegex, "Invalid phone number format for toNumber"),
  callType: z.enum(["voice", "video"], "callType must be 'voice' or 'video'"),
  region: z.string().min(1, "Region cannot be empty"),
});

export function validateCallRecord(record: unknown): {
  isValid: boolean;
  errors?: string[];
} {
  try {
    callRecordSchema.parse(record);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.issues.map(
        (err) => `${err.path.join(".")}: ${err.message}`,
      );
      return { isValid: false, errors: errors };
    }
    return { isValid: false, errors: ["Unknown validation error"] };
  }
}
