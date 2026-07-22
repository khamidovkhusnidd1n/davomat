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

    let kb = [
      ['📅 Mening davomatim', '📅 Dars jadvali'],
      ['🏆 Oylik reyting']
    ];
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
  
  let kb = [
    ['📅 Mening davomatim', '📅 Dars jadvali'],
    ['🏆 Oylik reyting']
  ];
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
    let kb = [
      ['📅 Mening davomatim', '📅 Dars jadvali'],
      ['🏆 Oylik reyting']
    ];
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

  let text = "📅 <b>Guruhning dars jadvali:</b>\n\n";
  lessonsData.forEach((s, idx) => {
    const lDate = new Date(s.lesson_date);
    lDate.setHours(0, 0, 0, 0);
    
    const diff = (lDate - today) / (1000 * 60 * 60 * 24);
    
    let icon = '⏳';
    let dateStr = s.lesson_date;

    if (diff < 0) {
      icon = '✅';
      dateStr = 'Tugadi';
    } else if (diff === 0) {
      icon = '🔥';
      dateStr = 'Bugun';
    } else if (diff === 1) {
      icon = '🚀';
      dateStr = 'Ertaga';
    }

    text += `${icon} <b>${idx + 1}-dars</b> (${dateStr}) — <i>${s.title}</i>\n`;
  });

  ctx.replyWithHTML(text);
});

bot.hears('🏆 Oylik reyting', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
  if (!user) return ctx.reply("Siz tizimga kirmagansiz.");

  const { data: student } = await supabase.from('students').select('group_id').eq('user_id', user.id).single();
  if (!student) return ctx.reply("Guruh topilmadi.");

  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const startOfMonth = `${year}-${month}-01T00:00:00.000Z`;
  const endOfMonth = new Date(year, date.getMonth() + 1, 1).toISOString();

  const { data: attendances } = await supabase
    .from('attendance')
    .select('student_id, status, students!inner(group_id, users(full_name))')
    .eq('status', 'present')
    .eq('students.group_id', student.group_id)
    .gte('created_at', startOfMonth)
    .lt('created_at', endOfMonth);

  if (!attendances || attendances.length === 0) {
    return ctx.reply("Bu oyda guruh bo'yicha yetarli ma'lumot yo'q.");
  }

  const counts = {};
  const names = {};
  attendances.forEach(a => {
    if (!counts[a.student_id]) {
      counts[a.student_id] = 0;
      names[a.student_id] = a.students.users.full_name;
    }
    counts[a.student_id]++;
  });

  const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  let text = `🏆 <b>Bu oydagi eng faol o'quvchilar:</b>\n\n`;
  for(let i=0; i<Math.min(3, sorted.length); i++) {
    const medals = ['🥇', '🥈', '🥉'];
    text += `${medals[i]} ${names[sorted[i]]}: ${counts[sorted[i]]} marta kelgan\n`;
  }
  
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

// End of Month Top Student Announcement (Runs daily at 18:00, triggers only on last day)
cron.schedule('0 18 * * *', async () => {
  const date = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getDate() !== 1) return; // Only run on last day of the month

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const startOfMonth = `${year}-${month}-01T00:00:00.000Z`;
  const endOfMonth = tomorrow.toISOString();

  const { data: studentsInfo } = await supabase
    .from('students')
    .select('id, group_id, user_id, users(full_name, telegram_id)');
  if (!studentsInfo) return;

  const { data: attendances } = await supabase
    .from('attendance')
    .select('student_id, status')
    .eq('status', 'present')
    .gte('created_at', startOfMonth)
    .lt('created_at', endOfMonth);
  if (!attendances) return;

  const groupScores = {};
  attendances.forEach(a => {
    const st = studentsInfo.find(s => s.id === a.student_id);
    if (!st) return;
    if (!groupScores[st.group_id]) groupScores[st.group_id] = {};
    if (!groupScores[st.group_id][a.student_id]) groupScores[st.group_id][a.student_id] = 0;
    groupScores[st.group_id][a.student_id]++;
  });

  for (const groupId in groupScores) {
    const scores = groupScores[groupId];
    const sorted = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    if (sorted.length === 0) continue;
    
    const topStudentId = sorted[0];
    const topStInfo = studentsInfo.find(s => s.id === topStudentId);
    if (!topStInfo) continue;
    
    const text = `🏆 <b>OY YAKUNI!</b>\n\nBu oyda guruhimizning eng faol o'quvchisi:\n🥇 <b>${topStInfo.users.full_name}</b> (${scores[topStudentId]} marta darsga qatnashdi!)\n\nTabriklaymiz! 🎉`;

    const groupStudents = studentsInfo.filter(s => s.group_id === groupId);
    for (const gs of groupStudents) {
      if (gs.users && gs.users.telegram_id) {
        try {
          await bot.telegram.sendMessage(gs.users.telegram_id, text, { parse_mode: 'HTML' });
        } catch(e) {}
      }
    }
  }
}, {
  timezone: "Asia/Tashkent"
});

// Daily Reminder at 15:00
cron.schedule('0 15 * * *', async () => {
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
