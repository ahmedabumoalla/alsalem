# إعداد Supabase في FoamSales

يستخدم FoamSales قاعدة بيانات Supabase PostgreSQL من الخادم فقط. لا تستخدم المنصة Supabase Auth أو تسجيل الدخول، وتكون صفحات الإدارة وواجهات البيانات مفتوحة لكل من يستطيع الوصول إلى رابط التطبيق.

## Migrations

طبّق ملفات `supabase/migrations` بالترتيب. الملفان `003_green_api_otp_sessions.sql` و`004_remove_custom_otp_sessions.sql` محفوظان ضمن سجل الترحيلات التاريخي؛ ينشئ الأول جداول المصادقة القديمة ويحذفها الثاني. لا تحذف ترحيلات سبق تطبيقها على قاعدة منشورة.

## متغيرات البيئة

أضف محليًا وفي بيئة الاستضافة:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
```

هذه متغيرات خادم فقط. لا تستخدم السابقة `NEXT_PUBLIC_` ولا ترسل `SUPABASE_SECRET_KEY` إلى المتصفح أو تضعها في Git.

## التحقق

للتحقق من المنطق محليًا:

```powershell
npm.cmd run verify:all
```

ولإجراء اختبار حي على قاعدة اختبار مهيأة:

```powershell
npm.cmd run verify:supabase:live
```

الاختبار الحي ينشئ بيانات اختبار ويحذفها، لذلك لا تشغله على قاعدة الإنتاج إلا إذا كنت تقبل هذا الأثر.
