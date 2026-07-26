import { requireAuthorizedUser } from "@/lib/auth/require-authorized-user";

export default async function SalesLayout({ children }: { children: React.ReactNode }) {
  await requireAuthorizedUser("/sales/new");
  return children;
}
