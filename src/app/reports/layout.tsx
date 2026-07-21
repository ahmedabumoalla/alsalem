import { PageContainer } from "@/components/layout/page-container";
import { ReportsNav } from "@/components/reports/reports-nav";
export default function ReportsLayout({children}:{children:React.ReactNode}){return <PageContainer className="space-y-6 pb-12"><ReportsNav/>{children}</PageContainer>}
