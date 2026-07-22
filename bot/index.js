require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const https = require('https');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    "Assalomu alaykum! Davomat tizimi botiga xush kelibsiz.\n\nIltimos, tizimga kirish uchun quyidagi tugma orqali telefon raqamingizni yuboring:",
    Markup.keyboard([
      Markup.button.contactRequest("📱 Raqamni yuborish")
    ]).resize()
  );
});

const handlePhoneSubmit = async (ctx, phoneStr) => {
  let phone = phoneStr.replace(/\\s+/g, ''); // Remove spaces
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }
  if (!phone.startsWith('+998')) {
     if (phone.startsWith('998')) {
        phone = '+' + phone;
     }
  }

  const tgId = ctx.from.id.toString();

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('phone', phone)
      .single();

    if (error || !user) {
      return ctx.reply("Kechirasiz, sizning raqamingiz tizimda topilmadi. Iltimos o'qituvchingizga murojaat qiling.", Markup.removeKeyboard());
    }

    await supabase.from('users').update({ telegram_id: tgId }).eq('id', user.id);

    ctx.reply(
      `Xush kelibsiz, ${user.full_name}!\n\nSiz tizimga muvaffaqiyatli kirdingiz. Endi davomat va dars mavzularini ko'rishingiz mumkin.`,
      Markup.keyboard([
        ['📅 Mening davomatim', '📚 Dars mavzulari']
      ]).resize()
    );

  } catch (err) {
    console.error(err);
    ctx.reply("Tizimda xatolik yuz berdi yoki ma'lumot topilmadi.");
  }
};

bot.on('contact', async (ctx) => {
  await handlePhoneSubmit(ctx, ctx.message.contact.phone_number);
});

bot.on('text', async (ctx, next) => {
  const text = ctx.message.text;
  console.log("Received text: ", text);
  // If it looks like an Uzbek phone number
  if (/^\\+?998\\d{9}$/.test(text.replace(/\\s+/g, ''))) {
     console.log("Matched phone pattern!");
     await handlePhoneSubmit(ctx, text);
  } else {
     return next();
  }
});

bot.hears('📅 Mening davomatim', async (ctx) => {
  const tgId = ctx.from.id.toString();
  
  // Find user by tgId
  const { data: user } = await supabase.from('users').select('id, full_name').eq('telegram_id', tgId).single();
  
  if (!user) {
    return ctx.reply("Siz tizimga kirmagansiz. Iltimos, /start buyrug'i orqali raqamingizni yuboring.");
  }

  // Get student info
  const { data: student } = await supabase.from('students').select('id, group_id').eq('user_id', user.id).single();
  if (!student) return ctx.reply("Siz talabalar ro'yxatida yo'qsiz.");

  // Get recent 5 attendances
  const { data: attendances } = await supabase
    .from('attendance')
    .select(`
      status,
      lessons ( lesson_date, title )
    `)
    .eq('student_id', student.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!attendances || attendances.length === 0) {
    return ctx.reply("Sizda hali davomat ma'lumotlari yo'q.");
  }

  let text = "<b>So'nggi davomat natijalaringiz:</b>\n\n";
  attendances.forEach(a => {
     let statusText = 'Noma\'lum';
     if (a.status === 'present') statusText = '🟢 Keldi';
     else if (a.status === 'absent' || a.status === 'unexcused') statusText = '🔴 Kelmadi';
     else if (a.status === 'late') statusText = '🟡 Kech qoldi';
     else if (a.status === 'excused') statusText = '🔵 Sababli';

     text += `📅 ${a.lessons?.lesson_date || ''} - ${statusText}\n`;
  });

  ctx.replyWithHTML(text);
});

bot.hears('📚 Dars mavzulari', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
  if (!user) return ctx.reply("Siz tizimga kirmagansiz. Iltimos, /start buyrug'i orqali raqamingizni yuboring.");

  const { data: student } = await supabase.from('students').select('group_id').eq('user_id', user.id).single();
  if (!student) return ctx.reply("Guruh topilmadi.");

  const { data: syllabuses } = await supabase
    .from('syllabuses')
    .select('*')
    .eq('group_id', student.group_id)
    .order('day_number', { ascending: true });

  if (!syllabuses || syllabuses.length === 0) {
    return ctx.reply("Sizning guruhingiz uchun hali dars dasturi kiritilmagan.");
  }

  let text = "<b>Guruhning dars dasturi:</b>\n\n";
  syllabuses.forEach(s => {
    text += `🔹 ${s.day_number}-kun: ${s.topic_title}\n`;
  });

  ctx.replyWithHTML(text);
});

bot.launch().then(() => {
  console.log("Bot ishlashni boshladi...");
}).catch(err => {
  console.error("Bot ishga tushishda xatolik:", err);
});

// Express Server for Render Web Service port binding and keep-alive
const app = express();
app.get('/', (req, res) => {
  res.send('Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Keep-alive ping every 14 minutes (Render sleeps after 15 mins of inactivity)
  setInterval(() => {
    https.get('https://davomat-3sap.onrender.com', (res) => {
      console.log(`Keep-alive ping sent, status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('Keep-alive ping error:', err.message);
    });
  }, 14 * 60 * 1000); // 14 minutes
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
