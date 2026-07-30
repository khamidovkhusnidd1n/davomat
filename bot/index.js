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

    let kb = [];
    if (user.role === 'teacher') {
      kb = [
        ['📅 Mening darslarim', '📋 Guruhlarim ro\'yxati'],
        ['📊 Davomat hisobotlari']
      ];
    } else if (user.role === 'admin' || user.role === 'tutor') {
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

bot.hears('📢 Xabar tarqatish', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('role').eq('telegram_id', tgId).single();
  if (!user || user.role !== 'admin') return ctx.reply("Sizda xabar yuborish huquqi yo'q.");
  
  if (!ctx.session) ctx.session = {};
  ctx.session.awaitingBroadcast = true;
  ctx.reply("Iltimos, barchaga yuboriladigan xabarni yuboring (Rasm, video yoki matn):\n\nBekor qilish uchun pastdagi tugmani bosing.", Markup.keyboard([['❌ Bekor qilish']]).resize());
});

bot.hears('❌ Bekor qilish', async (ctx) => {
  if (ctx.session) {
    ctx.session.awaitingBroadcast = false;
    ctx.session.awaitingAdhocTitle = null;
  }
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('full_name, role').eq('telegram_id', tgId).single();
  
  let kb = [];
  if (user && user.role === 'teacher') {
    kb = [
      ['📅 Mening darslarim', '📋 Guruhlarim ro\'yxati'],
      ['📊 Davomat hisobotlari']
    ];
  } else if (user && (user.role === 'admin' || user.role === 'tutor')) {
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
    let kb = [];
    if (user && user.role === 'teacher') {
      kb = [
        ['📅 Mening darslarim', '📋 Guruhlarim ro\'yxati'],
        ['📊 Davomat hisobotlari']
      ];
    } else if (user && (user.role === 'admin' || user.role === 'tutor')) {
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

    // Check if we crossed any thresholds TODAY
    let thresholdCrossed = 0;
    if (totalHoursBeforeToday < 12 && totalHoursIncludingToday >= 12) thresholdCrossed = 12;
    else if (totalHoursBeforeToday < 24 && totalHoursIncludingToday >= 24) thresholdCrossed = 24;
    else if (totalHoursBeforeToday < 36 && totalHoursIncludingToday >= 36) thresholdCrossed = 36;

    if (thresholdCrossed > 0) {
      const { data: stInfo } = await supabase
        .from('students')
        .select('users(full_name, telegram_id)')
        .eq('id', stId)
        .single();
      
      if (stInfo && stInfo.users && stInfo.users.telegram_id) {
        let text = '';
        if (thresholdCrossed === 12) {
          text = `⚠️ <b>Ogohlantirish:</b> Hurmatli ${stInfo.users.full_name}, siz jami <b>${totalHoursIncludingToday} soat</b> dars qoldirdingiz. Eslatib o'tamiz, qayta tayyorlash kurslarida 36 soat dars qoldirilganda tinglovchilar safidan chetlashtiriladi.`;
        } else if (thresholdCrossed === 24) {
          text = `🚨 <b>Qat'iy Ogohlantirish:</b> Hurmatli ${stInfo.users.full_name}, siz jami <b>${totalHoursIncludingToday} soat</b> dars qoldirdingiz. Agar yana ${36 - totalHoursIncludingToday} soat dars qoldirsangiz, nizomga asosan kursdan chetlashtirilasiz!`;
        } else if (thresholdCrossed === 36) {
          text = `❌ <b>CHETLASHTIRISH XAVFI:</b> Hurmatli ${stInfo.users.full_name}, siz jami <b>${totalHoursIncludingToday} soat</b> uzrli sababsiz qoldirdingiz! Qayta tayyorlash kursi nizomiga muvofiq, siz tinglovchilar safidan chetlashtirishga tavsiya etilasiz.`;
        }

        try {
          await bot.telegram.sendMessage(stInfo.users.telegram_id, text, { parse_mode: 'HTML' });
        } catch(e) {
          console.error('Failed to send absence warning to', stInfo.users.telegram_id);
        }
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
    if (!user || user.role !== 'teacher') return ctx.reply("Siz o'qituvchi roliga ega emassiz.");

    const tzDate = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Tashkent"}));
    let dayOfWeek = tzDate.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;
    const todayStr = tzDate.toISOString().split('T')[0];

    const { data: groups } = await supabase.from('groups').select('id, name').eq('teacher_id', user.id);
    if (!groups || groups.length === 0) return ctx.reply("Sizga biriktirilgan guruhlar topilmadi.");

    const groupIds = groups.map(g => g.id);

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*, groups(id, name, course_name)')
      .in('group_id', groupIds)
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true });

    if (!schedules || schedules.length === 0) {
      return ctx.reply("Bugun guruhlaringizda darslar rejalashtirilmagan.");
    }

    ctx.session.todaySchedules = schedules;

    const buttons = schedules.map((s, idx) => [
      Markup.button.callback(
        `🏫 ${s.groups.name} (${s.start_time.substring(0, 5)}-${s.end_time.substring(0, 5)})`, 
        `start_lesson_sch:${idx}`
      )
    ]);

    ctx.reply("Bugungi darslaringiz. Davomatni boshlash uchun darsni tanlang:", Markup.inlineKeyboard(buttons));
  } catch (e) {
    console.error(e);
    ctx.reply("Xatolik yuz berdi.");
  }
});

bot.action(/start_lesson_sch:(\d+)/, async (ctx) => {
  try {
    const idx = parseInt(ctx.match[1], 10);
    const schedules = ctx.session.todaySchedules;
    if (!schedules || !schedules[idx]) {
      return ctx.answerCbQuery("Dars ma'lumotlari topilmadi, iltimos qaytadan darslar ro'yxatini oching.");
    }

    const sch = schedules[idx];
    const title = `${sch.groups.course_name || sch.groups.name} (${sch.start_time.substring(0, 5)} - ${sch.end_time.substring(0, 5)})`;
    
    const { data: lessonId, error: rpcError } = await supabase.rpc('get_or_create_today_lesson', {
      p_group_id: sch.group_id,
      p_lesson_title: title,
      p_schedule_id: sch.id
    });
    if (rpcError) throw rpcError;

    await startAttendanceWizard(ctx, sch.group_id, lessonId, title);
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
    if (!user || user.role !== 'teacher') return ctx.reply("Siz o'qituvchi roliga ega emassiz.");

    const { data: groups } = await supabase.from('groups').select('id, name, course_name').eq('teacher_id', user.id);
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
    if (!user || user.role !== 'teacher') return ctx.reply("Siz o'qituvchi roliga ega emassiz.");

    const { data: groups } = await supabase.from('groups').select('id, name').eq('teacher_id', user.id);
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

bot.action(/wiz_status:(.+)/, async (ctx) => {
  try {
    const status = ctx.match[1];
    const wizard = ctx.session.attendanceWizard;
    if (!wizard) return ctx.answerCbQuery("Davomat sessiyasi faol emas.");

    const student = wizard.students[wizard.currentIndex];

    if (status === 'late') {
      const kb = Markup.inlineKeyboard([
        [Markup.button.callback("1 soat", "wiz_late:1"), Markup.button.callback("2 soat", "wiz_late:2")],
        [Markup.button.callback("3 soat", "wiz_late:3"), Markup.button.callback("4 soat", "wiz_late:4")],
        [Markup.button.callback("5 soat", "wiz_late:5"), Markup.button.callback("6 soat", "wiz_late:6")],
        [Markup.button.callback("❌ Bekor qilish", "wiz_cancel")]
      ]);
      await ctx.editMessageText(`👤 <b>${student.name}</b> necha soatga kechikdi?`, { parse_mode: 'HTML', ...kb });
    } else {
      wizard.attendance[student.id] = { status, late_hours: 0 };
      wizard.currentIndex++;
      
      if (wizard.currentIndex < wizard.students.length) {
        await sendWizardQuestion(ctx, true);
      } else {
        await saveAttendance(ctx);
      }
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
    if (!wizard) return ctx.answerCbQuery("Davomat sessiyasi faol emas.");

    const student = wizard.students[wizard.currentIndex];
    wizard.attendance[student.id] = { status: 'late', late_hours: hours };
    wizard.currentIndex++;

    if (wizard.currentIndex < wizard.students.length) {
      await sendWizardQuestion(ctx, true);
    } else {
      await saveAttendance(ctx);
    }
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

  if (!existingAtt || existingAtt.length === 0) {
    ctx.session.attendanceWizard = {
      lessonId,
      groupId,
      students: students.map(s => ({ id: s.id, name: s.users.full_name })),
      currentIndex: 0,
      attendance: {}
    };
    await sendWizardQuestion(ctx, false);
  } else {
    await sendInteractiveEditMenu(ctx, groupId, lessonId, title, students, existingAtt, false);
  }
}

async function sendInteractiveEditMenu(ctx, groupId, lessonId, title, students, existingAtt, editExisting = false) {
  const attMap = {};
  if (existingAtt) {
    existingAtt.forEach(a => {
      attMap[a.student_id] = { status: a.status, late_hours: a.late_hours };
    });
  }

  let text = `📋 <b>${title}</b>\n`;
  text += `Davomat allaqachon kiritilgan. O'zgartirmoqchi bo'lgan o'quvchini tanlang:\n\n`;

  const statusEmojis = {
    present: '🟢 Kelgan',
    excused: '🔵 Sababli',
    absent: '🔴 Kelmagan',
    unexcused: '🔴 Kelmagan',
    late: '🟡 Kechikdi'
  };

  students.forEach((s, i) => {
    const att = attMap[s.id];
    let statusText = '⚪ Belgilanmagan';
    if (att) {
      if (att.status === 'late') {
        statusText = `🟡 Kechikdi (${att.late_hours} soat)`;
      } else {
        statusText = statusEmojis[att.status] || att.status;
      }
    }
    text += `${i + 1}. <b>${s.users.full_name}</b> - ${statusText}\n`;
  });

  ctx.session.interactiveEdit = {
    lessonId,
    groupId,
    title,
    students: students.map(s => ({ id: s.id, name: s.users.full_name }))
  };

  const buttons = [];
  for (let i = 0; i < students.length; i += 2) {
    const row = [];
    const s1 = students[i];
    const att1 = attMap[s1.id];
    const emoji1 = att1 ? (att1.status === 'present' ? '🟢' : att1.status === 'late' ? '🟡' : att1.status === 'excused' ? '🔵' : '🔴') : '⚪';
    row.push(Markup.button.callback(`${emoji1} ${s1.users.full_name.split(' ')[0]}`, `edit_std:${i}`));
    
    if (i + 1 < students.length) {
      const s2 = students[i + 1];
      const att2 = attMap[s2.id];
      const emoji2 = att2 ? (att2.status === 'present' ? '🟢' : att2.status === 'late' ? '🟡' : att2.status === 'excused' ? '🔵' : '🔴') : '⚪';
      row.push(Markup.button.callback(`${emoji2} ${s2.users.full_name.split(' ')[0]}`, `edit_std:${i + 1}`));
    }
    buttons.push(row);
  }

  buttons.push([
    Markup.button.callback("🔄 Boshqatdan dars boshlash", `edit_restart`),
    Markup.button.callback("✅ Tayyor", `edit_done`)
  ]);

  const keyboard = Markup.inlineKeyboard(buttons);

  if (editExisting) {
    try {
      await ctx.editMessageText(text, { parse_mode: 'HTML', ...keyboard });
    } catch(e) {
      await ctx.replyWithHTML(text, keyboard);
    }
  } else {
    await ctx.replyWithHTML(text, keyboard);
  }
}

async function sendWizardQuestion(ctx, editExisting = false) {
  const wizard = ctx.session.attendanceWizard;
  if (!wizard) return;
  const student = wizard.students[wizard.currentIndex];
  const progress = `${wizard.currentIndex + 1}/${wizard.students.length}`;
  const text = `<b>[${progress}]</b> 👤 <b>${student.name}</b> darsdami?`;
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("🟢 Bor (Kelgan)", "wiz_status:present"), Markup.button.callback("🔵 Sababli", "wiz_status:excused")],
    [Markup.button.callback("🔴 Yo'q (Sababsiz)", "wiz_status:unexcused"), Markup.button.callback("🟡 Kechikdi", "wiz_status:late")],
    [Markup.button.callback("❌ Bekor qilish", "wiz_cancel")]
  ]);

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
    const now = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tashkent"}));
    let dayOfWeek = tzDate.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;
    
    if (dayOfWeek === 7) return; // Sunday no lessons
    
    const todayStr = tzDate.toISOString().split('T')[0];
    const curMinutes = tzDate.getHours() * 60 + tzDate.getMinutes();

    const { data: schedules } = await supabase
      .from('schedules')
      .select('*, groups(name, teacher_id, users!groups_teacher_id_fkey(telegram_id, full_name))')
      .eq('day_of_week', dayOfWeek);
      
    if (schedules) {
      for (const s of schedules) {
        const schMinutes = timeToMinutes(s.start_time);
        const diff = curMinutes - schMinutes;
        
        // Agar dars boshlanganiga 15-25 daqiqa bo'lgan bo'lsa
        if (diff >= 15 && diff <= 25) {
          const { data: existing } = await supabase
            .from('lessons')
            .select('id')
            .eq('lesson_date', todayStr)
            .eq('schedule_id', s.id)
            .maybeSingle();
            
          if (!existing) {
            const teacher = s.groups?.users;
            if (teacher && teacher.telegram_id) {
              const text = `🔔 <b>Eslatma:</b> Hurmatli ${teacher.full_name}, sizning <b>${s.groups.name}</b> guruhingizda soat <b>${s.start_time.substring(0, 5)}</b> da dars boshlandi. Iltimos, dars davomatini belgilang.`;
              const kb = Markup.inlineKeyboard([
                [Markup.button.callback("🟢 Davomat belgilash", `wiz_start:${s.id}`)]
              ]);
              await bot.telegram.sendMessage(teacher.telegram_id, text, { parse_mode: 'HTML', ...kb }).catch(console.error);
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
    const now = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Tashkent"}));
    
    const todayStr = tzDate.toISOString().split('T')[0];
    let todayDay = tzDate.getDay();
    if (todayDay === 0) todayDay = 7;
    
    const yesterday = new Date(tzDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    let yesterdayDay = yesterday.getDay();
    if (yesterdayDay === 0) yesterdayDay = 7;

    const checkDays = [
      { dateStr: todayStr, day: todayDay },
      { dateStr: yesterdayStr, day: yesterdayDay }
    ];

    for (const d of checkDays) {
      if (d.day === 7) continue;

      const { data: schedules } = await supabase
        .from('schedules')
        .select('*, groups(id, name, teacher_id, tutor_id, users!groups_teacher_id_fkey(telegram_id, full_name))')
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
        const diffMs = tzDate - startDateTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        const teacher = s.groups?.users;
        if (!teacher || !teacher.telegram_id) continue;

        if (diffHours >= 12 && diffHours < 12.5) {
          const text = `⚠️ <b>DIQQAT:</b> Hurmatli ${teacher.full_name}, sizning <b>${s.groups.name}</b> guruhingizda soat <b>${s.start_time.substring(0, 5)}</b> dagi dars uchun davomat belgilanmaganiga <b>12 soat</b> bo'ldi. Iltimos, davomatni oling.`;
          const kb = Markup.inlineKeyboard([[Markup.button.callback("🟢 Davomat belgilash", `wiz_start:${s.id}`)]]);
          await bot.telegram.sendMessage(teacher.telegram_id, text, { parse_mode: 'HTML', ...kb }).catch(console.error);
        }
        else if (diffHours >= 24 && diffHours < 24.5) {
          const text = `🚨 <b>QAT'IY OGOHLANTIRISH:</b> Hurmatli ${teacher.full_name}, sizning <b>${s.groups.name}</b> guruhingizda soat <b>${s.start_time.substring(0, 5)}</b> dagi dars uchun davomat belgilanmaganiga <b>24 soat</b> bo'ldi. Iltimos, davomatni belgilang!`;
          const kb = Markup.inlineKeyboard([[Markup.button.callback("🟢 Davomat belgilash", `wiz_start:${s.id}`)]]);
          await bot.telegram.sendMessage(teacher.telegram_id, text, { parse_mode: 'HTML', ...kb }).catch(console.error);
        }
        else if (diffHours >= 36 && diffHours < 36.5) {
          const textTeacher = `❌ <b>MUDDAT O'TDI:</b> Hurmatli ${teacher.full_name}, sizning <b>${s.groups.name}</b> guruhingizda soat <b>${s.start_time.substring(0, 5)}</b> dagi dars uchun davomat belgilanmaganiga <b>36 soat</b> bo'ldi. Ushbu qoidabuzarlik haqida rahbariyatga xabar yuborildi.`;
          await bot.telegram.sendMessage(teacher.telegram_id, textTeacher, { parse_mode: 'HTML' }).catch(console.error);

          const textAdmin = `📢 <b>Tizim ogohlantirishi:</b> O'qituvchi ${teacher.full_name} <b>${s.groups.name}</b> guruhida soat <b>${s.start_time.substring(0, 5)}</b> dagi dars uchun davomatni <b>36 soat</b> ichida topshirmadi.`;

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
    console.error('Error in teacher warning cron job:', err);
  }
}, {
  timezone: "Asia/Tashkent"
});

bot.action(/edit_std:(\d+)/, async (ctx) => {
  try {
    const idx = parseInt(ctx.match[1], 10);
    const edit = ctx.session.interactiveEdit;
    if (!edit || !edit.students[idx]) return ctx.answerCbQuery("Sessiya faol emas.");

    edit.editingIdx = idx;
    const student = edit.students[idx];

    const kb = Markup.inlineKeyboard([
      [Markup.button.callback("🟢 Bor (Kelgan)", "edit_wiz_status:present"), Markup.button.callback("🔵 Sababli", "edit_wiz_status:excused")],
      [Markup.button.callback("🔴 Yo'q (Sababsiz)", "edit_wiz_status:unexcused"), Markup.button.callback("🟡 Kechikdi", "edit_wiz_status:late")],
      [Markup.button.callback("⬅️ Orqaga", "edit_wiz_back")]
    ]);

    await ctx.editMessageText(`👤 <b>${student.name}</b> uchun yangi holatni tanlang:`, { parse_mode: 'HTML', ...kb });
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action(/edit_wiz_status:(.+)/, async (ctx) => {
  try {
    const status = ctx.match[1];
    const edit = ctx.session.interactiveEdit;
    if (!edit || edit.editingIdx === undefined) return ctx.answerCbQuery("Sessiya faol emas.");

    const student = edit.students[edit.editingIdx];

    if (status === 'late') {
      const kb = Markup.inlineKeyboard([
        [Markup.button.callback("1 soat", "edit_wiz_late:1"), Markup.button.callback("2 soat", "edit_wiz_late:2")],
        [Markup.button.callback("3 soat", "edit_wiz_late:3"), Markup.button.callback("4 soat", "edit_wiz_late:4")],
        [Markup.button.callback("5 soat", "edit_wiz_late:5"), Markup.button.callback("6 soat", "edit_wiz_late:6")],
        [Markup.button.callback("⬅️ Orqaga", "edit_wiz_back")]
      ]);
      await ctx.editMessageText(`👤 <b>${student.name}</b> necha soatga kechikdi?`, { parse_mode: 'HTML', ...kb });
    } else {
      const tgId = ctx.from.id.toString();
      const { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();

      const { error } = await supabase.from('attendance').upsert({
        lesson_id: edit.lessonId,
        student_id: student.id,
        status: status,
        late_hours: 0,
        marked_by: user ? user.id : null
      }, { onConflict: 'lesson_id, student_id' });

      if (error) {
        ctx.reply("Xatolik: " + error.message);
      } else {
        const { data: existingAtt } = await supabase.from('attendance').select('student_id, status, late_hours').eq('lesson_id', edit.lessonId);
        const { data: students } = await supabase.from('students').select('id, users(full_name)').eq('group_id', edit.groupId).eq('status', 'active');
        await sendInteractiveEditMenu(ctx, edit.groupId, edit.lessonId, edit.title, students, existingAtt, true);
      }
    }
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action(/edit_wiz_late:(\d+)/, async (ctx) => {
  try {
    const hours = parseInt(ctx.match[1], 10);
    const edit = ctx.session.interactiveEdit;
    if (!edit || edit.editingIdx === undefined) return ctx.answerCbQuery("Sessiya faol emas.");

    const student = edit.students[edit.editingIdx];
    const tgId = ctx.from.id.toString();
    const { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();

    const { error } = await supabase.from('attendance').upsert({
      lesson_id: edit.lessonId,
      student_id: student.id,
      status: 'late',
      late_hours: hours,
      marked_by: user ? user.id : null
    }, { onConflict: 'lesson_id, student_id' });

    if (error) {
      ctx.reply("Xatolik: " + error.message);
    } else {
      const { data: existingAtt } = await supabase.from('attendance').select('student_id, status, late_hours').eq('lesson_id', edit.lessonId);
      const { data: students } = await supabase.from('students').select('id, users(full_name)').eq('group_id', edit.groupId).eq('status', 'active');
      await sendInteractiveEditMenu(ctx, edit.groupId, edit.lessonId, edit.title, students, existingAtt, true);
    }
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action('edit_wiz_back', async (ctx) => {
  try {
    const edit = ctx.session.interactiveEdit;
    if (!edit) return ctx.answerCbQuery("Sessiya faol emas.");

    const { data: existingAtt } = await supabase.from('attendance').select('student_id, status, late_hours').eq('lesson_id', edit.lessonId);
    const { data: students } = await supabase.from('students').select('id, users(full_name)').eq('group_id', edit.groupId).eq('status', 'active');
    await sendInteractiveEditMenu(ctx, edit.groupId, edit.lessonId, edit.title, students, existingAtt, true);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action('edit_restart', async (ctx) => {
  try {
    const edit = ctx.session.interactiveEdit;
    if (!edit) return ctx.answerCbQuery("Sessiya faol emas.");

    ctx.session.attendanceWizard = {
      lessonId: edit.lessonId,
      groupId: edit.groupId,
      students: edit.students,
      currentIndex: 0,
      attendance: {}
    };
    await sendWizardQuestion(ctx, true);
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
});

bot.action('edit_done', async (ctx) => {
  try {
    ctx.session.interactiveEdit = null;
    await ctx.editMessageText("✅ <b>Davomat yakunlandi va muvaffaqiyatli saqlandi!</b>", { parse_mode: 'HTML' });
    await ctx.answerCbQuery();
  } catch (err) {
    console.error(err);
  }
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
