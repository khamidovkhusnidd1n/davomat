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

    const { id, group_id, lesson_date, title, start_time, end_time, subject_id, teacher_id, custom_subject_name } = await req.json();

    if (!group_id || !lesson_date || !start_time || !end_time) {
      return NextResponse.json({ error: 'Barcha maydonlar to\'ldirilishi shart' }, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let finalSubjectId = subject_id || null;

    if (custom_subject_name && custom_subject_name.trim() !== '') {
      // Find organization_id from group
      const { data: groupData } = await supabaseAdmin
        .from('groups')
        .select('organization_id')
        .eq('id', group_id)
        .single();
      const orgId = groupData?.organization_id || '11111111-1111-1111-1111-111111111111';

      const trimmedName = custom_subject_name.trim();

      // Look up subject by name (case-insensitive)
      const { data: existingSub } = await supabaseAdmin
        .from('subjects')
        .select('id')
        .eq('organization_id', orgId)
        .ilike('name', trimmedName)
        .maybeSingle();

      if (existingSub) {
        finalSubjectId = existingSub.id;
      } else {
        const { data: newSub, error: subErr } = await supabaseAdmin
          .from('subjects')
          .insert({
            organization_id: orgId,
            name: trimmedName
          })
          .select('id')
          .single();
        if (subErr) throw subErr;
        finalSubjectId = newSub.id;
      }
    }

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
          end_time: end,
          subject_id: finalSubjectId,
          teacher_id: teacher_id || null
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
          schedule_id: scheduleId,
          subject_id: finalSubjectId,
          teacher_id: teacher_id || null
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
          created_by: auth.user.id,
          subject_id: finalSubjectId,
          teacher_id: teacher_id || null
        });

      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error saving lesson:', err);
    return NextResponse.json({ error: err.message || 'Xatolik yuz berdi' }, { status: 500 });
  }
}
