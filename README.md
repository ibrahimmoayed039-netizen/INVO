# URY Desktop (Electron)

غلاف سطح مكتب لنظام URY (واجهات POS / الإدارة / شاشة المطبخ / الطلب الذاتي).
الخادم (Frappe + ERPNext + URY) يبقى كما هو؛ هذا التطبيق هو العميل فقط.

## التثبيت السريع على ويندوز
انقر مرتين على `install.bat` ثم شغّل ملف Setup من مجلد dist.
للتجربة بدون تثبيت: `run.bat`.

## التشغيل
```
npm install
npm start
```
عند أول تشغيل أدخل عنوان الخادم (مثال: http://192.168.1.10:8000).

## بناء مثبّت ويندوز
```
npm run dist
```
المخرجات في مجلد `dist/`. ضع أيقونة `build/icon.ico` قبل البناء.

## الطباعة
- QZ Tray يعمل كما هو إن كان مثبتاً على الجهاز.
- أو الطباعة الأصلية: `window.uryDesktop.printHtml(html, {printer, silent})`
  (انظر ury-print-patch.md لربطها بـ pos/src/lib/print.ts).

## البناء التلقائي على GitHub
عند رفع وسم مثل `v1.0.0` (أو تشغيل Actions يدوياً) يُبنى مثبّت ويندوز تلقائياً
ويظهر في Releases / Artifacts.
