require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const https = require('https');
const cron = require('node-cron');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());

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

    let kb = [['📅 Mening davomatim', '📅 Dars jadvali']];
    if (user.role === 'admin') {
      kb.push(['📢 Xabar tarqatish']);
    }

    ctx.reply(
      `Xush kelibsiz, ${user.full_name}!\n\nSiz tizimga muvaffaqiyatli kirdingiz. Endi davomat va dars jadvalini ko'rishingiz mumkin.`,
      Markup.keyboard(kb).resize()
    );

  } catch (err) {
    console.error(err);
    ctx.reply("Tizimda xatolik yuz berdi yoki ma'lumot topilmadi.");
  }
};

bot.on('contact', async (ctx) => {
  await handlePhoneSubmit(ctx, ctx.message.contact.phone_number);
});

bot.hears('📢 Xabar tarqatish', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('role').eq('telegram_id', tgId).single();
  if (!user || user.role !== 'admin') return ctx.reply("Sizda xabar yuborish huquqi yo'q.");
  
  if (!ctx.session) ctx.session = {};
  ctx.session.awaitingBroadcast = true;
  ctx.reply("Iltimos, barchaga yuboriladigan xabarni yuboring (Rasm, video yoki matn):\n\nBekor qilish uchun pastdagi tugmani bosing.", Markup.keyboard([['❌ Bekor qilish']]).resize());
});

bot.hears('❌ Bekor qilish', async (ctx) => {
  if (ctx.session) ctx.session.awaitingBroadcast = false;
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('full_name, role').eq('telegram_id', tgId).single();
  
  let kb = [['📅 Mening davomatim', '📅 Dars jadvali']];
  if (user && user.role === 'admin') kb.push(['📢 Xabar tarqatish']);
  
  ctx.reply("Xabar yuborish bekor qilindi.", Markup.keyboard(kb).resize());
});

bot.on('message', async (ctx, next) => {
  if (ctx.session && ctx.session.awaitingBroadcast) {
    ctx.session.awaitingBroadcast = false;
    
    const { data: users } = await supabase.from('users').select('telegram_id').not('telegram_id', 'is', null);
    
    let count = 0;
    if (users) {
      for (const u of users) {
        if (u.telegram_id === ctx.from.id.toString()) continue;
        try {
          await ctx.telegram.copyMessage(u.telegram_id, ctx.chat.id, ctx.message.message_id);
          count++;
        } catch(e) {}
      }
    }
    
    const tgId = ctx.from.id.toString();
    const { data: user } = await supabase.from('users').select('full_name, role').eq('telegram_id', tgId).single();
    let kb = [['📅 Mening davomatim', '📅 Dars jadvali']];
    if (user && user.role === 'admin') kb.push(['📢 Xabar tarqatish']);
    
    return ctx.reply(`Xabar ${count} ta foydalanuvchiga muvaffaqiyatli yuborildi!`, Markup.keyboard(kb).resize());
  }
  return next();
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

bot.hears('📅 Dars jadvali', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
  if (!user) return ctx.reply("Siz tizimga kirmagansiz. Iltimos, /start buyrug'i orqali raqamingizni yuboring.");

  const { data: student } = await supabase.from('students').select('group_id').eq('user_id', user.id).single();
  if (!student) return ctx.reply("Guruh topilmadi.");

  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('title, lesson_date')
    .eq('group_id', student.group_id)
    .order('lesson_date', { ascending: true })
    .limit(10); // Show upcoming or recent 10 lessons

  if (!lessonsData || lessonsData.length === 0) {
    return ctx.reply("Sizning guruhingiz uchun hali dars jadvali kiritilmagan.");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let text = "<b>Guruhning dars jadvali:</b>\n\n";
  lessonsData.forEach((s, idx) => {
    const lDate = new Date(s.lesson_date);
    lDate.setHours(0, 0, 0, 0);
    
    const diff = (lDate - today) / (1000 * 60 * 60 * 24);
    
    let dateStr = s.lesson_date;
    if (diff < 0) dateStr += ' (Tugadi)';
    else if (diff === 0) dateStr += ' (Bugun)';
    else if (diff === 1) dateStr += ' (Ertaga)';

    text += `🔹 ${idx + 1}-dars (${dateStr}): ${s.title}\n`;
  });

  ctx.replyWithHTML(text);
});

// Daily Report to Admin at 13:00
cron.schedule('0 13 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data: lessons } = await supabase.from('lessons').select('id, group_id').eq('lesson_date', today);
  if (!lessons || lessons.length === 0) return;
  
  const lessonIds = lessons.map(l => l.id);
  const uniqueGroups = new Set(lessons.map(l => l.group_id)).size;
  
  const { data: attendance } = await supabase.from('attendance').select('status').in('lesson_id', lessonIds);
  
  let present = 0;
  let absent = 0;
  if (attendance) {
    for (const a of attendance) {
      if (a.status === 'present' || a.status === 'late') present++;
      else absent++;
    }
  }

  const { data: admins } = await supabase.from('users').select('telegram_id').eq('role', 'admin').not('telegram_id', 'is', null);
  const reportText = `📊 <b>Kunlik Hisobot</b>\n\nBugun ${uniqueGroups} ta guruhda dars bo'ldi.\n🟢 Kelganlar: ${present} kishi\n🔴 Kelmaganlar: ${absent} kishi`;
  
  if (admins) {
    for (const a of admins) {
      try {
        await bot.telegram.sendMessage(a.telegram_id, reportText, { parse_mode: 'HTML' });
      } catch(e) {}
    }
  }
}, {
  timezone: "Asia/Tashkent"
});

// Daily Reminder at 22:10
cron.schedule('10 22 * * *', async () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: lessons } = await supabase.from('lessons').select('title, group_id').eq('lesson_date', tomorrowStr);
  if (!lessons || lessons.length === 0) return;

  for (const lesson of lessons) {
    const { data: students } = await supabase.from('students').select('user_id').eq('group_id', lesson.group_id);
    if (!students) continue;

    for (const st of students) {
      const { data: u } = await supabase.from('users').select('telegram_id').eq('id', st.user_id).single();
      if (u && u.telegram_id) {
        try {
          await bot.telegram.sendMessage(u.telegram_id, `🔔 Eslatma: Ertaga (${tomorrowStr}) sizda dars bor: ${lesson.title}`);
        } catch(e) {
          console.error('Failed to send reminder to', u.telegram_id);
        }
      }
    }
  }
}, {
  timezone: "Asia/Tashkent"
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
