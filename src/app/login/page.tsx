import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { checkAuthorizedUser } from "@/lib/auth/require-authorized-user";
import { safeNextPath } from "@/lib/auth/safe-next";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const auth = await checkAuthorizedUser();
  if (auth.authorized) redirect(nextPath);
  return (
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center px-4 py-10">
      <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <p className="mb-2 text-sm font-bold text-secondary">FoamSales</p>
        <h1 className="text-2xl font-extrabold">دخول الإدارة</h1>
        <p className="mb-7 mt-2 text-sm text-muted">سيتم إرسال رمز التحقق عبر واتساب. لا توجد كلمة مرور.</p>
        <LoginForm nextPath={nextPath} />
      </section>
    </div>
  );
}
