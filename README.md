# FoamSales

منصة مفتوحة لإدارة فواتير مبيعات الفلين، مركز التكلفة، العملاء، سندات القبض، العملاء المحتملين، والتقارير PDF/CSV. واجهة Next.js تتعامل مع Route Handlers، والبيانات التشغيلية محفوظة في Supabase PostgreSQL.

## التشغيل

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

أضف `SUPABASE_URL` و`SUPABASE_SECRET_KEY` إلى `.env.local` بعد تنفيذ [تعليمات Supabase](supabase/README.md). لا يستخدم التطبيق تسجيل الدخول أو Supabase Auth، وجميع صفحات الإدارة وواجهات البيانات متاحة مباشرةً لمن يملك رابط المنصة.

## الفحوص

```powershell
npx.cmd tsc --noEmit --incremental false
npm.cmd run lint -- --no-cache
npm.cmd run build
npm.cmd run verify:all
```

الـPWA يخزن shell والأصول الثابتة فقط. طلبات `/api/` وعمليات الحفظ تحتاج اتصالًا ولا تُخزن في Service Worker Cache.
