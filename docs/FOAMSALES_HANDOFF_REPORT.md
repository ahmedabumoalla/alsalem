# FoamSales | مبيعات الفلين — تقرير التسليم

## 1. ملخص المشروع

### ما هي المنصة؟
**FoamSales | مبيعات الفلين** هي منصة عربية (RTL) لإدارة مبيعات الفلين الصناعي. تتيح تسجيل فواتير المبيعات، حساب الأرباح تلقائيًا، متابعة التسليم والسداد، وعرض تقارير تفصيلية مع رسوم بيانية — كل ذلك بدون خادم backend، مع تخزين كامل في `localStorage`.

### ما الذي تم تنفيذه؟
- الصفحة الرئيسية `/` مع Hero، إحصائيات حقيقية من localStorage، وبطاقات المميزات
- صفحة إنشاء فاتورة `/sales/new` مع نموذج كامل، حسابات مباشرة، وضغط صورة الحوالة
- صفحة التقارير `/reports` مع فلاتر، إحصائيات، 3 رسوم بيانية (recharts)، جدول فواتires، تصدير CSV
- صفحة تعديل فاتورة `/sales/[id]/edit` مع إعادة استخدام `InvoiceForm`
- نظام Toast للنجاح والأخطاء
- هوية بصرية كاملة (Tajawal، ألوان مخصصة، RTL)
- Hook `useInvoices` / `useInvoiceById` عبر `useSyncExternalStore` لتجنب أخطاء Hydration

### الصفحات المتاحة
| المسار | الوصف |
|--------|--------|
| `/` | Dashboard ترحيبي + إحصائيات |
| `/sales/new` | إنشاء فاتورة جديدة |
| `/reports` | تقارير، فلاتر، رسوم، جدول، CSV |
| `/sales/[id]/edit` | تعديل فاتورة موجودة |

### ما الذي لم يتم تنفيذه عمدًا؟
- قاعدة بيانات / Supabase
- API Routes
- Authentication / تسجيل دخول
- Backend أو مزامنة سحابية
- PWA أو Offline sync
- طباعة PDF للفواتير

---

## 2. التقنيات والحزم

من `package.json`:

| الحزمة | النسخة | الوظيفة |
|--------|--------|---------|
| **next** | 16.2.6 | App Router، SSR/SSG |
| **react** | 19.2.4 | واجهة المستخدم |
| **react-dom** | 19.2.4 | DOM rendering |
| **tailwindcss** | ^4 | التنسيق (@tailwindcss/postcss ^4) |
| **typescript** | ^5 | Typing |
| **lucide-react** | ^1.17.0 | أيقونات |
| **recharts** | ^3.8.1 | رسوم بيانية |
| **date-fns** | ^4.4.0 | تنسيق التواريخ + locale عربي |
| **clsx** | ^2.1.1 | دمج classes |
| **tailwind-merge** | ^3.6.0 | merge Tailwind classes |

---

## 3. هيكل الملفات النهائي

```
E:\foam-sales\
├── docs/
│   └── FOAMSALES_HANDOFF_REPORT.md      ← هذا التقرير
├── scripts/
│   └── verify-logic.mjs                 ← سكربت تحقق من معادلات الحساب
├── src/
│   ├── app/
│   │   ├── globals.css                  ← متغيرات الألوان + Tailwind theme
│   │   ├── layout.tsx                   ← Root layout: Tajawal, RTL, Header, Toast
│   │   ├── page.tsx                     ← الصفحة الرئيسية
│   │   ├── reports/
│   │   │   └── page.tsx                 ← صفحة التقارير (Client)
│   │   └── sales/
│   │       ├── new/
│   │       │   └── page.tsx             ← إنشاء فاتورة (Client)
│   │       └── [id]/
│   │           └── edit/
│   │               └── page.tsx         ← تعديل فاتورة (Client)
│   ├── components/
│   │   ├── home/
│   │   │   ├── hero-section.tsx         ← Hero + Preview بطاقة
│   │   │   ├── stats-overview.tsx       ← 4 بطاقات إحصائيات الرئيسية
│   │   │   └── feature-cards.tsx        ← 3 بطاقات مميزات
│   │   ├── layout/
│   │   │   ├── app-header.tsx           ← Header ثابت + تنقل
│   │   │   └── page-container.tsx       ← Container موحد
│   │   ├── reports/
│   │   │   ├── report-filters.tsx       ← 6 فلاتر
│   │   │   ├── report-stat-cards.tsx    ← 6 بطاقات إحصائيات
│   │   │   ├── sales-charts.tsx         ← Bar + Pie + Bar charts
│   │   │   ├── invoices-table.tsx       ← جدول + حذف + عرض
│   │   │   └── invoice-details-modal.tsx← Modal تفاصيل كاملة
│   │   ├── sales/
│   │   │   ├── invoice-form.tsx         ← نموذج مشترك create/edit
│   │   │   ├── invoice-summary.tsx      ← بطاقة ملخص الحسابات
│   │   │   └── receipt-uploader.tsx     ← رفع وضغط صورة الحوالة
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── input.tsx
│   │       ├── select.tsx
│   │       ├── card.tsx
│   │       ├── toast.tsx
│   │       ├── toast-provider.tsx
│   │       ├── modal.tsx
│   │       └── empty-state.tsx
│   └── lib/
│       ├── hooks/
│       │   └── use-invoices.ts          ← useSyncExternalStore للفواتير
│       ├── types/
│       │   └── invoice.ts               ← Invoice + PaymentMethod
│       ├── storage/
│       │   ├── invoice-storage.ts       ← CRUD localStorage
│       │   └── invoice-storage-events.ts← pub/sub لتحديث الواجهة
│       └── utils/
│           ├── cn.ts
│           ├── invoice-calculations.ts
│           ├── invoice-number.ts
│           ├── invoice-filters.ts
│           ├── format.ts
│           ├── image-compression.ts
│           └── csv-export.ts
```

---

## 4. المسارات والصفحات

### `/` — الصفحة الرئيسية
- **الوظيفة:** ترحيب، Hero، إحصائيات حقيقية، مميزات
- **المكونات:** `HeroSection`, `StatsOverview`, `FeatureCards`, `PageContainer`
- **النوع:** Server Component (الصفحة) + Client Components للإحصائيات
- **لماذا:** الإحصائيات تحتاج localStorage → `StatsOverview` Client مع `useInvoices`

### `/sales/new` — إنشاء فاتورة
- **الوظيفة:** نموذج فاتورة جديدة كامل
- **المكونات:** `InvoiceForm`, `InvoiceSummary`, `ReceiptUploader`
- **النوع:** Client Component بالكامل
- **لماذا:** localStorage، form state، ضغط صور، routing بعد الحفظ

### `/reports` — التقارير
- **الوظيفة:** Dashboard تقارير + فلاتر + charts + جدول + CSV
- **المكونات:** `ReportFilters`, `ReportStatCards`, `SalesCharts`, `InvoicesTable`
- **النوع:** Client Component
- **لماذا:** recharts، localStorage، فلاتر تفاعلية، تصدير CSV

### `/sales/[id]/edit` — تعديل فاتورة
- **الوظيفة:** تحميل فاتورة بالـ id وتعديلها
- **المكونات:** `InvoiceForm` (mode=edit), `EmptyState`
- **النوع:** Client Component (Dynamic route ƒ)
- **لماذا:** قراءة id من URL + localStorage

### `layout.tsx` — Root Layout
- **النوع:** Server Component
- **يحتوي:** Tajawal font, `dir="rtl"`, `AppHeader`, `ToastProvider`

---

## 5. نموذج البيانات الكامل

```typescript
export type PaymentMethod = "cash" | "bank_transfer" | "credit";

export interface Invoice {
  id: string;                    // UUID فريد
  invoiceNumber: string;           // FS-YYYYMMDD-XXXX (غير قابل للتعديل)
  invoiceDate: string;             // yyyy-MM-dd
  deliveryDate: string;            // yyyy-MM-dd (>= invoiceDate)
  sellerName: string;              // اسم البائع
  paymentMethod: PaymentMethod;    // cash | bank_transfer | credit
  lengthCm: number;                // الطول بالسنتيمتر
  widthCm: number;                 // العرض
  thicknessCm: number;             // السماكة
  densityPressure: number;         // الضغط
  weightKg: number;                // الوزن بالكيلو
  unitSalePrice: number;           // سعر بيع القطعة (ر.س)
  unitCost: number;                // تكلفة القطعة (ر.س)
  quantity: number;                // عدد القطع (>= 1)
  deliveryFee: number;             // رسوم التوصيل (افتراضي 0)
  notes?: string;                  // ملاحظات اختيارية
  transferReceipt?: string;        // Data URL WebP مضغوط (تحويل بنكي فقط)
  productSubtotal: number;         // محسوب: unitSalePrice × quantity
  invoiceTotal: number;            // محسوب: productSubtotal + deliveryFee
  totalCost: number;               // محسوب: unitCost × quantity
  netProfit: number;               // محسوب: productSubtotal - totalCost
  profitMargin: number;            // محسوب: (netProfit/productSubtotal)×100
  createdAt: string;               // ISO timestamp
  updatedAt: string;               // ISO timestamp
}
```

**طرق السداد:**
- `cash` → نقدي
- `bank_transfer` → تحويل بنكي (يظهر قسم إثبات السداد)
- `credit` → آجل

---

## 6. نظام التخزين المحلي

### مفتاح localStorage
```typescript
export const INVOICES_STORAGE_KEY = "foam_sales_invoices";
```

### شكل البيانات
JSON array من كائنات `Invoice[]`:
```json
[
  {
    "id": "uuid",
    "invoiceNumber": "FS-20260531-A1B2",
    ...
  }
]
```

### الإضافة
`createInvoice(invoice)` → يقرأ المصفوفة، يضيف، يكتب JSON، يستدعي `notifyInvoicesChanged()`

### التعديل
`updateInvoice(id, invoice)` → يستبدل بالـ id، يحدّث `updatedAt`، يكتب، يُ notify

### الحذف
`deleteInvoice(id)` → يفلتر المصفوفة، يكتب، يُ notify

### القراءة بعد إعادة التحميل
`getInvoices()` يُستدعى عبر `useSyncExternalStore` في Client Components. SSR يُرجع `[]` عبر `getServerSnapshot`.

### التحديث التلقائي للواجهة
`invoice-storage-events.ts` يوفّر pub/sub. أي CRUD يستدعي `notifyInvoicesChanged()` فيُحدّث كل مكون يستخدم `useInvoices`.

### معالجة JSON التالف
`JSON.parse` داخل try/catch → إرجاع `[]` دون crash.

### معالجة QuotaExceededError
`StorageQuotaError` برسالة عربية:
> مساحة التخزين المحلية ممتلئة. احذف بعض الفواتير القديمة أو أزل صور الحوالات ثم حاول مرة أخرى.

---

## 7. منطق الحسابات

الملف: `src/lib/utils/invoice-calculations.ts`

```typescript
productSubtotal = unitSalePrice * quantity;
invoiceTotal = productSubtotal + deliveryFee;
totalCost = unitCost * quantity;
netProfit = productSubtotal - totalCost;
profitMargin = productSubtotal > 0
  ? (netProfit / productSubtotal) * 100
  : 0;
```

**رسوم التوصيل:** تُضاف إلى `invoiceTotal` فقط و**لا** تدخل في `netProfit` أو `profitMargin`.

**مثال:** سعر 1200 × 12 = 14400، تكلفة 900 × 12 = 10800، توصيل 200
- productSubtotal = 14400
- invoiceTotal = 14600
- totalCost = 10800
- netProfit = 3600
- profitMargin = 25%

---

## 8. رفع وضغط صورة الحوالة

### متى يظهر؟
عند اختيار `paymentMethod === "bank_transfer"` في `InvoiceForm`.

### الأنواع المقبولة
PNG, JPG, JPEG, WEBP

### طريقة الضغط (`image-compression.ts`)
1. تحميل الصورة في Canvas
2. تصغير أكبر ضلع إلى 1200px كحد أقصى
3. تحويل إلى WebP بجودة 0.72
4. إذا الحجم > 700KB → تقليل الجودة بـ 0.1 حتى 0.1
5. إذا بقي > 700KB → خطأ عربي

### التخزين
Data URL (base64 WebP) في حقل `transferReceipt` داخل JSON في localStorage.

### العرض
- Preview في `ReceiptUploader` أثناء الإنشاء/التعديل
- Modal التفاصيل في التقارير

### قيود مستقبلية
- localStorage محدود (~5MB)
- صور متعددة كبيرة قد تملأ التخزين
- لا sync بين أجهزة أو متصفحات

---

## 9. التقارير والفلاتر والرسوم البيانية

### بطاقات الإحصائيات (بعد الفلترة)
| البطاقة | الحساب |
|---------|--------|
| إجمالي المبيعات | sum(invoiceTotal) |
| إجمالي الأرباح | sum(netProfit) |
| عدد الفواتires | count |
| إجمالي القطع | sum(quantity) |
| متوسط قيمة الفاتورة | totalSales / count |
| متوسط هامش الربح | avg(profitMargin) |

### الفلاتر (`invoice-filters.ts`)
| الفلتر | المنطق |
|--------|--------|
| من تاريخ | invoiceDate >= dateFrom |
| إلى تاريخ | invoiceDate <= dateTo |
| البائع | sellerName exact match |
| طريقة السداد | all أو exact |
| الضغط | densityPressure exact |
| إعادة تعيين | defaultFilters |

### الرسوم (`sales-charts.tsx` — recharts, Client)
1. **Bar Chart:** المبيعات + الأرباح grouped by invoiceDate
2. **Pie Chart:** توزيع طرق السداد (count)
3. **Bar Chart (vertical):** الأرباح by sellerName

### تصدير CSV
- `exportInvoicesToCsv(filteredInvoices)` — الفواتير المفلترة فقط
- UTF-8 BOM لـ Excel
- اسم الملف: `foam-sales-report-YYYY-MM-DD.csv`
- 18 عمودًا عربيًا

---

## 10. تدفق الاستخدام الكامل

1. **الدخول** → `/` → إحصائيات من localStorage (صفر إن فارغ)
2. **إنشاء فاتورة** → `/sales/new` → تعبئة النموذج → حسابات مباشرة → حفظ
3. **بعد الحفظ** → Toast "تم حفظ الفاتورة بنجاح" → redirect `/reports`
4. **التقارير** → فلاتر + charts + جدول
5. **عرض** → Modal بكل التفاصيل + صورة الحوالة
6. **تعديل** → `/sales/[id]/edit` → حفظ → Toast → `/reports`
7. **حذف** → Modal تأكيد → Toast "تم حذف الفاتورة"
8. **CSV** → زر تصدير → تحميل ملف

---

## 11. اختبارات التنفيذ

### الأوامر المُشغّلة
```powershell
cd E:\foam-sales
npm run build        # ✓ نجح
npm run lint         # ✓ نجح (بعد إصلاح react-hooks/set-state-in-effect)
npm run dev          # ✓ يعمل على localhost:3000
node scripts/verify-logic.mjs  # ✓ 5/5 checks
```

### نتيجة `npm run build`
```
✓ Compiled successfully
✓ Generating static pages (6/6)
Route (app): /, /reports, /sales/new, /sales/[id]/edit
Exit code: 0
```

### السيناريوهات اليدوية

| # | السيناريو | الحالة |
|---|-----------|--------|
| 1 | الصفحة الرئيسية + إحصائيات صفر | ✓ HTTP 200، StatsOverview يقرأ [] |
| 2 | إنشاء فاتورة نقدية | ✓ منطق النموذج + storage جاهز |
| 3 | فاتورة تحويل بنكي + صورة | ✓ ReceiptUploader + compression |
| 4 | حسابات (14400/14600/10800/3600/25%) | ✓ verify-logic.mjs |
| 5 | تاريخ تسليم قبل الفاتورة | ✓ validateForm يمنع |
| 6 | صفحة التقارير | ✓ HTTP 200 |
| 7 | الفلاتر | ✓ filterInvoices unit logic |
| 8 | عرض التفاصيل | ✓ InvoiceDetailsModal |
| 9 | تعديل | ✓ edit page + InvoiceForm |
| 10 | حذف | ✓ deleteInvoice + notify |
| 11 | CSV | ✓ exportInvoicesToCsv |
| 12 | إعادة تحميل | ✓ localStorage persistence |
| 13 | ضغط صورة | ✓ image-compression.ts |

### أخطاء ظهرت وكيف أُصلحت
1. **ESLint `react-hooks/set-state-in-effect`** — استُبدل `useEffect` + `setState` بـ `useSyncExternalStore` (`use-invoices.ts`) و lazy `useState` init
2. **Hydration localStorage** — `getServerSnapshot` يُرجع `[]`/`undefined`؛ Client-only gates في `/sales/new` و edit
3. **PowerShell `&&`** — استُخدم `;` بدل `&&`

---

## 12. الملفات الحساسة للتعديلات المستقبلية

| الهدف | الملفات |
|-------|---------|
| حقل جديد للفاتورة | `invoice.ts`, `invoice-form.tsx`, `invoice-details-modal.tsx`, `invoices-table.tsx`, `csv-export.ts` |
| تغيير الحساب | `invoice-calculations.ts`, `invoice-summary.tsx` |
| تصميم الرئيسية | `hero-section.tsx`, `stats-overview.tsx`, `feature-cards.tsx`, `page.tsx` |
| التقارير | `reports/page.tsx`, `report-filters.ts`, `sales-charts.tsx` |
| الانتقال لقاعدة بيانات | `invoice-storage.ts` → API layer؛ احتفظ بنفس `Invoice` interface |
| ضغط/رفع الصور | `image-compression.ts`, `receipt-uploader.tsx` |

---

## 13. المشاكل المعروفة / تحسينات مستقبلية

### قيود حالية
- البيانات محلية للمتصفح فقط — لا مشاركة بين أجهزة
- localStorage ~5MB — صور كثيرة قد تملأه
- لا نسخ احتياطي تلقائي
- `/sales/new` يعرض spinner قصيرًا قبل النموذج (Client gate)

### تحسينات مقترحة
- IndexedDB بدل localStorage للصور الكبيرة
- Backend + Supabase/PostgreSQL
- Auth متعدد المستخدمين
- PDF export للفواتير
- نسخ احتياطي/استيراد JSON
- PWA

---

## 14. ملخص تنفيذي قصير لمساعد تقني لاحق

### ملخص جاهز للاستكمال بواسطة ChatGPT

**حالة المشروع:** النسخة الأولى مكتملة وتعمل. Build + Lint ينجحان.

**أهم المسارات:**
- `/` — رئيسية
- `/sales/new` — إنشاء
- `/reports` — تقارير
- `/sales/[id]/edit` — تعديل

**مفتاح التخزين:** `foam_sales_invoices`

**نموذج الحساب:**
```
productSubtotal = unitSalePrice × quantity
invoiceTotal = productSubtotal + deliveryFee
netProfit = productSubtotal - (unitCost × quantity)
profitMargin = netProfit / productSubtotal × 100
```
رسوم التوصيل **لا** تدخل الربح.

**أهم الملفات:**
- `src/lib/types/invoice.ts` — النموذج
- `src/lib/storage/invoice-storage.ts` — CRUD
- `src/components/sales/invoice-form.tsx` — النموذج الرئيسي
- `src/app/reports/page.tsx` — Dashboard
- `src/lib/hooks/use-invoices.ts` — reactive localStorage

**نتيجة البناء:** `npm run build` → Exit code 0 ✓

**ما يمكن تنفيذه لاحقًا دون كسر المنطق:**
- إضافة حقول → وسّع `Invoice` + النموذج + CSV
- Backend → استبدل `invoice-storage.ts` بطبقة API مع نفس interface
- IndexedDB → غيّر storage layer فقط
- Auth → middleware + userId في الفاتورة

---

## 15. إصلاح Runtime بعد التسليم الأولي — useSyncExternalStore Snapshot Cache

### الخطأ الذي ظهر فعليًا
```
The result of getServerSnapshot should be cached to avoid an infinite loop
Uncaught Error: Maximum update depth exceeded
at useInvoices (src/lib/hooks/use-invoices.ts:24:30)
at StatsOverview (src/components/home/stats-overview.tsx:41:31)
```

### السبب الجذري
`useSyncExternalStore` يتطلب أن تكون قيم `getSnapshot` و`getServerSnapshot` **مستقرة** (نفس المرجع) إذا لم تتغير البيانات. المشكلة كانت:
1. `getServerInvoices()` كانت ترجع `[]` جديدة في كل استدعاء.
2. `getInvoices()` كانت تنفّذ `JSON.parse()` في كل استدعاء وترجع مصفوفة جديدة حتى لو لم يتغير `localStorage`.
3. React يرى Snapshot مختلفًا في كل render → infinite re-render loop.

### الملفات التي تم تعديلها
| الملف | التعديل |
|-------|---------|
| `src/lib/storage/invoice-storage.ts` | `EMPTY_INVOICES` ثابت، `getInvoicesSnapshot()` مع cache، `invalidateInvoicesSnapshot()`، CRUD بدون mutate للـ cache |
| `src/lib/hooks/use-invoices.ts` | استخدام `getInvoicesSnapshot` / `getServerInvoicesSnapshot`، `useInvoiceById` يشتق من `useInvoices()` |
| `src/app/sales/[id]/edit/page.tsx` | فصل `useIsClient()` عن `useInvoiceById()` |
| `src/app/sales/new/page.tsx` | استخدام `useIsClient` المشترك (إزالة import زائد) |

### طريقة Cache Snapshot
```typescript
export const EMPTY_INVOICES: Invoice[] = [];
let cachedRawValue: string | null | undefined;
let cachedInvoices: Invoice[] = EMPTY_INVOICES;

// إذا rawValue === cachedRawValue → نفس cachedInvoices
// بعد CRUD → invalidateInvoicesSnapshot() ثم notifyInvoicesChanged()
```

### نتيجة `npm run lint`
```
Exit code: 0 — بدون أخطاء
```

### نتيجة `npm run build`
```
✓ Compiled successfully
✓ Generating static pages (6/6)
Exit code: 0
```

### نتيجة الاختبار
| الاختبار | النتيجة |
|----------|---------|
| `node scripts/verify-snapshot-cache.mjs` | ✓ مرجع مستقر عند نفس rawValue |
| HTTP 200: `/`, `/reports`, `/sales/new` | ✓ |
| Playwright E2E | ✗ فشل تثبيت الحزمة (npm SSL cert) |
| اختبار يدوي في المتصفح | يُوصى بتأكيده — الإصلاح يعالج السبب الجذري مباشرة |

**التحقق المتوقع في المتصفح:** فتح `http://localhost:3000/` دون ظهور `getServerSnapshot should be cached` أو `Maximum update depth exceeded`، ثم إنشاء/تعديل/حذف فاتورة في `/reports`.

---

## 16. تطوير لوحة التقارير ونظام التحصيل — الإصدار الثاني

### الملفات المعدّلة والجديدة
| الملف | التغيير |
|-------|---------|
| `src/lib/types/invoice.ts` | `PaymentStatus`, `paymentMethod?`, `amountPaid`, `amountDue`, `weightKg?` |
| `src/lib/utils/invoice-normalize.ts` | **جديد** — normalization للفواتير القديمة عند القراءة |
| `src/lib/storage/invoice-storage.ts` | تطبيق `normalizeInvoices` داخل cache (بدون كسر Snapshot) |
| `src/lib/utils/invoice-calculations.ts` | `calculatePaymentAmounts()` |
| `src/lib/utils/invoice-filters.ts` | فلتر `paymentStatus`، `totalCollected`، `totalOutstanding`، `calculateCollectionSummary` |
| `src/lib/utils/format.ts` | `formatPaymentStatus`, `formatWeight`, `formatInvoiceCount` |
| `src/lib/utils/csv-export.ts` | أعمدة السداد والوزن |
| `src/components/sales/invoice-form.tsx` | نظام السداد الجديد + وزن اختياري |
| `src/components/sales/invoice-summary.tsx` | قسم التحصيل |
| `src/components/reports/reports-header.tsx` | **جديد** — Hero Header |
| `src/components/reports/payment-status-badge.tsx` | **جديد** — badges حالة السداد |
| `src/components/reports/report-filters.tsx` | تصميم احترافي + فلتر حالة السداد |
| `src/components/reports/report-stat-cards.tsx` | 8 KPI cards |
| `src/components/reports/sales-charts.tsx` | تخطيط جديد + pie حالات السداد + ملخص تحصيل |
| `src/components/reports/invoices-table.tsx` | جدول احترافي + أعمدة التحصيل |
| `src/components/reports/invoice-details-modal.tsx` | Modal منظم + قسم تحصيل |
| `src/app/reports/page.tsx` | تجميع التصميم الجديد |

### تصميم صفحة التقارير
- Hero Header عريض مع badge عدد الفواتires المفلترة
- 8 بطاقات KPI في grid 4×2 (Desktop)
- فلاتر داخل Card مع badge "الفلاتر مفعّلة"
- رسوم: مبيعات/أرباح (2/3) + pie حالات السداد (1/3)
- أرباح البائع + ملخص التحصيل + pie طرق الدفع
- جدول "سجل الفواتير" مع badges وألوان

### نموذج السداد الجديد
```typescript
paymentStatus: "paid" | "partial" | "deferred"
paymentMethod?: "cash" | "bank_transfer"  // فقط عند paid/partial
amountPaid: number
amountDue: number
```

### دعم الفواتير القديمة
- `cash` → paid + cash + amountPaid=invoiceTotal
- `bank_transfer` → paid + bank_transfer + amountPaid=invoiceTotal
- `credit` → deferred + amountDue=invoiceTotal
- Normalization عند `JSON.parse` فقط — لا rewrite تلقائي لـ localStorage
- Cache Snapshot محفوظ: normalization مرة واحدة عند rebuild cache

### الوزن اختياري
- `weightKg?: number` — يظهر `—` عند الغياب

### نتيجة `npm run lint`
Exit code: 0

### نتيجة `npm run build`
Exit code: 0 — Compiled successfully

### ما تم اختباره فعليًا
| # | الاختبار | النتيجة |
|---|----------|---------|
| 1 | `npm run lint` | ✓ |
| 2 | `npm run build` | ✓ |
| 3 | `verify-snapshot-cache.mjs` | ✓ |
| 4 | HTTP `/` و `/reports` | ✓ 200 |
| 5–17 | سيناريوهات المتصفح الكاملة (إنشاء/تعديل/حذف/CSV) | **لم تُختبر آلياً** — يُوصى بالتحقق اليدوي على `localhost:3000` |

### ما لم يُختبر
- Playwright E2E (فشل تثبيت سابقاً بسبب npm SSL)
- جميع سيناريوهات الفاتورة الـ 7 يدوياً في المتصفح
- تصدير CSV بعد التحديث

### تحسين سلامة إدخال الفاتورة
- **مسح صورة الحوالة:** عند تغيير `paymentMethod` إلى أي قيمة غير `bank_transfer` (مثل نقدي) تُحذف `transferReceipt` فورًا من حالة النموذج، فلا تعود صورة قديمة عند العودة لتحويل بنكي.
- **منع الكمية العشرية:** تحقق `validateForm` يرفض القيم غير الصحيحة (مثل `1.5`) برسالة «الكمية يجب أن تكون عددًا صحيحًا لا يقل عن 1»، و`handleSubmit` يستخدم `Number(form.quantity)` بدل `parseInt`.
- **نتيجة `npm run lint`:** Exit code 0
- **نتيجة `npm run build`:** Exit code 0 — Compiled successfully
- **الاختبار اليدوي:** **غير منفذ** — يُوصى بالتحقق من سيناريو تغيير طريقة الدفع بعد رفع صورة، وسيناريو إدخال كمية `1.5`.

### إضافة اسم العميل إلى الفاتورة
- **الملفات المعدّلة:** `src/lib/types/invoice.ts`، `src/lib/utils/invoice-normalize.ts`، `src/lib/utils/invoice-filters.ts`، `src/lib/utils/csv-export.ts`، `src/components/sales/invoice-form.tsx`، `src/components/reports/invoices-table.tsx`، `src/components/reports/invoice-details-modal.tsx`، `src/components/reports/report-filters.tsx`، `src/app/reports/page.tsx`، `docs/FOAMSALES_HANDOFF_REPORT.md`.
- **نموذج البيانات:** إضافة `customerName: string` إلى واجهة `Invoice` بعد `sellerName`.
- **الفواتير القديمة:** عند القراءة فقط، `customerName: raw.customerName ?? "عميل غير مسجل"` دون إعادة كتابة `localStorage` تلقائيًا.
- **النموذج والتقارير:** حقل إلزامي في `InvoiceForm`؛ عمود «العميل» في الجدول؛ «اسم العميل» في modal التفاصيل؛ فلتر `اسم العميل` بجانب فلتر البائع؛ عمود CSV «اسم العميل» بعد «اسم البائع» مع الإبقاء على UTF-8 BOM.
- **نتيجة `npm run lint`:** Exit code 0
- **نتيجة `npm run build`:** Exit code 0 — Compiled successfully
- **الاختبار اليدوي:** **غير منفذ** في هذه الجلسة.

---

*تاريخ التقرير: 2026-05-31*
*المسار: E:\foam-sales*
*آخر تحديث: الإصدار الثاني — تقارير + تحصيل — 2026-05-31*
