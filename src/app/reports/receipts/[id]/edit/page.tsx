"use client";
import { useParams } from "next/navigation";
import { ReceiptForm } from "@/components/reports/receipt-form";
import { EmptyState } from "@/components/ui/empty-state";
import { useReceipts } from "@/lib/hooks/use-receipts";
export default function EditReceiptPage(){const {id}=useParams<{id:string}>();const receipt=useReceipts().find((item)=>item.id===id);if(!receipt)return <EmptyState title="لم يتم العثور على سند القبض" description="قد يكون السند محذوفًا."/>;return <div className="space-y-6"><h1 className="text-2xl font-extrabold text-primary sm:text-3xl">تعديل سند القبض</h1><ReceiptForm existing={receipt}/></div>}
