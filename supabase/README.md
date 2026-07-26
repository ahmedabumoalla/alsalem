# Supabase Phone Auth وGreen API في FoamSales

يستخدم FoamSales مصادقة الهاتف الرسمية من Supabase. يولد Supabase رمز OTP
ويتحقق منه وينشئ الجلسة الرسمية، بينما يعمل Green API كقناة إرسال واتساب فقط
عن طريق Send SMS Hook موقع.

## Migrations

لا تعدّل migrations 001 أو 002 أو 003. الملف
`004_remove_custom_otp_sessions.sql` يحذف جدولي `otp_challenges` و
`admin_sessions` والدالة المرتبطة بهما فقط.

> لا تطبق migration 004 قبل نجاح اختبار OTP حقيقي كامل عبر Supabase Hook.

## متغيرات البيئة

أضف محليًا وفي Vercel:

```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SECRET_KEY
ALLOWED_LOGIN_PHONE=+9665XXXXXXXX
GREEN_API_API_URL=https://api.green-api.com
GREEN_API_ID_INSTANCE=YOUR_INSTANCE_ID
GREEN_API_TOKEN_INSTANCE=YOUR_INSTANCE_TOKEN
SUPABASE_SEND_SMS_HOOK_SECRET=YOUR_HOOK_SECRET
```

جميعها خادمية ولا تستخدم معها `NEXT_PUBLIC_`. لا تضع الرقم الحقيقي أو أي
token في Git.

## إعداد Green API

1. أنشئ Instance واربط واتساب عن طريق QR.
2. تأكد أن حالة Instance هي `Authorized`.
3. جرّب رسالة عادية قبل اختبار OTP.
4. أضف `apiUrl` و`idInstance` و`apiTokenInstance` إلى Vercel.

## إعداد Supabase Dashboard

1. افتح **Authentication → Providers → Phone** وفعّل Phone Provider.
2. لا تضف Twilio أو مزود SMS مدمجًا؛ الإرسال يتم عبر Hook.
3. افتح **Authentication → Hooks → Send SMS Hook**.
4. اختر HTTP Hook وضع:
   `https://YOUR_DOMAIN/api/auth/hooks/send-sms`
5. ضع secret مطابقًا تمامًا لـ`SUPABASE_SEND_SMS_HOOK_SECRET`.
6. اضبط Site URL وRedirect URLs على نطاق Vercel النهائي.

يتحقق endpoint من `webhook-id` و`webhook-timestamp` و`webhook-signature`
بـHMAC SHA-256 ومقارنة timing-safe، ويرفض التوقيعات الأقدم من خمس دقائق.

## الاختبارات

`npm run verify:all` يستخدم Green API mock ولا يرسل رسالة حقيقية.

لإرسال رسالة اختبار واحدة مباشرة إلى Green API:

```powershell
$env:GREEN_API_TEST_ALLOW_SEND='1'
npm.cmd run verify:green-api:live
Remove-Item Env:GREEN_API_TEST_ALLOW_SEND
```

بعد إعداد Dashboard اختبر يدويًا: إرسال OTP، إدخال الرمز، فتح صفحات الإدارة،
تحديث الصفحة للتأكد من استمرار الجلسة، ثم تسجيل الخروج.
