import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month'); // e.g., '2025-10'

    // Fetch groups
    const { data: groups, error: gErr } = await supabase
      .from('groups')
      .select('id, name, course_name');
      
    if (gErr) throw gErr;

    // Fetch students
    const { data: students, error: sErr } = await supabase
      .from('students')
      .select(`
        id, 
        group_id, 
        users ( full_name, phone )
      `);
      
    if (sErr) throw sErr;

    // Fetch lessons and attendance based on month (or all if no month provided)
    let lessonsQuery = supabase.from('lessons').select('id, group_id, lesson_date, title').order('lesson_date', { ascending: true });
    
    if (month) {
      const startDate = `${month}-01`;
      // Naive way to get end of month, works for most cases
      const endDate = `${month}-31`; 
      lessonsQuery = lessonsQuery.gte('lesson_date', startDate).lte('lesson_date', endDate);
    }
    
    const { data: lessons, error: lErr } = await lessonsQuery;
    if (lErr) throw lErr;

    const lessonIds = lessons.map(l => l.id);
    
    let attendance = [];
    if (lessonIds.length > 0) {
      // Fetch attendance only for those lessons
      const { data: attData, error: aErr } = await supabase
        .from('attendance')
        .select('id, lesson_id, student_id, status')
        .in('lesson_id', lessonIds);
        
      if (aErr) throw aErr;
      attendance = attData;
    }

    return NextResponse.json({
      groups: groups || [],
      students: students || [],
      lessons: lessons || [],
      attendance: attendance || []
    });

  } catch (err) {
    console.error('Reports API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
