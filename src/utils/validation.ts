import { CallRecord } from "../call-record.i";

const phoneRegex = /^\+\d{10,15}$/;

export function isValidDate(value: string): boolean {
  return !isNaN(Date.parse(value));
}
export function isValidPhoneNumber(value: string): boolean {
  return phoneRegex.test(value);
}
export function isValidString(value: string): boolean {
  return typeof value === "string" && value.trim() !== "";
}
export function isValidCallRecord(record: CallRecord): boolean {
  let isValid = true;
  Object.entries(record).forEach(([key, value]) => {
    switch (key) {
      case "callStartTime":
        if (!isValidDate(value)) {
          console.error(`Invalid call start time: ${value}`);
          isValid = false;
        }
        break;

      case "callEndTime":
        if (!isValidDate(value)) {
          console.error(`Invalid call end time: ${value}`);
          isValid = false;
        }
        break;

      case "callType":
        if (value !== "voice" && value !== "video") {
          console.error(`Invalid call type: ${value}`);
          isValid = false;
        }
        break;
      case "fromNumber":
        if (!isValidPhoneNumber(value)) {
          console.error(`Invalid from number: ${value}`);
          isValid = false;
        }
        break;
      case "toNumber":
        if (!isValidPhoneNumber(value)) {
          console.error(`Invalid to number: ${value}`);
          isValid = false;
        }
        break;
      case "id":
        if (!isValidString(value)) {
          console.error(`Invalid id: ${value}`);
          isValid = false;
        }
        break;
      case "region":
        if (!isValidString(value)) {
          console.error(`Invalid region: ${value}`);
          isValid = false;
        }
        break;
      default:
        if (!value) {
          console.error(`Missing value for ${key}`);
          isValid = false;
        } else {
          console.error(`Unknown field ${key} with value ${value}`);
        }
        break;
    }
  });
  return isValid;
}
