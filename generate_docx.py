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

sub_title = doc.add_paragraph("Mavzu: Raqamli o'zgarish va innovatsion g'oya: Tashkilotda avtomatlashtirilgan davomat tizimini joriy etish")
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
doc.add_paragraph("  2.1. Telegram Bot (Ma'lumot kiritish qismi)......................................................6")
doc.add_paragraph("  2.2. Admin Panel (Boshqaruv va tahlil qismi)...................................................7")
doc.add_paragraph("  2.3. Supabase (Ma'lumotlar bazasi va xavfsizlik)...............................................8")
doc.add_paragraph("3-BOB. NEGA AYNAN SHU TIZIM VA RAQAMLI KO'RSATKICHLAR?.......................9")
doc.add_paragraph("XULOSA.....................................................................................................11")
doc.add_page_break()

# Page 3: Kirish
add_heading("KIRISH", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("Hozirgi globallashuv va axborot texnologiyalari jadal rivojlanayotgan davrda har qanday tashkilotning muvaffaqiyati uning qay darajada raqamlashtirilganligiga bog'liq. An'anaviy, qog'ozbozlikka asoslangan boshqaruv usullari o'z o'rnini tezkor, xavfsiz va avtomatlashtirilgan tizimlarga bo'shatib bermoqda.\n")
doc.add_paragraph("Ushbu mustaqil ishning asosiy mavzusi tashkilotda xodimlar yoki o'quvchilar davomatini nazorat qilish jarayonini raqamli transformatsiya qilish, ya'ni avtomatlashtirilgan davomat tizimini joriy etishdan iborat. Davomat - har qanday ta'lim muassasasi yoki korxona uchun intizom va samaradorlikning asosiy o'lchovidir. Afsuski, ko'pgina joylarda bu jarayon hanuzgacha qog'oz jurnallar orqali yuritiladi.\n")
doc.add_paragraph("Bu esa o'z navbatida qator muammolarni keltirib chiqaradi: ma'lumotlarning yo'qolish xavfi, hisobotlarni tayyorlash uchun soatlab vaqt sarflanishi, inson omili tufayli yuzaga keladigan xatolar va shaffoflikning yo'qligi. Biz taklif etayotgan innovatsion g'oya - Telegram bot, Next.js admin panel va Supabase ma'lumotlar bazasidan iborat integrallashgan tizim bo'lib, bu muammolarni to'liq bartaraf etadi.\n")
doc.add_paragraph("Raqamli o'zgarish nafaqat qog'ozdan voz kechish, balki qaror qabul qilish jarayonini tezlashtirish, resurslarni to'g'ri taqsimlash va tashkilotning umumiy samaradorligini keskin oshirish imkonini beradi. Ushbu hujjatda tizimning ishlash mexanizmi, har bir bo'limning aniq vazifasi va uning tashkilotga keltiradigan iqtisodiy hamda vaqt jihatidan foydalari aniq raqamlar yordamida tahlil qilinadi.\n")
doc.add_page_break()

# Page 4: 1-BOB
add_heading("1-BOB. INNOVATSION G'OYA VA TIZIMNING ASOSIY MAQSADI", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("Innovatsion g'oya deganda, odatda, butunlay yangi narsa yaratish tushuniladi. Biroq, mavjud jarayonlarni eng zamonaviy texnologiyalar yordamida tubdan optimallashtirish ham haqiqiy innovatsiya hisoblanadi. Davomat tizimi bo'yicha bizning g'oyamiz - o'qituvchi yoki xodimlar uchun eng qulay va tanish bo'lgan interfeys (Telegram) orqali kiritilgan ma'lumotlarni, rahbariyat uchun eng zamonaviy va tahliliy interfeys (Web Admin Panel) orqali vizualizatsiya qilishdir.\n")
doc.add_paragraph("Asosiy maqsadlar quyidagilardan iborat:\n"
                  "1. Vaqtni tejash: Jurnal to'ldirish va uni hisoblashga ketadigan yuzlab soatlarni qisqartirish.\n"
                  "2. Shaffoflikni ta'minlash: Har bir xodim/o'quvchining davomati real vaqtda bazaga tushishi va uni o'zgartirib bo'lmasligi.\n"
                  "3. Ekologik toza yondashuv: Har yili yuzlab qog'oz jurnallar xarid qilishni to'xtatish (Zero Paper siyosati).\n"
                  "4. Avtomatik tahlil: Inson omilisiz, qaysi guruhda yoki xodimda pasayish borligini grafiklar orqali darhol aniqlash.\n")
doc.add_paragraph("Bu tizim an'anaviy lokal (offline) dasturlardan farqli o'laroq, bulutli (cloud) texnologiyalarga asoslangan. Bu degani, tizim istalgan joydan, istalgan qurilmadan tez va xavfsiz ishlaydi. Bu tashkilot uchun haqiqiy ma'nodagi raqamli evolyutsiyadir.\n")
doc.add_page_break()

# Page 5: 2-BOB (Telegram Bot)
add_heading("2-BOB. TIZIM QISMLARI VA ULARNING VAZIFALARI", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
add_heading("2.1. Telegram Bot (Ma'lumot kiritish qismi)", 2)
doc.add_paragraph("Tizimning birinchi va eng faol ishlatiladigan bo'limi bu Telegram Bot hisoblanadi. Node.js va Telegraf kutubxonasi yordamida yaratilgan ushbu bot foydalanuvchilar (masalan, o'qituvchilar yoki bo'lim boshliqlari) uchun ma'lumot kiritish darchasi vazifasini bajaradi.\n")
doc.add_paragraph("Vazifalari:\n"
                  "- Shaxsni tasdiqlash (Autentifikatsiya): Faqatgina ro'yxatdan o'tgan va ruxsati bor xodimlargina botdan foydalana oladi.\n"
                  "- Guruh yoki bo'limlarni tanlash: O'qituvchi o'ziga biriktirilgan guruhlarni interaktiv tugmalar (Inline keyboard) orqali tanlaydi.\n"
                  "- Davomat belgilash: O'quvchilar ro'yxati chiqadi va 'Keldi' / 'Kelmadi' / 'Sababli' kabi tugmalar orqali soniyalarda davomat belgilanadi.\n"
                  "- Xabarnomalar (Notifications): node-cron yordamida bot belgilangan vaqtda o'qituvchiga 'Davomatni belgilash esdan chiqmasin' deb avtomatik eslatma yuboradi.\n")
doc.add_paragraph("Nega aynan Telegram? O'zbekiston sharoitida Telegram eng ommabop dastur hisoblanadi. O'qituvchilar yangi ilova yuklab olishi yoki murakkab saytlarga kirishi shart emas. Tanish interfeys orqali ishlash tezligini 10 barobarga oshiradi.\n")

add_placeholder("TELEGRAM BOT EKRANIDAN SKRINSHOT (Davomat belgilash jarayoni)")
doc.add_page_break()

# Page 6: Admin Panel
add_heading("2.2. Admin Panel (Boshqaruv va tahlil qismi)", 2)
doc.add_paragraph("Tizimning yuragi va rahbariyat ish stoli - bu Next.js yordamida yozilgan Web Admin Paneldir. Bot orqali kiritilgan barcha ma'lumotlar real vaqtda ushbu panelga yetib keladi.\n")
doc.add_paragraph("Vazifalari:\n"
                  "- Dashboard (Asosiy oyna): Tashkilot bo'yicha umumiy holatni bitta ekranda ko'rsatish. Bugun nechta odam keldi, nechtasi yo'q.\n"
                  "- Statistik vizualizatsiya: 'recharts' kutubxonasi yordamida chiroyli va tushunarli grafiklar chizish. Oylik, haftalik o'sish va tushish dinamikasini tahlil qilish.\n"
                  "- Excel va PDF eksport: 'exceljs' va 'jspdf' yordamida 1 soniyada rasmiy hisobotlarni shakllantirish va chop etishga tayyorlash.\n"
                  "- Foydalanuvchilarni boshqarish: Yangi o'qituvchi qo'shish, ro'yxatdan o'chirish, guruhlarni tahrirlash kabi barcha CRUD (Create, Read, Update, Delete) amallari qilinadi.\n")
doc.add_paragraph("Admin panelning ahamiyati shundaki, u rahbarga makromenajment qilish imkonini beradi. Qog'oz titkilab o'tirmasdan, qaysi guruh muammoli ekanligini qizil grafiklar orqali ko'rib, tezkor qaror qabul qiladi.\n")

add_placeholder("ADMIN PANEL DASHBOARD SKRINSHOTI (Grafiklar va statistika)")
doc.add_page_break()

# Page 7: Supabase
add_heading("2.3. Supabase (Ma'lumotlar bazasi va xavfsizlik)", 2)
doc.add_paragraph("Tizimning poydevori - ma'lumotlar qanday va qayerda saqlanishidir. Loyihada an'anaviy serverlar o'rniga zamonaviy BaaS (Backend as a Service) yechimi bo'lgan Supabase tanlangan.\n")
doc.add_paragraph("Vazifalari:\n"
                  "- Relyatsion ma'lumotlar bazasi: Barcha foydalanuvchilar, guruhlar va davomat yozuvlari qat'iy tartibda PostgreSQL bazasida saqlanadi.\n"
                  "- Real-time (Haqiqiy vaqt rejimida ishlash): O'qituvchi botda tugmani bosgan zaxoti, admin panelni yangilamasdan turib ham raqamlar o'zgaradi.\n"
                  "- Xavfsizlik (RLS - Row Level Security): Ma'lumotlarga ruxsatsiz kirishning oldini oladi. Har bir ma'lumot shifrlangan holda saqlanadi.\n"
                  "- Avtomatik zahiralash (Backup): Odatdagi qog'oz jurnallar yonib ketishi yoki yo'qolishi mumkin, biroq Supabase dagi ma'lumotlar bulutli serverlarda avtomatik zahiralanadi va 10 yildan so'ng ham bir zumda topiladi.\n")

add_placeholder("SUPABASE BAZASI YOHUD JADVAL TUZILISHI SKRINSHOTI")
doc.add_page_break()

# Page 8: 3-BOB
add_heading("3-BOB. NEGA AYNAN SHU TIZIM VA RAQAMLI KO'RSATKICHLAR?", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("Tashkilotda ushbu tizimning ishlatilishi shunchaki 'qulaylik' emas, balki strategik raqamli o'zgarishdir. Keling, tizim keltiradigan iqtisodiy va resurs tejamkorligini aniq raqamlar bilan tahlil qilamiz.\n")

doc.add_paragraph("1. Vaqt tejamkorligi tahlili (Time Efficiency):\n"
                  "- An'anaviy usulda: 1 ta guruh davomatini jurnalga yozib chiqish o'rtacha 5 daqiqa. Agar tashkilotda 100 ta guruh bo'lsa: 100 x 5 = 500 daqiqa (8.3 soat) HARKUNI sarflanadi. Oyiga bu ~200 soat demakdir.\n"
                  "- Bizning tizimda: Telegram bot orqali davomat belgilash 30 soniya. 100 ta guruh uchun 50 daqiqa. \n"
                  "- Natija: Har oyda 180+ ish soati tejaladi. Rahbariyat esa hisobot tuzish uchun oy oxirida 3 kun emas, atigi 1 marta 'Eksport' tugmasini bosish uchun 5 soniya sarflaydi. Vaqt tejamkorligi - 90% dan yuqori!\n")

doc.add_paragraph("2. Moliyaviy va ekologik ta'sir (Cost & Eco Impact):\n"
                  "- Har yili 100 lab qalin jurnallar, ruchkalar sotib olish xarajatlari to'liq qisqaradi (100% tejamkorlik).\n"
                  "- Tashkilot to'liq 'Zero-Paper' (qog'ozsiz) ish yuritishga o'tadi, bu esa atrof-muhitni asrashga qo'shilgan ulkan innovatsion hissadir.\n")
doc.add_page_break()

# Page 9: Muammolar va Yechimlar
add_heading("Hozirda bu tizimni nima uchun ishlatyapmiz?", 2)
doc.add_paragraph("Ayni vaqtda tizim faol joriy etish va ma'lumotlarni import qilish bosqichida (loyihada mavjud bo'lgan excel/docx ma'lumotlarni o'qish skriptlari bunga dalil). \nBiz bu tizimni quyidagi muhim omillar uchun ishlatyapmiz:\n\n"
                  "1. Ma'lumotlar aniqligini ta'minlash: Qo'lda qilingan ishlarda inson omili sabab xatolar ko'p bo'ladi. Tizim esa matematik aniqlikda hisoblaydi.\n"
                  "2. Masofaviy nazorat: Tashkilot rahbari xizmat safarida bo'lsa ham, admin panel orqali o'quv markazi/maktabdagi joriy davomat holatini telefoni orqali nazorat qila oladi.\n"
                  "3. Raqobatbardoshlik: Ota-onalar yoki mijozlarga farzandi/xodimi haqida SMS yoki Telegram orqali xabarnoma berish tashkilot nufuzini keskin oshiradi.\n")

add_placeholder("PDF YOHUD EXCEL HISOBOT YUKLAB OLINGANIDAN KEYINGI HOLAT SKRINSHOTI")
doc.add_page_break()

# Page 10: Xulosa
add_heading("XULOSA", 1).alignment = WD_ALIGN_PARAGRAPH.CENTER
doc.add_paragraph("Xulosa qilib aytganda, ishlab chiqilgan va joriy qilinayotgan ushbu Davomat Tizimi shunchaki kodlar jamlanmasi emas, balki tashkilotning boshqaruv falsafasini o'zgartiruvchi kuchli raqamli vositadir. \n")
doc.add_paragraph("Mustaqil ish doirasida o'rganilgan ushbu innovatsion g'oya shuni ko'rsatadiki, Telegram bot orqali axborot kiritishning qulayligi, Next.js orqali ma'lumotlarni kuchli tahlil qilish va Supabase orqali ularni xavfsiz saqlash - ideal ekotizimni yaratadi.\n")
doc.add_paragraph("Aniq raqamlar ko'rsatib turibdiki, tizim oyiga yuzlab soatlarni tejaydi, inson omilini nolga tushiradi va qaror qabul qilish tezligini maksimal darajaga ko'taradi. Qog'oz jurnallardan voz kechish orqali tashkilot raqamli o'zgarish (Digital Transformation) jarayonini muvaffaqiyatli yakunlaydi. Ushbu tizim kelajakda boshqa modullarni (masalan, to'lovlar monitoringi, xodimlar KPI tizimi) qo'shish orqali yanada kengayish potentsialiga ega bo'lgan ulkan platformaning ilk va eng mustahkam qadami hisoblanadi.\n")

doc.add_paragraph('\n\n\n\n\n')
add_heading("FOYDALANILGAN ADABIYOTLAR", 2)
doc.add_paragraph("1. Node.js va Telegram Bot API rasmiy hujjatlari.\n"
                  "2. Next.js va React.js freymvorki qo'llanmalari.\n"
                  "3. Supabase - ochiq kodli Firebase alternativasi rasmiy hujjatlari.\n"
                  "4. Tashkilotni raqamlashtirish tamoyillari (Digital Transformation Strategies).\n")

doc.save('Davomat_Mustaqil_Ish_Raqamli_Ozgarish.docx')
print("Tayyor!")
