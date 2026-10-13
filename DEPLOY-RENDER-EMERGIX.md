# نشر Emergix Academy خارج Replit (Render + Neon + Cloudflare R2)

## ما الذي تغيّر في الكود
- `artifacts/api-server/src/lib/courseStorage.ts`: التخزين الخاص صار على أي S3 (R2 مثلًا) بدل Replit.
- `artifacts/api-server/src/app.ts`: في الإنتاج يخدم الـAPI ملفات الموقع المبنية على نفس العنوان (مطلوب لعمل الكوكيز).
- `artifacts/api-server/package.json`: أُضيفت حزمتا `@aws-sdk`.
- `render.yaml`: إعداد Render.

## 1) القاعدة (Neon)
أنشئ مشروعًا في neon.tech وانسخ رابط الاتصال (ينتهي بـ `?sslmode=require`). ثم من جهازك داخل المشروع:
```
pnpm install
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push
```
(اختياري، للتجربة فقط) بيانات تجريبية: `DATABASE_URL="..." pnpm --filter @workspace/scripts run seed`

## 2) التخزين (Cloudflare R2)
1. أنشئ bucket خاص.
2. أنشئ API Token بصلاحية Object Read & Write لهذا الـbucket.
3. الـendpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
4. CORS للـbucket:
```json
[{"AllowedOrigins":["https://YOUR-APP.onrender.com"],"AllowedMethods":["PUT","GET","HEAD"],"AllowedHeaders":["*"],"MaxAgeSeconds":3600}]
```

## 3) البريد (Resend)
بدون `RESEND_API_KEY` في الإنتاج لن تصل رسائل التفعيل ولا استعادة كلمة المرور. أنشئ مفتاحًا من resend.com واضبط `EMAIL_FROM` على دومين موثّق.

## 4) Render
ارفع المشروع على GitHub، ثم Render → New → Blueprint → اختر المستودع. أدخل المتغيرات:

| المتغير | القيمة |
|---|---|
| `APP_URL` | عنوان الموقع على Render بالكامل، مثل `https://emergix-academy.onrender.com` |
| `DATABASE_URL` | رابط Neon |
| `ADMIN_EMAIL` | بريد الأدمن |
| `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL` | من Resend وبريد الدعم |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | من R2 |

`SESSION_SECRET` و`ADMIN_BOOTSTRAP_TOKEN` يُولَّدان تلقائيًا (انسخ التوكن من Environment في لوحة Render).

## 5) إنشاء حساب الأدمن
1. افتح `https://YOUR-APP.onrender.com/setup/admin`.
2. أدخل بريد الأدمن نفسه وكلمة المرور والتوكن (انسخه من Render).
3. بعد النجاح احذف `ADMIN_BOOTSTRAP_TOKEN` من Render.

## ملاحظات
- الخطة المجانية تنام عند الخمول وأول طلب بعدها يتأخر.
- ادفع `pnpm-lock.yaml` المحدَّث بعد أول `pnpm install` ثم غيّر `--no-frozen-lockfile` إلى `--frozen-lockfile` في `render.yaml`.
- لم أشغّل البناء هنا (لا شبكة)، فجرّب `pnpm install` ثم `pnpm run typecheck` على جهازك قبل الرفع.
