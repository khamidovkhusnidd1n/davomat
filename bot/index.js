require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const https = require('https');
const cron = require('node-cron');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.use((ctx, next) => {
  ctx.session = ctx.session || {};
  return next();
});

function getTashkentTime() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(new Date());
  const partMap = {};
  parts.forEach(p => partMap[p.type] = p.value);
  
  const year = partMap.year;
  const month = partMap.month;
  const day = partMap.day;
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);
  
  const tempDate = new Date(`${year}-${month}-${day}T12:00:00+05:00`);
  let dayOfWeek = tempDate.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7;
  
  return {
    dateStr: `${year}-${month}-${day}`,
    hour,
    minute,
    minutesFromMidnight: hour * 60 + minute,
    dayOfWeek
  };
}

bot.start((ctx) => {
  ctx.reply(
    "Assalomu alaykum! Davomat tizimi botiga xush kelibsiz.\n\nIltimos, tizimga kirish uchun quyidagi tugma orqali telefon raqamingizni yuboring:",
    Markup.keyboard([
      Markup.button.contactRequest("📱 Raqamni yuborish")
    ]).resize()
  );
});

bot.command('test_reminder', async (ctx) => {
  const text = `🔔 <b>ESLATMA (TEST):</b> Hurmatli <b>${ctx.from.first_name || 'Ustoz'}</b>, sizning <b>Rangtasvir 14-guruh</b> guruhingizda dars boshlanganiga <b>15 daqiqa</b> bo'ldi. Iltimos, dars davomatini belgilang.`;
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback("🟢 Davomat belgilash", `wiz_start:dummy-id`)]
  ]);
  await ctx.replyWithHTML(text, kb);
});

const handlePhoneSubmit = async (ctx, phoneStr) => {
  // Remove spaces, dashes, parentheses
  let phone = phoneStr.replace(/[\s\-\(\)]/g, '');
  if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }
  // Handle 998... without +
  if (!phone.startsWith('+998') && phone.startsWith('+') && phone.substring(1).startsWith('998')) {
    // already fine
  } else if (phone.startsWith('998')) {
    phone = '+' + phone;
  }

  const tgId = ctx.from.id.toString();

  try {
    // Try exact match first, then try without + prefix as fallback
    let { data: user, error } = await supabase
      .from('users')
      .select('id, full_name, role')
      .eq('phone', phone)
      .maybeSingle();

    // If not found, try without leading +
    if (!user) {
      const phoneNoPlus = phone.startsWith('+') ? phone.slice(1) : phone;
      const { data: user2 } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('phone', phoneNoPlus)
        .maybeSingle();
      if (user2) user = user2;
    }

    // If STILL not found, try a fuzzy match in case of spaces/dashes in DB
    if (!user) {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly) {
         const pattern = '%' + digitsOnly.split('').join('%') + '%';
         const { data: user3 } = await supabase
           .from('users')
           .select('id, full_name, role')
           .ilike('phone', pattern)
           .limit(1);
         if (user3 && user3.length > 0) user = user3[0];
      }
    }

    if (!user) {
      return ctx.reply("Kechirasiz, sizning raqamingiz tizimda topilmadi. Iltimos o'qituvchingizga murojaat qiling.", Markup.removeKeyboard());
    }

    await supabase.from('users').update({ telegram_id: tgId }).eq('id', user.id);

    let kb = [];
    if (user.role === 'nazoratchi') {
      kb = [
        ['📅 Mening darslarim', '📋 Guruhlarim ro\'yxati'],
        ['📊 Davomat hisobotlari']
      ];
    } else if (user.role === 'sysadmin' || user.role === 'admin') {
      kb = [
        ['📅 Mening davomatim', '📅 Dars jadvali'],
        ['🏆 Oylik reyting', '📢 Xabar tarqatish'],
        ['⚙️ Admin panel']
      ];
    } else if (user.role === 'tutor') {
      kb = [
        ['📅 Mening davomatim', '📅 Dars jadvali'],
        ['🏆 Oylik reyting'],
        ['📢 Xabar tarqatish']
      ];
    } else {
      kb = [
        ['📅 Mening davomatim', '📅 Dars jadvali'],
        ['🏆 Oylik reyting']
      ];
    }

    ctx.reply(
      `Xush kelibsiz, ${user.full_name}!\n\nSiz tizimga muvaffaqiyatli kirdingiz.`,
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

bot.hears('⚙️ Admin panel', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('role').eq('telegram_id', tgId).single();
  if (!user || (user.role !== 'admin' && user.role !== 'sysadmin')) return ctx.reply("Sizda admin huquqi yo'q.");
  
  const adminUrl = process.env.ADMIN_URL || 'https://davomat-admin.onrender.com';
  ctx.replyWithHTML(
    `⚙️ <b>Admin panel</b>\n\nQuyidagi havoladan admin paneliga kiring:`,
    Markup.inlineKeyboard([[
      Markup.button.url('🔗 Admin panelga kirish', adminUrl)
    ]])
  );
});

bot.hears('📢 Xabar tarqatish', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('role').eq('telegram_id', tgId).single();
  if (!user || (user.role !== 'admin' && user.role !== 'sysadmin' && user.role !== 'tutor')) return ctx.reply("Sizda xabar yuborish huquqi yo'q.");
  
  const { data: groups } = await supabase.from('groups').select('id, name').eq('status', 'active').order('name');
  if (!ctx.session) ctx.session = {};
  
  const buttons = [];
  buttons.push([Markup.button.callback('📢 Barcha guruhlarga', 'bc_target:all')]);
  if (groups) {
    groups.forEach(g => {
      buttons.push([Markup.button.callback(`👥 ${g.name}`, `bc_target:${g.id}`)]);
    });
  }
  
  ctx.reply("Xabarni kimlarga yubormoqchisiz? Guruhni tanlang:", Markup.inlineKeyboard(buttons));
  ctx.reply("Yoki bekor qilish tugmasini bosing:", Markup.keyboard([['❌ Bekor qilish']]).resize());
});

bot.action(/bc_target:(.+)/, async (ctx) => {
  const target = ctx.match[1];
  if (!ctx.session) ctx.session = {};
  
  let targetText = "Barcha guruhlarga";
  if (target !== 'all') {
    const { data: g } = await supabase.from('groups').select('name').eq('id', target).single();
    if (g) targetText = g.name;
  }

  ctx.session.awaitingBroadcast = { target, targetText };
  
  await ctx.editMessageText(`Siz **${targetText}** ni tanladingiz.\n\nIltimos, yuboriladigan xabarni yuboring (Rasm, video yoki matn):`, { parse_mode: 'Markdown' });
  await ctx.answerCbQuery();
});

bot.hears('❌ Bekor qilish', async (ctx) => {
  if (ctx.session) {
    ctx.session.awaitingBroadcast = false;
    ctx.session.awaitingAdhocTitle = null;
  }
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('full_name, role').eq('telegram_id', tgId).single();
  
  let kb = [];
  if (user && user.role === 'nazoratchi') {
    kb = [
      ['📅 Mening darslarim', '📋 Guruhlarim ro\'yxati'],
      ['📊 Davomat hisobotlari']
    ];
  } else if (user && (user.role === 'admin' || user.role === 'sysadmin')) {
    kb = [
      ['📅 Mening davomatim', '📅 Dars jadvali'],
      ['🏆 Oylik reyting', '📢 Xabar tarqatish'],
      ['⚙️ Admin panel']
    ];
  } else if (user && user.role === 'tutor') {
    kb = [
      ['📅 Mening davomatim', '📅 Dars jadvali'],
      ['🏆 Oylik reyting'],
      ['📢 Xabar tarqatish']
    ];
  } else {
    kb = [
      ['📅 Mening davomatim', '📅 Dars jadvali'],
      ['🏆 Oylik reyting']
    ];
  }
  
  ctx.reply("Bekor qilindi.", Markup.keyboard(kb).resize());
});

bot.on('message', async (ctx, next) => {
  if (ctx.session && ctx.session.awaitingAdhocTitle) {
    const title = ctx.message.text;
    const { groupId } = ctx.session.awaitingAdhocTitle;
    ctx.session.awaitingAdhocTitle = null;
    await startAdhocLesson(ctx, groupId, title);
    return;
  }

  if (ctx.session && ctx.session.awaitingBroadcast) {
    const target = ctx.session.awaitingBroadcast.target;
    const targetText = ctx.session.awaitingBroadcast.targetText || "Barchaga";
    ctx.session.awaitingBroadcast = null;
    
    let users = [];
    if (target === 'all') {
      const { data } = await supabase.from('users').select('telegram_id').not('telegram_id', 'is', null);
      users = data || [];
    } else {
      const { data: students } = await supabase.from('students').select('user_id').eq('group_id', target);
      if (students && students.length > 0) {
        const userIds = students.map(s => s.user_id);
        const { data } = await supabase.from('users').select('telegram_id').in('id', userIds).not('telegram_id', 'is', null);
        users = data || [];
      }
    }
    
    let count = 0;
    if (users && users.length > 0) {
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
    let kb = [];
    if (user && user.role === 'nazoratchi') {
      kb = [
        ['📅 Mening darslarim', '📋 Guruhlarim ro\'yxati'],
        ['📊 Davomat hisobotlari']
      ];
    } else if (user && (user.role === 'admin' || user.role === 'sysadmin')) {
      kb = [
        ['📅 Mening davomatim', '📅 Dars jadvali'],
        ['🏆 Oylik reyting', '📢 Xabar tarqatish'],
        ['⚙️ Admin panel']
      ];
    } else if (user && user.role === 'tutor') {
      kb = [
        ['📅 Mening davomatim', '📅 Dars jadvali'],
        ['🏆 Oylik reyting'],
        ['📢 Xabar tarqatish']
      ];
    } else {
      kb = [
        ['📅 Mening davomatim', '📅 Dars jadvali'],
        ['🏆 Oylik reyting']
      ];
    }
    
    return ctx.reply(`Xabar ${count} ta foydalanuvchiga muvaffaqiyatli yuborildi!`, Markup.keyboard(kb).resize());
  }
  return next();
});

bot.on('text', async (ctx, next) => {
  return next();
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

  const tashkentFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  });
  const parts = tashkentFormatter.formatToParts(new Date());
  const tObj = {};
  parts.forEach(p => tObj[p.type] = p.value);
  const todayStr = `${tObj.year}-${tObj.month}-${tObj.day}`;
  const currentHourStr = `${tObj.hour}:${tObj.minute}`;

  const { data: lessonsData } = await supabase
    .from('lessons')
    .select('title, lesson_date')
    .eq('group_id', student.group_id)
    .gte('lesson_date', todayStr)
    .order('lesson_date', { ascending: true })
    .limit(7);

  if (!lessonsData || lessonsData.length === 0) {
    return ctx.reply("Sizning guruhingiz uchun hali dars jadvali kiritilmagan.");
  }

  const { data: schedules } = await supabase.from('schedules').select('*').eq('group_id', student.group_id);

  let text = "📅 <b>Guruhning keyingi darslari:</b>\n\n";
  lessonsData.forEach((s) => {
    let dayOfWeek = new Date(s.lesson_date).getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const sch = schedules?.find(x => x.day_of_week === dayOfWeek);
    const startTime = sch ? sch.start_time.substring(0, 5) : '--:--';
    const endTime = sch ? sch.end_time.substring(0, 5) : '--:--';

    let icon = '⏳';
    let dateStr = s.lesson_date;

    if (s.lesson_date === todayStr) {
      if (currentHourStr > endTime) {
        icon = '✅';
        dateStr = 'Bugun (Tugadi)';
      } else if (currentHourStr >= startTime && currentHourStr <= endTime) {
        icon = '🔴';
        dateStr = 'Bugun (Ketyapti)';
      } else {
        icon = '🔥';
        dateStr = 'Bugun';
      }
    } else {
      const diff = Math.round((new Date(s.lesson_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        icon = '🚀';
        dateStr = 'Ertaga';
      }
    }

    text += `${icon} <b>${dateStr}, soat ${startTime}</b> — <i>${s.title}</i>\n`;
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

// Retraining Course Absence Warnings (Runs daily at 18:30)
cron.schedule('30 18 * * *', async () => {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayLessons } = await supabase
    .from('lessons')
    .select('id')
    .eq('lesson_date', today);

  if (!todayLessons || todayLessons.length === 0) return;
  const lessonIds = todayLessons.map(l => l.id);

  // Get all attendances marked today as absent, unexcused or late
  const { data: todayAbsences } = await supabase
    .from('attendance')
    .select('student_id')
    .in('lesson_id', lessonIds)
    .in('status', ['absent', 'unexcused', 'late']);

  if (!todayAbsences || todayAbsences.length === 0) return;

  const affectedStudentIds = [...new Set(todayAbsences.map(a => a.student_id))];

  for (const stId of affectedStudentIds) {
    // Count ALL absences/lates for this student
    const { data: allAbs } = await supabase
      .from('attendance')
      .select('id, status, late_hours, lessons(lesson_date)')
      .eq('student_id', stId)
      .in('status', ['absent', 'unexcused', 'late']);

    if (!allAbs) continue;

    let totalHoursBeforeToday = 0;
    let totalHoursIncludingToday = 0;

    for (const record of allAbs) {
      const isToday = record.lessons?.lesson_date === today;
      let hours = 0;
      if (record.status === 'absent' || record.status === 'unexcused') {
        hours = 6;
      } else if (record.status === 'late' && record.late_hours > 0) {
        hours = record.late_hours;
      }

      totalHoursIncludingToday += hours;
      if (!isToday) {
        totalHoursBeforeToday += hours;
      }
    }

    const { data: stInfo } = await supabase
      .from('students')
      .select('users(full_name, telegram_id), groups(education_type)')
      .eq('id', stId)
      .single();

    if (!stInfo || !stInfo.users || !stInfo.users.telegram_id) continue;
    const eduType = stInfo.groups?.education_type || 'qayta_tayyorlov';

    // Check if we crossed any thresholds TODAY
    let thresholdCrossed = 0;
    if (eduType === 'malaka_oshirish') {
      if (totalHoursBeforeToday < 4 && totalHoursIncludingToday >= 4) thresholdCrossed = 4;
      else if (totalHoursBeforeToday < 8 && totalHoursIncludingToday >= 8) thresholdCrossed = 8;
      else if (totalHoursBeforeToday < 12 && totalHoursIncludingToday >= 12) thresholdCrossed = 12;
      else if (totalHoursBeforeToday < 16 && totalHoursIncludingToday >= 16) thresholdCrossed = 16;
      else if (totalHoursBeforeToday < 18 && totalHoursIncludingToday >= 18) thresholdCrossed = 18;
    } else {
      if (totalHoursBeforeToday < 12 && totalHoursIncludingToday >= 12) thresholdCrossed = 12;
      else if (totalHoursBeforeToday < 24 && totalHoursIncludingToday >= 24) thresholdCrossed = 24;
      else if (totalHoursBeforeToday < 36 && totalHoursIncludingToday >= 36) thresholdCrossed = 36;
    }

    if (thresholdCrossed > 0) {
      let text = '';
      const name = stInfo.users.full_name;
      const total = totalHoursIncludingToday;

      if (eduType === 'malaka_oshirish') {
        if (thresholdCrossed === 4) {
          text = `⚠️ Ogohlantirish: Hurmatli ${name}, siz ${total} soat dars qoldirdingiz. Malaka oshirish kursida 18 soat dars qoldirilganda tinglovchilar safidan chetlashtiriladi.`;
        } else if (thresholdCrossed === 8) {
          text = `🚨 Qat'iy Ogohlantirish: Hurmatli ${name}, siz ${total} soat dars qoldirdingiz. Agar yana ${18 - total} soat qoldirsangiz, chetlashtirilasiz!`;
        } else if (thresholdCrossed === 12) {
          text = `🔴 Jiddiy Ogohlantirish: Hurmatli ${name}, siz ${total} soat dars qoldirdingiz. Faqat ${18 - total} soat qoldi!`;
        } else if (thresholdCrossed === 16) {
          text = `🚨 Oxirgi Ogohlantirish: Hurmatli ${name}, siz ${total} soat dars qoldirdingiz. Yana 2 soat qoldi, chetlashtirilasiz!`;
        } else if (thresholdCrossed === 18) {
          text = `❌ CHETLASHTIRISH XAVFI: Hurmatli ${name}, siz ${total} soat uzrli sababsiz qoldirdingiz! Malaka oshirish kursi nizomiga muvofiq, chetlashtirishga tavsiya etilasiz.`;
        }
      } else {
        if (thresholdCrossed === 12) {
          text = `⚠️ <b>Ogohlantirish:</b> Hurmatli ${name}, siz jami <b>${total} soat</b> dars qoldirdingiz. Eslatib o'tamiz, qayta tayyorlash kurslarida 36 soat dars qoldirilganda tinglovchilar safidan chetlashtiriladi.`;
        } else if (thresholdCrossed === 24) {
          text = `🚨 <b>Qat'iy Ogohlantirish:</b> Hurmatli ${name}, siz jami <b>${total} soat</b> dars qoldirdingiz. Agar yana ${36 - total} soat dars qoldirsangiz, nizomga asosan kursdan chetlashtirilasiz!`;
        } else if (thresholdCrossed === 36) {
          text = `❌ <b>CHETLASHTIRISH XAVFI:</b> Hurmatli ${name}, siz jami <b>${total} soat</b> uzrli sababsiz qoldirdingiz! Qayta tayyorlash kursi nizomiga muvofiq, siz tinglovchilar safidan chetlashtirishga tavsiya etilasiz.`;
        }
      }

      try {
        await bot.telegram.sendMessage(stInfo.users.telegram_id, text, { parse_mode: 'HTML' });
      } catch(e) {
        console.error('Failed to send absence warning to', stInfo.users.telegram_id);
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

// --- O'qituvchi funksiyalari (Telegram Bot) ---

bot.hears('📅 Mening darslarim', async (ctx) => {
  try {
    const tgId = ctx.from.id.toString();
    const { data: user } = await supabase.from('users').select('id, role').eq('telegram_id', tgId).single();
    if (!user || user.role !== 'nazoratchi') return ctx.reply("Siz o'qituvchi roliga ega emassiz.");

    const tz = getTashkentTime();
    let dayOfWeek = tz.dayOfWeek;
    const todayStr = tz.dateStr;

    const { data: groups } = await supabase.from('groups').select('id, name').eq('status', 'active').eq('nazoratchi_id', user.id);
    if (!groups || groups.length === 0) return ctx.reply("Sizga biriktirilgan guruhlar topilmadi.");

    const groupIds = groups.map(g => g.id);

    // 1. Fetch today's already created/imported lessons
    const { data: todayLessons } = await supabase
      .from('lessons')
      .select('id, group_id, title, schedule_id, start_time, end_time, groups(name)')
      .eq('lesson_date', todayStr)
      .in('group_id', groupIds);

    // 2. Fetch today's scheduled lessons
    const { data: schedules } = await supabase
      .from('schedules')
      .select('*, groups(id, name, course_name)')
      .in('group_id', groupIds)
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true });

    const options = [];
    const existingScheduleIds = new Set();

    if (todayLessons) {
      for (const les of todayLessons) {
        options.push({
          type: 'existing',
          lessonId: les.id,
          groupId: les.group_id,
          title: les.title,
          displayName: `🏫 ${les.groups?.name}: ${les.title}`
        });
        if (les.schedule_id) {
          existingScheduleIds.add(les.schedule_id);
        }
      }
    }

    if (schedules) {
      for (const sch of schedules) {
        if (!existingScheduleIds.has(sch.id)) {
          // Check for time overlap with existing lessons for the same group
          let hasOverlap = false;
          for (const les of todayLessons) {
            if (les.group_id === sch.group_id && les.start_time && les.end_time) {
              const lesStart = les.start_time;
              const lesEnd = les.end_time;
              const schStart = sch.start_time;
              const schEnd = sch.end_time;
              
              if (lesStart < schEnd && schStart < lesEnd) {
                hasOverlap = true;
                break;
              }
            }
          }

          if (hasOverlap) continue;

          const title = `${sch.groups.course_name || sch.groups.name} (${sch.start_time.substring(0, 5)} - ${sch.end_time.substring(0, 5)})`;
          options.push({
            type: 'schedule',
            scheduleId: sch.id,
            groupId: sch.group_id,
            title: title,
            displayName: `🏫 ${sch.groups.name} (${sch.start_time.substring(0, 5)}-${sch.end_time.substring(0, 5)})`
          });
        }
      }
    }

    if (options.length === 0) {
      return ctx.reply("Bugun guruhlaringizda darslar rejalashtirilmagan.");
    }

    ctx.session.todayLessons = options;

    const buttons = options.map((opt, idx) => [
      Markup.button.callback(opt.displayName, `start_lesson_opt:${idx}`)
    ]);

    ctx.reply("Bugungi darslaringiz. Davomatni boshlash uchun darsni tanlang:", Markup.inlineKeyboard(buttons));
  } catch (e) {
    console.error(e);
    ctx.reply("Xatolik yuz berdi.");
  }
});

bot.action(/start_lesson_opt:(\d+)/, async (ctx) => {
  try {
    const idx = parseInt(ctx.match[1], 10);
    const options = ctx.session.todayLessons;
    if (!options || !options[idx]) {
      return ctx.answerCbQuery("Dars ma'lumotlari topilmadi, iltimos qaytadan darslar ro'yxatini oching.");
    }

    const opt = options[idx];
    let lessonId = opt.lessonId;

    if (opt.type === 'schedule') {
      const { data, error: rpcError } = await supabase.rpc('get_or_create_today_lesson', {
        p_group_id: opt.groupId,
        p_lesson_title: opt.title,
        p_schedule_id: opt.scheduleId
      });
      if (rpcError) throw rpcError;
      lessonId = data;

      // Sync teacher_id and subject_id from schedule
      const { data: schData } = await supabase
        .from('schedules')
        .select('teacher_id, subject_id')
        .eq('id', opt.scheduleId)
        .single();
      if (schData) {
        await supabase
          .from('lessons')
          .update({
            teacher_id: schData.teacher_id,
            subject_id: schData.subject_id
          })
          .eq('id', lessonId);
      }
    }

    await startAttendanceWizard(ctx, opt.groupId, lessonId, opt.title);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
    ctx.reply("Xatolik yuz berdi: " + err.message);
  }
});

bot.hears('📋 Guruhlarim ro\'yxati', async (ctx) => {
  try {
    const tgId = ctx.from.id.toString();
    const { data: user } = await supabase.from('users').select('id, role').eq('telegram_id', tgId).single();
    if (!user || user.role !== 'nazoratchi') return ctx.reply("Siz o'qituvchi roliga ega emassiz.");

    const { data: groups } = await supabase.from('groups').select('id, name, course_name').eq('status', 'active').eq('nazoratchi_id', user.id);
    if (!groups || groups.length === 0) return ctx.reply("Sizga biriktirilgan guruhlar topilmadi.");

    ctx.session.myGroups = groups;

    const buttons = groups.map((g, idx) => [
      Markup.button.callback(`🏫 ${g.name}`, `select_group_adhoc:${idx}`)
    ]);

    ctx.reply("Guruhlaringiz ro'yxati. Qo'shimcha dars boshlash uchun guruhni tanlang:", Markup.inlineKeyboard(buttons));
  } catch (e) {
    console.error(e);
    ctx.reply("Xatolik yuz berdi.");
  }
});

bot.action(/select_group_adhoc:(\d+)/, async (ctx) => {
  try {
    const idx = parseInt(ctx.match[1], 10);
    const groups = ctx.session.myGroups;
    if (!groups || !groups[idx]) {
      return ctx.answerCbQuery("Guruh topilmadi.");
    }

    const group = groups[idx];
    ctx.session.awaitingAdhocTitle = { groupId: group.id };

    await ctx.reply(`Siz <b>${group.name}</b> guruhini tanladingiz.\n\nIltimos, dars mavzusini kiriting (masalan: Rangtasvir asoslari):`, { parse_mode: 'HTML' });
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
    ctx.reply("Xatolik: " + err.message);
  }
});

bot.hears('📊 Davomat hisobotlari', async (ctx) => {
  try {
    const tgId = ctx.from.id.toString();
    const { data: user } = await supabase.from('users').select('id, role').eq('telegram_id', tgId).single();
    if (!user || user.role !== 'nazoratchi') return ctx.reply("Siz o'qituvchi roliga ega emassiz.");

    const { data: groups } = await supabase.from('groups').select('id, name').eq('status', 'active').eq('nazoratchi_id', user.id);
    if (!groups || groups.length === 0) return ctx.reply("Sizga biriktirilgan guruhlar topilmadi.");

    const groupStats = [];
    for (const g of groups) {
       const { data: students } = await supabase.from('students').select('id').eq('group_id', g.id);
       const studentIds = students.map(s => s.id);
       if (studentIds.length === 0) {
          groupStats.push(`🏫 <b>${g.name}</b>: O'quvchilar yo'q`);
          continue;
       }
       
       const [attsRes, lastLessonRes] = await Promise.all([
         supabase
           .from('attendance')
           .select('status')
           .in('student_id', studentIds),
         supabase
           .from('lessons')
           .select('lesson_date')
           .eq('group_id', g.id)
           .order('lesson_date', { ascending: false })
           .limit(1)
           .maybeSingle()
       ]);
       
       const atts = attsRes.data;
       const lastLesson = lastLessonRes.data;
          
       let total = atts ? atts.length : 0;
       let present = atts ? atts.filter(a => a.status === 'present' || a.status === 'late').length : 0;
       let pct = total > 0 ? Math.round((present / total) * 100) : 100;
       
       let dateStr = '';
       if (lastLesson) {
         const dateObj = new Date(lastLesson.lesson_date);
         const months = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
         dateStr = ` (oxirgi dars: ${dateObj.getDate()}-${months[dateObj.getMonth()]})`;
       }

       groupStats.push(`🏫 <b>${g.name}</b>: <b>${pct}%</b> davomat (${present}/${total})${dateStr}`);
    }
    ctx.replyWithHTML(`📊 <b>Guruhlaringiz davomat foizlari:</b>\n\n` + groupStats.join('\n'));
  } catch (e) {
    console.error(e);
    ctx.reply("Xatolik yuz berdi.");
  }
});

bot.action(/wiz_edit_std:(\d+)/, async (ctx) => {
  try {
    const idx = parseInt(ctx.match[1], 10);
    const wizard = ctx.session.attendanceWizard;
    if (!wizard || !wizard.students[idx]) return ctx.answerCbQuery("Sessiya faol emas.");

    wizard.editingIdx = idx;
    const student = wizard.students[idx];

    const kb = Markup.inlineKeyboard([
      [Markup.button.callback("🟢 Bor (Kelgan)", "wiz_status:present"), Markup.button.callback("🔵 Sababli", "wiz_status:excused")],
      [Markup.button.callback("🔴 Yo'q (Sababsiz)", "wiz_status:unexcused"), Markup.button.callback("🟡 Kechikdi", "wiz_status:late")],
      [Markup.button.callback("⬅️ Orqaga", "wiz_back")]
    ]);

    await ctx.editMessageText(`👤 <b>${student.name}</b> uchun holatni tanlang:`, { parse_mode: 'HTML', ...kb });
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action(/wiz_status:(.+)/, async (ctx) => {
  try {
    const status = ctx.match[1];
    const wizard = ctx.session.attendanceWizard;
    if (!wizard || wizard.editingIdx === null || wizard.editingIdx === undefined) {
      return ctx.answerCbQuery("Sessiya faol emas.");
    }

    const student = wizard.students[wizard.editingIdx];

    if (status === 'late') {
      const kb = Markup.inlineKeyboard([
        [Markup.button.callback("1 soat", "wiz_late:1"), Markup.button.callback("2 soat", "wiz_late:2")],
        [Markup.button.callback("3 soat", "wiz_late:3"), Markup.button.callback("4 soat", "wiz_late:4")],
        [Markup.button.callback("5 soat", "wiz_late:5"), Markup.button.callback("6 soat", "wiz_late:6")],
        [Markup.button.callback("⬅️ Orqaga", "wiz_back")]
      ]);
      await ctx.editMessageText(`👤 <b>${student.name}</b> necha soatga kechikdi?`, { parse_mode: 'HTML', ...kb });
    } else {
      wizard.attendance[student.id] = { status, late_hours: 0 };
      wizard.editingIdx = null;
      await sendInteractiveWizardMenu(ctx, true);
    }
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action(/wiz_late:(\d+)/, async (ctx) => {
  try {
    const hours = parseInt(ctx.match[1], 10);
    const wizard = ctx.session.attendanceWizard;
    if (!wizard || wizard.editingIdx === null || wizard.editingIdx === undefined) {
      return ctx.answerCbQuery("Sessiya faol emas.");
    }

    const student = wizard.students[wizard.editingIdx];
    wizard.attendance[student.id] = { status: 'late', late_hours: hours };
    wizard.editingIdx = null;

    await sendInteractiveWizardMenu(ctx, true);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action('wiz_back', async (ctx) => {
  try {
    const wizard = ctx.session.attendanceWizard;
    if (!wizard) return ctx.answerCbQuery("Sessiya faol emas.");

    wizard.editingIdx = null;
    await sendInteractiveWizardMenu(ctx, true);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action('wiz_cancel', async (ctx) => {
  try {
    ctx.session.attendanceWizard = null;
    await ctx.editMessageText("❌ Davomat bekor qilindi. Kiritilgan ma'lumotlar saqlanmadi.");
    await ctx.answerCbQuery();
  } catch(e) {
    console.error(e);
  }
});

bot.action('wiz_save', async (ctx) => {
  try {
    const wizard = ctx.session.attendanceWizard;
    if (!wizard) return ctx.answerCbQuery("Sessiya faol emas.");

    await saveAttendance(ctx);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action(/wiz_start:(.+)/, async (ctx) => {
  try {
    const scheduleId = ctx.match[1];
    
    const { data: sch, error } = await supabase
      .from('schedules')
      .select('*, groups(id, name, course_name)')
      .eq('id', scheduleId)
      .single();

    if (error || !sch) {
      return ctx.answerCbQuery("Dars jadvali topilmadi.");
    }

    const title = `${sch.groups.course_name || sch.groups.name} (${sch.start_time.substring(0, 5)} - ${sch.end_time.substring(0, 5)})`;
    
    const { data: lessonId, error: rpcError } = await supabase.rpc('get_or_create_today_lesson', {
      p_group_id: sch.group_id,
      p_lesson_title: title,
      p_schedule_id: sch.id
    });
    if (rpcError) throw rpcError;

    // Sync teacher_id and subject_id from schedule
    await supabase
      .from('lessons')
      .update({
        teacher_id: sch.teacher_id,
        subject_id: sch.subject_id
      })
      .eq('id', lessonId);

    await startAttendanceWizard(ctx, sch.group_id, lessonId, title);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
    ctx.reply("Xatolik yuz berdi: " + err.message);
  }
});

async function startAttendanceWizard(ctx, groupId, lessonId, title) {
  const { data: students, error: stdError } = await supabase
    .from('students')
    .select('id, users(full_name)')
    .eq('group_id', groupId)
    .eq('status', 'active');

  if (stdError || !students || students.length === 0) {
    return ctx.reply("Ushbu guruhda faol talabalar topilmadi.");
  }

  // Fetch existing attendance records
  const { data: existingAtt } = await supabase
    .from('attendance')
    .select('student_id, status, late_hours')
    .eq('lesson_id', lessonId);

  const attendanceMap = {};
  if (existingAtt && existingAtt.length > 0) {
    existingAtt.forEach(a => {
      attendanceMap[a.student_id] = { status: a.status, late_hours: a.late_hours };
    });
  } else {
    students.forEach(s => {
      attendanceMap[s.id] = { status: 'present', late_hours: 0 };
    });
  }

  ctx.session.attendanceWizard = {
    lessonId,
    groupId,
    title,
    students: students.map(s => ({ id: s.id, name: s.users.full_name })),
    attendance: attendanceMap,
    editingIdx: null
  };

  await sendInteractiveWizardMenu(ctx, false);
}

async function sendInteractiveWizardMenu(ctx, editExisting = false) {
  const wizard = ctx.session.attendanceWizard;
  if (!wizard) return;

  let text = `📋 <b>${wizard.title}</b> darsi davomati\n`;
  text += `Tahrirlash yoki o'zgartirish uchun o'quvchi ismini bosing. Yakunlash uchun <b>Saqlash</b> tugmasini bosing:\n\n`;

  const statusEmojis = {
    present: '🟢 Kelgan',
    excused: '🔵 Sababli',
    absent: '🔴 Kelmagan',
    unexcused: '🔴 Kelmagan',
    late: '🟡 Kechikdi'
  };

  wizard.students.forEach((s, i) => {
    const att = wizard.attendance[s.id];
    let statusText = '⚪ Belgilanmagan';
    if (att) {
      if (att.status === 'late') {
        statusText = `🟡 Kechikdi (${att.late_hours} soat)`;
      } else {
        statusText = statusEmojis[att.status] || att.status;
      }
    }
    text += `${i + 1}. <b>${s.name}</b> - ${statusText}\n`;
  });

  const getShortName = (fullName) => {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1]}`;
    }
    return parts[0];
  };

  const buttons = [];
  for (let i = 0; i < wizard.students.length; i += 2) {
    const row = [];
    const s1 = wizard.students[i];
    const att1 = wizard.attendance[s1.id];
    const emoji1 = att1 ? (att1.status === 'present' ? '🟢' : att1.status === 'late' ? '🟡' : att1.status === 'excused' ? '🔵' : '🔴') : '⚪';
    row.push(Markup.button.callback(`${emoji1} ${getShortName(s1.name)}`, `wiz_edit_std:${i}`));
    
    if (i + 1 < wizard.students.length) {
      const s2 = wizard.students[i + 1];
      const att2 = wizard.attendance[s2.id];
      const emoji2 = att2 ? (att2.status === 'present' ? '🟢' : att2.status === 'late' ? '🟡' : att2.status === 'excused' ? '🔵' : '🔴') : '⚪';
      row.push(Markup.button.callback(`${emoji2} ${getShortName(s2.name)}`, `wiz_edit_std:${i + 1}`));
    }
    buttons.push(row);
  }

  buttons.push([
    Markup.button.callback("❌ Bekor qilish", `wiz_cancel`),
    Markup.button.callback("✅ Saqlash", `wiz_save`)
  ]);

  const keyboard = Markup.inlineKeyboard(buttons);

  if (editExisting) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } catch (e) {
      await ctx.replyWithHTML(text, keyboard);
    }
  } else {
    await ctx.replyWithHTML(text, keyboard);
  }
}

async function saveAttendance(ctx) {
  const wizard = ctx.session.attendanceWizard;
  if (!wizard) return;
  
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
  
  const insertRows = wizard.students.map(s => {
    const att = wizard.attendance[s.id] || { status: 'present', late_hours: 0 };
    return {
      lesson_id: wizard.lessonId,
      student_id: s.id,
      status: att.status,
      late_hours: att.late_hours,
      marked_by: user ? user.id : null
    };
  });
  
  const { error } = await supabase.from('attendance').upsert(insertRows, { onConflict: 'lesson_id, student_id' });
  
  if (error) {
    await ctx.reply(`Davomatni saqlashda xatolik yuz berdi: ${error.message}`);
  } else {
    const msg = `✅ <b>Davomat muvaffaqiyatli saqlandi!</b>\n\nBarcha o'quvchilar belgilandi.`;
    try {
      await ctx.editMessageText(msg, { parse_mode: 'HTML' });
    } catch(e) {
      await ctx.replyWithHTML(msg);
    }
  }
  
  ctx.session.attendanceWizard = null;
}

async function startAdhocLesson(ctx, groupId, title) {
  try {
    const { data: lessonId, error: rpcError } = await supabase.rpc('get_or_create_today_lesson', {
      p_group_id: groupId,
      p_lesson_title: title,
      p_schedule_id: null
    });
    if (rpcError) throw rpcError;
    await startAttendanceWizard(ctx, groupId, lessonId, title);
  } catch (err) {
    console.error(err);
    ctx.reply("Xatolik: " + err.message);
  }
}

// Helper to convert time "HH:MM:SS" to minutes
function timeToMinutes(tStr) {
  const parts = tStr.split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

// 1. Dars boshlanishi haqida eslatma (har 5 daqiqada ishlaydi)
cron.schedule('*/5 * * * *', async () => {
  try {
    const tz = getTashkentTime();
    if (tz.dayOfWeek === 7) return; // Sunday no lessons
    
    const todayStr = tz.dateStr;
    const curMinutes = tz.minutesFromMidnight;

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*, groups(name, nazoratchi_id, users!groups_nazoratchi_id_fkey(telegram_id, full_name))')
      .eq('day_of_week', tz.dayOfWeek);
      
    if (schedules) {
      for (const s of schedules) {
        const schMinutes = timeToMinutes(s.start_time);
        const diff = curMinutes - schMinutes;
        
        // Agar dars boshlanganiga 15-19 daqiqa bo'lgan bo'lsa (exact 15-minute window)
        if (diff >= 15 && diff <= 19) {
          const { data: existing } = await supabase
            .from('lessons')
            .select('id')
            .eq('lesson_date', todayStr)
            .eq('schedule_id', s.id)
            .maybeSingle();
            
          if (!existing) {
            const nazoratchi = s.groups?.users;
            if (nazoratchi && nazoratchi.telegram_id) {
              const text = `🔔 <b>Eslatma:</b> Hurmatli ${nazoratchi.full_name}, sizning <b>${s.groups.name}</b> guruhingizda soat <b>${s.start_time.substring(0, 5)}</b> da dars boshlandi. Iltimos, dars davomatini belgilang.`;
              const kb = Markup.inlineKeyboard([
                [Markup.button.callback("🟢 Davomat belgilash", `wiz_start:${s.id}`)]
              ]);
              await bot.telegram.sendMessage(nazoratchi.telegram_id, text, { parse_mode: 'HTML', ...kb }).catch(console.error);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in start lesson reminder cron:', err);
  }
}, {
  timezone: "Asia/Tashkent"
});

// 2. Davomat topshirmaganlik uchun ogohlantirishlar (12, 24, 36 soat) (har 30 daqiqada ishlaydi)
cron.schedule('*/30 * * * *', async () => {
  try {
    const tz = getTashkentTime();
    const todayStr = tz.dateStr;
    let todayDay = tz.dayOfWeek;
    
    // Calculate yesterday's date
    const parts = todayStr.split('-');
    const todayDateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    todayDateObj.setDate(todayDateObj.getDate() - 1);
    
    const yesterdayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const yParts = yesterdayFormatter.formatToParts(todayDateObj);
    const yMap = {};
    yParts.forEach(p => yMap[p.type] = p.value);
    const yesterdayStr = `${yMap.year}-${yMap.month}-${yMap.day}`;
    
    const tempYesterdayDate = new Date(`${yesterdayStr}T12:00:00+05:00`);
    let yesterdayDay = tempYesterdayDate.getDay();
    if (yesterdayDay === 0) yesterdayDay = 7;

    const checkDays = [
      { dateStr: todayStr, day: todayDay },
      { dateStr: yesterdayStr, day: yesterdayDay }
    ];

    for (const d of checkDays) {
      if (d.day === 7) continue;

      const { data: schedules } = await supabase
        .from('schedules')
        .select('*, groups(id, name, nazoratchi_id, tutor_id, users!groups_nazoratchi_id_fkey(telegram_id, full_name))')
        .eq('day_of_week', d.day);

      if (!schedules) continue;

      for (const s of schedules) {
        const { data: lesson } = await supabase
          .from('lessons')
          .select('id')
          .eq('lesson_date', d.dateStr)
          .eq('schedule_id', s.id)
          .maybeSingle();

        if (lesson) continue;

        const startParts = s.start_time.split(':');
        const startHour = parseInt(startParts[0], 10);
        const startMin = parseInt(startParts[1], 10);

        const startDateTime = new Date(`${d.dateStr}T${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:00+05:00`);
        const diffMs = new Date() - startDateTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        const nazoratchi = s.groups?.users;
        if (!nazoratchi || !nazoratchi.telegram_id) continue;

        if (diffHours >= 12 && diffHours < 12.5) {
          const text = `⚠️ <b>DIQQAT:</b> Hurmatli ${nazoratchi.full_name}, sizning <b>${s.groups.name}</b> guruhingizda soat <b>${s.start_time.substring(0, 5)}</b> dagi dars uchun davomat belgilanmaganiga <b>12 soat</b> bo'ldi. Iltimos, davomatni oling.`;
          const kb = Markup.inlineKeyboard([[Markup.button.callback("🟢 Davomat belgilash", `wiz_start:${s.id}`)]]);
          await bot.telegram.sendMessage(nazoratchi.telegram_id, text, { parse_mode: 'HTML', ...kb }).catch(console.error);
        }
        else if (diffHours >= 24 && diffHours < 24.5) {
          const text = `🚨 <b>QAT'IY OGOHLANTIRISH:</b> Hurmatli ${nazoratchi.full_name}, sizning <b>${s.groups.name}</b> guruhingizda soat <b>${s.start_time.substring(0, 5)}</b> dagi dars uchun davomat belgilanmaganiga <b>24 soat</b> bo'ldi. Iltimos, davomatni belgilang!`;
          const kb = Markup.inlineKeyboard([[Markup.button.callback("🟢 Davomat belgilash", `wiz_start:${s.id}`)]]);
          await bot.telegram.sendMessage(nazoratchi.telegram_id, text, { parse_mode: 'HTML', ...kb }).catch(console.error);
        }
        else if (diffHours >= 36 && diffHours < 36.5) {
          const textNazoratchi = `❌ <b>MUDDAT O'TDI:</b> Hurmatli ${nazoratchi.full_name}, sizning <b>${s.groups.name}</b> guruhingizda soat <b>${s.start_time.substring(0, 5)}</b> dagi dars uchun davomat belgilanmaganiga <b>36 soat</b> bo'ldi. Ushbu qoidabuzarlik haqida rahbariyatga xabar yuborildi.`;
          await bot.telegram.sendMessage(nazoratchi.telegram_id, textNazoratchi, { parse_mode: 'HTML' }).catch(console.error);

          const textAdmin = `📢 <b>Tizim ogohlantirishi:</b> O'qituvchi ${nazoratchi.full_name} <b>${s.groups.name}</b> guruhida soat <b>${s.start_time.substring(0, 5)}</b> dagi dars uchun davomatni <b>36 soat</b> ichida topshirmadi.`;

          if (s.groups.tutor_id) {
            const { data: tutor } = await supabase.from('users').select('telegram_id').eq('id', s.groups.tutor_id).single();
            if (tutor && tutor.telegram_id) {
              await bot.telegram.sendMessage(tutor.telegram_id, textAdmin, { parse_mode: 'HTML' }).catch(console.error);
            }
          }

          const { data: admins } = await supabase.from('users').select('telegram_id').eq('role', 'admin').not('telegram_id', 'is', null);
          if (admins) {
            for (const a of admins) {
              await bot.telegram.sendMessage(a.telegram_id, textAdmin, { parse_mode: 'HTML' }).catch(console.error);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in nazoratchi warning cron job:', err);
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
  
  // Keep-alive ping every 10 minutes (Render sleeps after 15 mins of inactivity)
  setInterval(() => {
    https.get('https://davomat-s4d0.onrender.com', (res) => {
      console.log(`Keep-alive ping sent to admin, status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('Keep-alive ping admin error:', err.message);
    });

    https.get('https://davomat-3sap.onrender.com', (res) => {
      console.log(`Keep-alive ping sent to bot, status: ${res.statusCode}`);
    }).on('error', (err) => {
      console.error('Keep-alive ping bot error:', err.message);
    });
  }, 10 * 60 * 1000); // 10 minutes
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
