import { format } from "date-fns";

function generateRandomSuffix(): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateInvoiceNumber(): string {
  const datePart = format(new Date(), "yyyyMMdd");
  return `FS-${datePart}-${generateRandomSuffix()}`;
}
