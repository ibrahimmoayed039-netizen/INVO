# ربط الطباعة الأصلية (اختياري)

في `pos/src/lib/print.ts` داخل فرع `print_type === 'qz'` أضف قبل `printWithQz`:

```ts
const desktop = (window as any).uryDesktop;
if (desktop?.printHtml) {
  const html = await getInvoicePrintHtml(orderId, format as string);
  await desktop.printHtml(html);
  await updatePrintStatus(orderId);
  return 'qz';
}
```
ثم أعد بناء الواجهة على الخادم: `yarn ury-posv2-build`.
