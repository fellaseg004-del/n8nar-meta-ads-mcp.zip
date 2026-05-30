# n8nar-meta-ads-mcp

سيرفر **MCP** للـ **Meta Marketing API** (إعلانات Facebook + Instagram)، بيتوصّل بـ Claude.ai كـ **custom connector**. من شات Claude مباشرة تقدر تعرض، تعدّل، وتحلّل الكامبينات.

- **22 tool**: قراءة (9)، حالة وميزانية (4)، إنشاء (5)، جماهير (4)
- **Stack**: Next.js 14 + TypeScript على Vercel، Supabase للـ audit log و الـ aliases
- **Auth**: URL-token — `/api/mcp/<token>` (لأن Claude connector مابيدعمش Bearer header)

> ⚠️ **أمان**: ملف `.env` و التوكنات **مايترفعوش على GitHub أبدًا** (موجودين في `.gitignore`). كل القيم الحساسة بتتحط في **Vercel Environment Variables**.

---

## القيم اللي محتاجها (5)

| المتغير | إيه هو | تجيبه منين |
|---|---|---|
| `MCP_BEARER_TOKEN` | سر عشوائي 48+ حرف للرابط | تولّده إنت (تحت) |
| `META_ACCESS_TOKEN` | System User token | Business Manager (تحت) |
| `META_API_VERSION` | إصدار الـ API | سيبه `v22.0` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Supabase → Settings |
| `SUPABASE_SERVICE_ROLE_KEY` | مفتاح service role | Supabase → Settings → API |

### توليد الـ MCP_BEARER_TOKEN
```bash
openssl rand -hex 32
```
(بيطلّع 64 حرف — تمام).

---

## خطوات الـ Deploy

### 1) Supabase
1. افتح مشروعك → **SQL Editor** → **New query**.
2. الصق محتوى `supabase/migrations/001_initial.sql` كله → **Run**.
3. روح **Project Settings → Data API** وانسخ:
   - **Project URL** (`https://<ref>.supabase.co`) → ده `NEXT_PUBLIC_SUPABASE_URL`
   - تحت **API keys** انسخ مفتاح `service_role` → ده `SUPABASE_SERVICE_ROLE_KEY`
   > الـ service_role بيتخطى الـ RLS — استخدمه على السيرفر بس، عمره ما يتحط في فرونت إند.

### 2) GitHub
```bash
git init
git add .
git commit -m "init: n8nar meta ads mcp"
git branch -M main
git remote add origin https://github.com/<username>/n8nar-meta-ads-mcp.git
git push -u origin main
```

### 3) Vercel
1. [vercel.com/new](https://vercel.com/new) → Import الريبو.
2. **Settings → Environment Variables** → ضيف الـ 5 متغيرات.
3. **Deploy**. بعدها افتح الدومين، صفحة الـ status لازم تورّي كل المتغيرات ✅.

### 4) اربط Claude
رابط الـ connector:
```
https://<your-vercel-domain>/api/mcp/<MCP_BEARER_TOKEN>
```
Claude → **Settings → Connectors → Add custom connector** → الصق الرابط.

> 🔁 **مهم**: Claude بيـ cache الـ tools list. بعد أي deploy جديد بيغيّر الأدوات، اعمل **disconnect ثم reconnect** للـ connector.

---

## ✅ Checklist: إزاي تجيب الـ META_ACCESS_TOKEN

محتاج **System User token** من Business Manager (مش الـ short-lived token بتاع Graph Explorer — ده بينتهي بسرعة).

1. **Meta App**: [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App (نوع *Business*) → ضيف منتج **Marketing API**.
2. **Business Settings** ([business.facebook.com/settings](https://business.facebook.com/settings)) → **Users → System Users** → Add → اختار نوع *Admin* أو *Employee*.
3. اربط الـ System User بالـ **App** وبالـ **Ad Account(s)** (Assign Assets → Ad accounts → فعّل Manage).
4. من System User → **Generate New Token** → اختار الـ App → فعّل الصلاحيات:
   - `ads_management`
   - `ads_read`
   - `business_management`
   - `pages_show_list`، `pages_read_engagement` (لو هتشتغل على البيدجات/إنستجرام)
   - `instagram_basic` (لإعلانات إنستجرام)
5. اختار **Token never expires** لو متاح → **Generate** → انسخ التوكن.
6. حطّه في **Vercel → Environment Variables** باسم `META_ACCESS_TOKEN` → اعمل **Redeploy**.

> أي توكن اتعرض في شات أو مكان عام → اعمله **regenerate** فورًا من نفس الشاشة.

### مطبّات لازم تتحقق منها قبل ما الإعلانات تشتغل
- **Domain verification** مطلوب لأي **sales campaign** (من فبراير 2022).
- **Events Manager confirmation** مطلوب لكامبينات الـ **conversion**.
- `advantage_audience` بقى **إلزامي 2025** على كل ad set جديد (الكود بيحطه افتراضيًا).
- **Meta v23** شالت `campaign.start_date` و `campaign.end_date` — الجدولة بقت على مستوى الـ ad set (`start_time`/`end_time`).

---

## أنماط الأمان المدمجة
1. **كل entity جديد بيتعمل `PAUSED`** بغض النظر عن المُدخل — مفيش حاجة بتتولد ACTIVE من خلال الـ MCP.
2. **استخراج الأخطاء**: بنطلّع `error_user_title` و `error_user_msg` من ميتا دايمًا.
3. **Audit log**: كل tool call بيتسجل في `meta_tool_calls` مع `duration_ms` (ينجح أو يفشل).
4. **PII hashing**: الإيميلات/الموبايلات بيتعملها SHA-256 على السيرفر قبل ما تتبعت لميتا (مفيش raw PII بيخرج).

---

## تشغيل محلي
```bash
cp .env.example .env.local   # واملا القيم
npm install
npm run dev                  # http://localhost:3000
```
