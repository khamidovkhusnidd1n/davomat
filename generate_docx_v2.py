import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import os

doc = docx.Document()

# Default font settings
style = doc.styles['Normal']
font = style.font
font.name = 'Times New Roman'
font.size = Pt(14)

def add_heading(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = 'Times New Roman'
        run.font.color.rgb = RGBColor(0, 0, 0)
    return h

def add_placeholder(text):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(f"\n\n[ --- {text} --- ]\n[ SHU YERGA RASM QO'YILADI ]\n[ Joy: kamida yarim sahifa ]\n\n")
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(255, 0, 0)
    doc.add_paragraph('\n' * 15)

# Page 1: Title
doc.add_paragraph('\n\n\n')
title = doc.add_paragraph("MUSTAQIL ISH\n")
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.runs[0].font.size = Pt(24)
title.runs[0].font.bold = True

sub_title = doc.add_paragraph("Mavzu: Raqamli o'zgarish va innovatsion g'oya: Tashkilotda avtomatlashtirilgan davomat tizimini joriy etish va tijoratlashtirish modeli")
sub_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
sub_title.runs[0].font.size = Pt(18)
sub_title.runs[0].font.bold = True

doc.add_paragraph('\n\n\n\n\n\n\n\n\n\n\n')
doc.add_paragraph("Bajardi: ________________________").alignment = WD_ALIGN_PARAGRAPH.RIGHT
doc.add_paragraph("Tekshirdi: ________________________").alignment = WD_ALIGN_PARAGRAPH.RIGHT
doc.add_page_break()

# Page 2: Table of Contents
add_heading("MUNDARIJA", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("KIRISH.......................................................................................................3")
doc.add_paragraph("1-BOB. INNOVATSION G'OYA VA TIZIMNING ASOSIY MAQSADI.........................4")
doc.add_paragraph("2-BOB. TIZIM QISMLARI VA ULARNING VAZIFALARI.......................................5")
doc.add_paragraph("3-BOB. NEGA AYNAN SHU TIZIM VA RAQAMLI KO'RSATKICHLAR?.......................9")
doc.add_paragraph("4-BOB. STARTAP G'OYASINI SHAKLLANTIRISH: 'IDEA TO MARKET' MODELI...........10")
doc.add_paragraph("  4.1. Canvas modeli tuzish (Business Model Canvas)..............................................10")
doc.add_paragraph("  4.2. Minimal Viable Product (MVP) konsepsiyasi..................................................11")
doc.add_paragraph("5-BOB. YANGI MAHSULOT ISHLAB CHIQISH LOYIHASINI YARATISH..................12")
doc.add_paragraph("  5.1. Bozor problemi va yechimini aniqlash..........................................................12")
doc.add_paragraph("  5.2. Mahsulot konsepsiyasi va prototip sxemasi.................................................13")
doc.add_paragraph("XULOSA.....................................................................................................14")
doc.add_page_break()

# Page 3: Kirish
add_heading("KIRISH", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("Hozirgi globallashuv va axborot texnologiyalari jadal rivojlanayotgan davrda har qanday tashkilotning muvaffaqiyati uning qay darajada raqamlashtirilganligiga bog'liq. An'anaviy, qog'ozbozlikka asoslangan boshqaruv usullari o'z o'rnini tezkor, xavfsiz va avtomatlashtirilgan tizimlarga bo'shatib bermoqda.\n")
doc.add_paragraph("Ushbu mustaqil ishning asosiy mavzusi tashkilotda xodimlar yoki o'quvchilar davomatini nazorat qilish jarayonini raqamli transformatsiya qilish, ya'ni avtomatlashtirilgan davomat tizimini joriy etishdan iborat. Davomat - har qanday ta'lim muassasasi yoki korxona uchun intizom va samaradorlikning asosiy o'lchovidir.\n")
doc.add_paragraph("Biz taklif etayotgan innovatsion g'oya - Telegram bot, Next.js admin panel va Supabase ma'lumotlar bazasidan iborat integrallashgan tizim bo'lib, bu muammolarni to'liq bartaraf etadi.\n")
doc.add_page_break()

# Page 4: 1-BOB
add_heading("1-BOB. INNOVATSION G'OYA VA TIZIMNING ASOSIY MAQSADI", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("Innovatsion g'oya deganda, odatda, butunlay yangi narsa yaratish tushuniladi. Biroq, mavjud jarayonlarni eng zamonaviy texnologiyalar yordamida tubdan optimallashtirish ham haqiqiy innovatsiya hisoblanadi.\n")
doc.add_paragraph("Asosiy maqsadlar quyidagilardan iborat:\n"
                  "1. Vaqtni tejash: Jurnal to'ldirish va uni hisoblashga ketadigan yuzlab soatlarni qisqartirish.\n"
                  "2. Shaffoflikni ta'minlash: Har bir xodim/o'quvchining davomati real vaqtda bazaga tushishi.\n"
                  "3. Ekologik toza yondashuv: 'Zero Paper' siyosati.\n"
                  "4. Avtomatik tahlil: Grafiklar orqali darhol aniqlash.\n")
doc.add_page_break()

# Page 5: 2-BOB (Telegram Bot)
add_heading("2-BOB. TIZIM QISMLARI VA ULARNING VAZIFALARI", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
add_heading("2.1. Telegram Bot (Ma'lumot kiritish qismi)", 2)
doc.add_paragraph("Tizimning birinchi va eng faol ishlatiladigan bo'limi bu Telegram Bot hisoblanadi. Node.js va Telegraf kutubxonasi yordamida yaratilgan.\n")
doc.add_paragraph("Vazifalari:\n"
                  "- Shaxsni tasdiqlash (Autentifikatsiya)\n"
                  "- Guruh yoki bo'limlarni tanlash\n"
                  "- Davomat belgilash\n"
                  "- Xabarnomalar (Notifications)\n")
add_placeholder("TELEGRAM BOT EKRANIDAN SKRINSHOT (Davomat belgilash jarayoni)")
doc.add_page_break()

# Page 6: Admin Panel
add_heading("2.2. Admin Panel (Boshqaruv va tahlil qismi)", 2)
doc.add_paragraph("Tizimning yuragi va rahbariyat ish stoli - bu Next.js yordamida yozilgan Web Admin Paneldir.\n")
doc.add_paragraph("Vazifalari:\n"
                  "- Dashboard (Asosiy oyna)\n"
                  "- Statistik vizualizatsiya (recharts)\n"
                  "- Excel va PDF eksport\n"
                  "- Foydalanuvchilarni boshqarish\n")
add_placeholder("ADMIN PANEL DASHBOARD SKRINSHOTI (Grafiklar va statistika)")
doc.add_page_break()

# Page 7: Supabase
add_heading("2.3. Supabase (Ma'lumotlar bazasi va xavfsizlik)", 2)
doc.add_paragraph("Tizimning poydevori - ma'lumotlar qanday va qayerda saqlanishidir. Loyihada an'anaviy serverlar o'rniga zamonaviy BaaS yechimi bo'lgan Supabase tanlangan.\n")
add_placeholder("SUPABASE BAZASI YOHUD JADVAL TUZILISHI SKRINSHOTI")
doc.add_page_break()

# Page 8: 3-BOB
add_heading("3-BOB. NEGA AYNAN SHU TIZIM VA RAQAMLI KO'RSATKICHLAR?", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("1. Vaqt tejamkorligi tahlili (Time Efficiency):\n"
                  "- An'anaviy usulda: Oyiga 200 soat sarflanadi.\n"
                  "- Bizning tizimda: 100 ta guruh uchun 50 daqiqa.\n"
                  "- Natija: Har oyda 180+ ish soati tejaladi. Vaqt tejamkorligi - 90% dan yuqori!\n")
add_placeholder("PDF YOHUD EXCEL HISOBOT YUKLAB OLINGANIDAN KEYINGI HOLAT SKRINSHOTI")
doc.add_page_break()

# Page 9: 4-BOB
add_heading("4-BOB. STARTAP G'OYASINI SHAKLLANTIRISH: \"IDEA TO MARKET\" MODELI", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("\"Idea to Market\" (G'oyadan bozorgacha) modeli asosida ushbu davomat tizimini tijoratlashtirish va muvaffaqiyatli startapga aylantirish bosqichlari ko'rib chiqiladi.\n")

add_heading("4.1. Canvas modeli tuzish (Business Model Canvas)", 2)
doc.add_paragraph("Loyihaning biznes modeli quyidagi 9 ta asosiy blokdan iborat:\n"
                  "1. Mijozlar segmenti (Customer Segments): O'quv markazlari, xususiy maktablar va kichik/o'rta biznes korxonalari.\n"
                  "2. Qiymat taklifi (Value Propositions): Davomat jarayonini 90% ga tezlashtirish, qog'ozsiz ish yuritish (Zero Paper), real vaqt rejimida monitoring va avtomatik aniq hisobotlar.\n"
                  "3. Kanallar (Channels): B2B to'g'ridan-to'g'ri sotuvlar (Direct Sales), ijtimoiy tarmoqlar (Telegram, LinkedIn) va ta'lim texnologiyalari ko'rgazmalari.\n"
                  "4. Mijozlar bilan munosabat (Customer Relationships): 24/7 onlayn texnik yordam, platformadan bepul o'qitish va doimiy tizim yangilanishlari.\n"
                  "5. Daromad oqimi (Revenue Streams): SaaS (Software as a Service) modeli asosida oylik/yillik obuna to'lovlari. Ta'lim muassasasidagi o'quvchilar soniga qarab moslashuvchan tariflar.\n"
                  "6. Asosiy resurslar (Key Resources): Malakali IT mutaxassislar (dasturchilar), xavfsiz bulutli serverlar (Supabase) va kuchli savdo menejerlari jamoasi.\n"
                  "7. Asosiy harakatlar (Key Activities): Dasturiy ta'minotni ishlab chiqish va takomillashtirish, server barqarorligini ta'minlash, hamda marketing kampaniyalari.\n"
                  "8. Asosiy hamkorlar (Key Partners): Ta'lim vazirligi tizimidagi boshqarmalar, mahalliy to'lov tizimlari (Payme, Click, Uzum) va Cloud xizmatlari provayderlari.\n"
                  "9. Xarajatlar tuzilmasi (Cost Structure): Server ijarasi, jamoa oylik maoshlari va mijozlarni jalb qilish (marketing) xarajatlari.\n")
doc.add_page_break()

# Page 10: 4-BOB davomi
add_heading("4.2. Minimal Viable Product (MVP) konsepsiyasi", 2)
doc.add_paragraph("Har qanday startap bozorda o'z o'rnini topishi uchun dastlab Minimal Viable Product (Eng zarur funksiyalarga ega minimal mahsulot) ishlab chiqilishi shart. Davomat tizimining MVP versiyasi quyidagilarni o'z ichiga oladi:\n")
doc.add_paragraph("- Telegram Bot orqali faqatgina eng zarur bo'lgan 'Keldi' yoki 'Kelmadi' maqomini kiritish imkoniyati (Murakkab sozlamalarsiz).\n"
                  "- Admin panelda faqat bugungi kun statistikasi va oddiy Excel (.xlsx) formatda eksport qilish funksiyasi.\n"
                  "- Supabase orqali ruxsatlarni (login/parol) oddiy boshqarish mexanizmi.\n")
doc.add_paragraph("MVP yaratishdan maqsad: Dastlabki mijozlarga (Early adopters) tizimni bepul sinov muddati bilan taqdim etish orqali bozor reaksiyasini tezkor o'lchash. Foydalanuvchilardan kelgan fikr-mulohazalar (Feedback) asosida keyingi murakkab modullar (To'lovlar nazorati, xodimlar KPI tizimi, ota-onalarga SMS xabarnoma) asta-sekin qo'shib boriladi.\n")
doc.add_page_break()

# Page 11: 5-BOB
add_heading("5-BOB. YANGI MAHSULOT ISHLAB CHIQISH LOYIHASINI YARATISH", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER

add_heading("5.1. Bozor problemi va yechimini aniqlash", 2)
doc.add_paragraph("Bozor problemi (Problem): O'zbekistondagi aksariyat nodavlat ta'lim muassasalari davomat hisobini hamon qog'oz jurnallar yoki umumiy Excel jadvallar orqali yuritadi. Bu quyidagi og'riqli muammolarni keltirib chiqaradi:\n"
                  "- Ma'lumotlarning ishonchliligi pastligi va o'zgarib qolish xavfi.\n"
                  "- O'qituvchilarning asosiy e'tibori ta'limga emas, balki qog'oz to'ldirishga chalg'ishi.\n"
                  "- Rahbariyatning real vaqtda muassasa holatini tahlil qila olmasligi (Faqat oy oxirida hisobot ko'rishi).\n")

doc.add_paragraph("Yechim (Solution): Telegram messenjeriga to'liq integratsiya qilingan bulutli Davomat platformasi. O'qituvchilar hech qanday yangi og'ir mobil ilovalarni yuklab olishmaydi, balki o'zlari har kuni ishlatadigan Telegram orqali 3 tugmani bosish orqali davomatni kiritadilar. Barcha tahliliy jarayonlar inson omilisiz serverda bajariladi.\n")
doc.add_page_break()

# Page 12: 5-BOB davomi
add_heading("5.2. Mahsulot konsepsiyasi va prototip sxemasi", 2)
doc.add_paragraph("Mahsulot konsepsiyasi: Loyiha \"Bir marta bosish orqali davomat va avtomatik hisobotlar\" konsepsiyasiga asoslangan. Tizim an'anaviy sotilmaydi, balki bulutli xizmat (SaaS) sifatida har oylik to'lov evaziga ijaraga beriladi.\n")

doc.add_paragraph("Prototip sxemasi va Tizim arxitekturasi:\n"
                  "Mahsulotning prototipi 4 ta asosiy qatlamdan iborat tarzda sxemalashtirilgan:\n\n"
                  "1. Foydalanuvchi qatlami (User Tier): O'qituvchi smartfonida Telegram Botga kirib, guruhni tanlaydi va o'quvchilarni holatini belgilaydi.\n"
                  "2. Mantiqiy qatlam (Logic Tier): Telegraf API (Node.js) ma'lumotlarni tezkor qabul qilib, tahlilga tayyorlaydi.\n"
                  "3. Ma'lumotlar qatlami (Data Tier): Supabase (PostgreSQL) bazasi kelgan ma'lumotni xavfsiz va shifrlangan holda saqlaydi.\n"
                  "4. Tahlil va Boshqaruv qatlami (Analytics Tier): Next.js orqali ishlangan Admin Panel ma'lumotlarni jadvallar va vizual grafiklar (Recharts) ko'rinishida rahbariyatga namoyish etadi.\n")

add_placeholder("MAHSULOT KONSEPSIYASI VA PROTOTIP SXEMASI (Diagramma bloklari)")
doc.add_page_break()

# Page 13: Xulosa
add_heading("XULOSA", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("Ushbu qo'shimchalar tizimning nafaqat texnik yechim ekanligini, balki to'laqonli Startap g'oyasi sifatidagi ulkan iqtisodiy va innovatsion salohiyatini namoyish etadi. Idea to Market modeli asosida loyiha bosqichma-bosqich monetizatsiya qilinishi rejalashtirilgan.\n")

doc.add_paragraph('\n\n\n\n\n')
add_heading("FOYDALANILGAN ADABIYOTLAR", 2)
doc.add_paragraph("1. Alexander Osterwalder. 'Business Model Generation'.\n"
                  "2. Eric Ries. 'The Lean Startup' (MVP konsepsiyasi).\n"
                  "3. Node.js, Next.js, Supabase rasmiy hujjatlari.\n")

doc.save('Davomat_Mustaqil_Ish_Raqamli_Ozgarish_V2.docx')
print("Tayyor!")
