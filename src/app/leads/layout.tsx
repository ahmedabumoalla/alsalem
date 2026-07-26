import { requireAuthorizedUser } from "@/lib/auth/require-authorized-user";

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  await requireAuthorizedUser("/leads");
  return children;
}
