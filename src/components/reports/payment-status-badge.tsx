import type { PaymentStatus } from "@/lib/types/invoice";
import { cn } from "@/lib/utils/cn";
import { formatPaymentStatus } from "@/lib/utils/format";

const statusStyles: Record<PaymentStatus, string> = {
  paid: "bg-success/10 text-success border-success/20",
  partial: "bg-accent/10 text-primary border-accent/30",
  deferred: "bg-background text-muted border-border",
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        statusStyles[status],
        className
      )}
    >
      {formatPaymentStatus(status)}
    </span>
  );
}
