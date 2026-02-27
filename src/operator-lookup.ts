export interface OperatorInfo {
  operator: string;
  country: string;
  estimatedCostPerMinute: number;
}

/**
 * Mock operator lookup service
 * Takes 100-300ms and occasionally fails (~5% failure rate)
 *
 * @param phoneNumber - Phone number in E.164 format (e.g., +14155551234)
 * @param callDate - Call start date in 'yy-MM-dd' format (e.g., '26-01-21')
 * @returns Operator information including pricing
 */
export async function lookupOperator(
  phoneNumber: string,
  callDate: string,
): Promise<OperatorInfo> {
  // Note: callDate is not used in this simple mock implementation
  // In a real system, it could be used for historical pricing lookups

  // Simulate network delay: 100-300ms
  const delay = Math.floor(Math.random() * 200) + 100;
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Simulate ~5% failure rate
  if (Math.random() < 0.5) {
    throw new Error("Operator lookup service temporarily unavailable");
  }

  // Mock operator data based on phone number prefix
  const phonePrefix = phoneNumber.substring(0, 3);

  // Simple mock logic based on country codes
  if (phoneNumber.startsWith("+1")) {
    // US/Canada
    return {
      operator: phonePrefix === "+14" ? "AT&T" : "Verizon",
      country: "United States",
      estimatedCostPerMinute: 0.02,
    };
  } else if (phoneNumber.startsWith("+44")) {
    // UK
    return {
      operator: phonePrefix === "+442" ? "BT" : "Vodafone",
      country: "United Kingdom",
      estimatedCostPerMinute: 0.05,
    };
  } else if (phoneNumber.startsWith("+49")) {
    // Germany
    return {
      operator: "Deutsche Telekom",
      country: "Germany",
      estimatedCostPerMinute: 0.04,
    };
  } else if (phoneNumber.startsWith("+33")) {
    // France
    return {
      operator: "Orange",
      country: "France",
      estimatedCostPerMinute: 0.045,
    };
  } else {
    // Default for other countries
    return {
      operator: "International Operator",
      country: "Unknown",
      estimatedCostPerMinute: 0.1,
    };
  }
}
