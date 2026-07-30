import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/auth_check';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  try {
    const auth = await checkAdminAuth(req);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, group_id, lesson_date, title, start_time, end_time } = await req.json();

    if (!group_id || !lesson_date || !title || !start_time || !end_time) {
      return NextResponse.json({ error: 'Barcha maydonlar to\'ldirilishi shart' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Calculate day of week of lesson_date (1 = Monday, ..., 7 = Sunday)
    const dateObj = new Date(lesson_date);
    let dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0) dayOfWeek = 7;

    const start = start_time.length === 5 ? `${start_time}:00` : start_time;
    const end = end_time.length === 5 ? `${end_time}:00` : end_time;

    // 2. Find or create schedule
    let scheduleId = null;
    const { data: existingSchedule } = await supabaseAdmin
      .from('schedules')
      .select('id')
      .eq('group_id', group_id)
      .eq('day_of_week', dayOfWeek)
      .eq('start_time', start)
      .maybeSingle();

    if (existingSchedule) {
      scheduleId = existingSchedule.id;
    } else {
      const { data: newSchedule, error: schErr } = await supabaseAdmin
        .from('schedules')
        .insert({
          group_id: group_id,
          day_of_week: dayOfWeek,
          start_time: start,
          end_time: end
        })
        .select('id')
        .single();

      if (schErr) {
        throw new Error('Dars jadvalini avtomatik yaratishda xatolik yuz berdi: ' + schErr.message);
      }
      scheduleId = newSchedule.id;
    }

    const finalTitle = `${start_time}-${end_time} | ${title}`;

    if (id) {
      // Update existing lesson
      const { error: updateErr } = await supabaseAdmin
        .from('lessons')
        .update({
          group_id,
          lesson_date,
          title: finalTitle,
          schedule_id: scheduleId
        })
        .eq('id', id);

      if (updateErr) throw updateErr;
    } else {
      // Insert new lesson
      const { error: insertErr } = await supabaseAdmin
        .from('lessons')
        .insert({
          group_id,
          lesson_date,
          title: finalTitle,
          schedule_id: scheduleId,
          created_by: auth.user.id
        });

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving lesson:', err);
    return NextResponse.json({ error: err.message || 'Xatolik yuz berdi' }, { status: 500 });
  }
}
