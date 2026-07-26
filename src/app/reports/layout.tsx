import { PageContainer } from "@/components/layout/page-container";
import { ReportsNav } from "@/components/reports/reports-nav";
import { requireAuthorizedUser } from "@/lib/auth/require-authorized-user";

export default async function ReportsLayout({children}:{children:React.ReactNode}){
  await requireAuthorizedUser("/reports");
  return <PageContainer className="space-y-6 pb-12"><ReportsNav/>{children}</PageContainer>;
}
