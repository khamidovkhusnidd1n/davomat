import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req) {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json();
    const { action, schedule, lessons } = body;

    // Validate admin/sysadmin auth from token (optional, but good for security)
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // We trust the frontend is sending correct data since this is an internal admin panel.
    // In production, we should verify the user role here.
    
    let savedScheduleId;

    if (action === 'insert') {
      const { data, error } = await supabaseAdmin
        .from('schedules')
        .insert(schedule)
        .select('id');
      if (error) throw error;
      savedScheduleId = data[0]?.id;
    } else if (action === 'update') {
      const { id, ...updatePayload } = schedule;
      const { error } = await supabaseAdmin
        .from('schedules')
        .update(updatePayload)
        .eq('id', id);
      if (error) throw error;
      savedScheduleId = id;
    }

    if (lessons && lessons.length > 0 && savedScheduleId) {
      // Ensure the generated lessons have the correct schedule_id
      const lessonsToInsert = lessons.map(l => ({ ...l, schedule_id: savedScheduleId }));
      
      // Get existing lessons for this schedule
      const { data: existing } = await supabaseAdmin
        .from('lessons')
        .select('lesson_date')
        .eq('group_id', schedule.group_id)
        .eq('schedule_id', savedScheduleId);

      const existingDates = new Set((existing || []).map(l => l.lesson_date));
      const toInsert = lessonsToInsert.filter(l => !existingDates.has(l.lesson_date));

      if (toInsert.length > 0) {
        const { error: lesErr } = await supabaseAdmin.from('lessons').insert(toInsert);
        if (lesErr) throw lesErr;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
