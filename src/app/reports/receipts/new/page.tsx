import { ReceiptForm } from "@/components/reports/receipt-form";

export default async function NewReceiptPage({
  searchParams,
}: PageProps<"/reports/receipts/new">) {
  const query = await searchParams;
  const initialCustomer = Array.isArray(query.customer)
    ? query.customer[0]
    : query.customer;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-primary sm:text-3xl">
          إضافة سند قبض
        </h1>
        <p className="mt-2 text-sm text-muted sm:text-base">
          سجّل تحصيلًا لعميل دون ربط الدفع بالفاتورة.
        </p>
      </div>
      <ReceiptForm initialCustomer={initialCustomer} />
    </div>
  );
}
