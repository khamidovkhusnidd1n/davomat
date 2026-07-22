import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@supabase/supabase-js';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Bot Commands
bot.start((ctx) => {
  ctx.reply(
    "Assalomu alaykum! Malaka oshirish markazi tizimiga xush kelibsiz.\n\nDavomat va dars jadvallaringizni qabul qilib turish uchun telefon raqamingizni yuboring:",
    Markup.keyboard([
      Markup.button.contactRequest("📱 Raqamni yuborish")
    ]).resize().oneTime()
  );
});

bot.on('contact', async (ctx) => {
  try {
    const contact = ctx.message.contact;
    const telegramId = ctx.from.id.toString();
    let phoneNumber = contact.phone_number;
    
    // Normalize phone number to match db (remove +, spaces, etc)
    if (phoneNumber.startsWith('+')) phoneNumber = phoneNumber.substring(1);
    
    // Yuborilgan raqam aynan o'zinikimi ekanligini tekshirish (o'zga raqamni forward qilsa o'tmaydi)
    if (contact.user_id && contact.user_id !== ctx.from.id) {
      return ctx.reply("Iltimos, faqat o'zingizning raqamingizni yuboring (pastdagi maxsus tugmani bosing).");
    }

    // Supabase dan qidiramiz (phone formatlari farq qilishi mumkin, shuning uchun iloji boricha o'xshashlikka tekshiramiz)
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, role')
      .ilike('phone', `%${phoneNumber.slice(-9)}%`);

    if (error) throw error;

    if (!users || users.length === 0) {
      return ctx.reply("Kechirasiz, sizning raqamingiz bazadan topilmadi. Iltimos, adminlarga murojaat qiling va aynan shu raqamingizni tizimga kiritishlarini so'rang.");
    }

    // Topildi, endi telegram_id ni saqlab qo'yamiz
    const user = users[0];
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ telegram_id: telegramId })
      .eq('id', user.id);

    if (updateError) throw updateError;

    ctx.reply(`Ajoyib, ${user.full_name}!\n\nSizning hisobingiz muvaffaqiyatli ulandi. Endi har kunlik dars mavzusi va haftalik davomat statistikasini shu yerda qabul qilib olasiz.`, Markup.removeKeyboard());
    
  } catch (err) {
    console.error("Telegram Auth Error:", err);
    ctx.reply("Xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.");
  }
});

bot.help((ctx) => ctx.reply('Yordam uchun adminga murojaat qiling.'));

// Webhook Handler for Next.js App Router
export async function POST(req) {
  try {
    const body = await req.json();
    await bot.handleUpdate(body);
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500 });
  }
}
