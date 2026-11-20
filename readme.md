# Tarjimon

Muallif: Fattoxov Abdulloh Toxirjon o'g'li

Barcha tillarga tarjima, ovozli kirish/o'qish, rasm va video tarjimasi, chat, telefon bilan profil, oltin yulduzchalar, Premium va admin panel. Bitta server, bitta ma'lumotlar bazasi: sayt `/` da, admin panel `/admin` da.

## Ishga tushirish

Faqat Node.js 18+ kerak, hech qanday paket o'rnatish shart emas.

    cp .env.example .env     # va to'ldiring
    node server.js           # http://localhost:3000

Birinchi ro'yxatdan o'tgan foydalanuvchi avtomatik **admin** bo'ladi (yoki `ADMIN_PHONES` ga raqam yozing).

## Nima qaysi kalitga bog'liq

| Imkoniyat | Kerakli kalit |
|---|---|
| Matn, rasm (OCR), video tarjimasi | `ANTHROPIC_API_KEY` |
| Videodagi nutq → matn | `OPENAI_API_KEY` (Whisper) |
| Telefon orqali kirish (SMS) | `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_CONFIG` (bo'sh bo'lsa test rejimi) |
| Yulduzcha/Premium sotish | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (bo'sh bo'lsa test rejimi) |

Stripe webhook manzili: `https://domeningiz/api/stripe/webhook`, hodisa: `checkout.session.completed`.

Ishlab chiqarishda `DEV_OTP=0` va `DEV_PAYMENTS=0` qiling, aks holda test rejimlari ochiq qoladi.

## Qoidalar (admin paneldan o'zgartiriladi)
- Har kuni har bir foydalanuvchiga 3 ta bepul yulduzcha; bir kishiga kuniga 1 tadan ko'p berib bo'lmaydi.
- Yulduzcha olgan foydalanuvchi 99 taga yetganda Premium avtomatik beriladi (365 kun).
- Yulduzchalar Stripe orqali paketlarda sotiladi (boshqalarga berish uchun).
- Bepul tarif: kuniga 20 matn, 3 rasm, 1 video. Premium: cheksiz.
- Admin: ilova nomi va egasi, foydalanuvchilar (premium, blok, admin qilish, yulduzcha qo'shish), narxlar, to'lovlar, chat moderatsiyasi.

## Bilish kerak
- Ma'lumotlar `data/db.json` faylida saqlanadi (kichik loyiha uchun yetarli; katta yuk uchun PostgreSQL ga o'tkazing).
- Vercel kabi serverless hostingda fayl saqlanmaydi; VPS, Render yoki Railway (doimiy disk bilan) ishlating.
- Bitta odam bir nechta raqam bilan yulduzcha "fermasi" qilishi mumkin; haqiqiy ishga tushirishda SMS/raqam tekshiruvini qattiqlashtiring.
- Telefon ilovasi (iOS/Android) keyingi bosqich: shu serverning API'sidan foydalanadi.
