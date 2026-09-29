const fs = require('fs');
let code = fs.readFileSync('bot/index.js', 'utf8');

const regex = /bot\.hears\('?? Dars jadvali', async \(ctx\) => \{[\s\S]*?ctx\.replyWithHTML\(text\);\n\}\);/;

const replacement = \ot.hears('?? Dars jadvali', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
  if (!user) return ctx.reply("Siz tizimga kirmagansiz.");

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
  const todayStr = \\\\-\-\\\\;
  const currentHourStr = \\\\:\\\\;

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

  let text = "?? <b>Guruhning keyingi darslari:</b>\\n\\n";
  lessonsData.forEach((s) => {
    let dayOfWeek = new Date(s.lesson_date).getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const sch = schedules?.find(x => x.day_of_week === dayOfWeek);
    const startTime = sch ? sch.start_time.substring(0, 5) : '--:--';
    const endTime = sch ? sch.end_time.substring(0, 5) : '--:--';

    let icon = '??';
    let dateStr = s.lesson_date;

    if (s.lesson_date === todayStr) {
      if (currentHourStr > endTime) {
        icon = '??';
        dateStr = 'Bugun (Tugadi)';
      } else if (currentHourStr >= startTime && currentHourStr <= endTime) {
        icon = '??';
        dateStr = 'Bugun (Ketyapti)';
      } else {
        icon = '??';
        dateStr = 'Bugun';
      }
    } else {
      const diff = Math.round((new Date(s.lesson_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        icon = '??';
        dateStr = 'Ertaga';
      }
    }

    text += \\\\ <b>\, soat \</b> — <i>\</i>\\n\\\;
  });

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback("?? O'tilgan mavzular arxivi", "past_topics")]
  ]);
  
  ctx.replyWithHTML(text, kb);
});

bot.action('past_topics', async (ctx) => {
  const tgId = ctx.from.id.toString();
  const { data: user } = await supabase.from('users').select('id').eq('telegram_id', tgId).single();
  if (!user) return ctx.answerCbQuery("Topilmadi", {show_alert: true});

  const { data: student } = await supabase.from('students').select('group_id').eq('user_id', user.id).single();
  if (!student) return ctx.answerCbQuery("Guruh topilmadi", {show_alert: true});
  
  const tashkentFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = tashkentFormatter.formatToParts(new Date());
  const tObj = {};
  parts.forEach(p => tObj[p.type] = p.value);
  const todayStr = \\\\-\-\\\\;

  const { data: pastLessons } = await supabase
    .from('lessons')
    .select('title, lesson_date')
    .eq('group_id', student.group_id)
    .lt('lesson_date', todayStr)
    .order('lesson_date', { ascending: false })
    .limit(5);
    
  if (!pastLessons || pastLessons.length === 0) {
    return ctx.answerCbQuery("Hali o'tilgan darslar yo'q.", {show_alert: true});
  }
  
  let text = "?? <b>Oxirgi o'tilgan mavzular:</b>\\n\\n";
  pastLessons.forEach(l => {
    text += \\\? <b>\:</b> \\\n\\\;
  });
  
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback("?? Ortga (Dars jadvali)", "show_schedule")]
  ]);
  
  await ctx.editMessageText(text, { parse_mode: 'HTML', ...kb }).catch(()=>{});
  ctx.answerCbQuery();
});

bot.action('show_schedule', async (ctx) => {
  await ctx.deleteMessage().catch(() => {});
  ctx.reply("Pastki menyudan ?? Dars jadvali tugmasini bosing.");
  ctx.answerCbQuery();
});\;

code = code.replace(regex, replacement);
fs.writeFileSync('bot/index.js', code);
console.log('Success');
