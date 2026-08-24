import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { historicalData } = await request.json();

    if (!historicalData || !historicalData.length) {
      return NextResponse.json({ message: "Fayl bo'sh", success: [], errors: [] }, { status: 400 });
    }

    // Load necessary dictionaries
    const { data: orgData } = await supabase.from('organizations').select('id').limit(1);
    const orgId = orgData?.[0]?.id || 1;

    // We will just use the current active academic year for these or a default one
    const { data: ayData } = await supabase.from('academic_years').select('id, name').eq('status', 'active').limit(1);
    const ayId = ayData?.[0]?.id || 1;

    const { data: teachers } = await supabase.from('teachers').select('id, full_name');
    const { data: subjects } = await supabase.from('subjects').select('id, name');
    const { data: groups } = await supabase.from('groups').select('id, name');

    const success = [];
    const errors = [];
    const newLessons = [];

    for (const row of historicalData) {
      const tName = String(row["O'qituvchi F.I.Sh"] || '').trim();
      const sName = String(row["Fan nomi"] || '').trim();
      const gName = String(row["Guruh nomi"] || '').trim();
      const theoryHours = parseInt(row["Nazariy soat"]) || 0;
      const practiceHours = parseInt(row["Amaliy soat"]) || 0;

      if (!tName) continue;

      const teacher = teachers.find(t => t.full_name.toLowerCase() === tName.toLowerCase());
      if (!teacher) {
        errors.push({ teacher: tName, reason: "O'qituvchi bazadan topilmadi" });
        continue;
      }

      const subject = subjects.find(s => s.name.toLowerCase() === sName.toLowerCase());
      if (!subject) {
        errors.push({ teacher: tName, reason: `Fan topilmadi: ${sName}` });
        continue;
      }

      const group = groups.find(g => g.name.toLowerCase() === gName.toLowerCase());
      if (!group) {
        errors.push({ teacher: tName, reason: `Guruh topilmadi: ${gName}` });
        continue;
      }

      if (theoryHours === 0 && practiceHours === 0) {
        errors.push({ teacher: tName, reason: "Soat kiritilmagan" });
        continue;
      }

      // Helper to generate chunks
      const generateChunks = (hours, type) => {
        let remaining = hours;
        while (remaining > 0) {
          if (remaining >= 2) {
            newLessons.push({
              organization_id: orgId,
              academic_year: ayId,
              teacher_id: teacher.id,
              subject_id: subject.id,
              group_id: group.id,
              lesson_type: type,
              title: 'O\'tilgan eski soatlar',
              lesson_date: '2024-01-01',
              start_time: '09:00',
              end_time: '10:30' // 90 min = 2 acad hours
            });
            remaining -= 2;
          } else {
            // 1 hour
            newLessons.push({
              organization_id: orgId,
              academic_year: ayId,
              teacher_id: teacher.id,
              subject_id: subject.id,
              group_id: group.id,
              lesson_type: type,
              title: 'O\'tilgan eski soatlar',
              lesson_date: '2024-01-01',
              start_time: '09:00',
              end_time: '09:45' // 45 min = 1 acad hour
            });
            remaining -= 1;
          }
        }
      };

      if (theoryHours > 0) generateChunks(theoryHours, 'theory');
      if (practiceHours > 0) generateChunks(practiceHours, 'practice');

      success.push({ teacher: tName });
    }

    if (newLessons.length > 0) {
      // Chunk insert to avoid big payload
      const chunkSize = 100;
      for (let i = 0; i < newLessons.length; i += chunkSize) {
        const chunk = newLessons.slice(i, i + chunkSize);
        const { error } = await supabase.from('lessons').insert(chunk);
        if (error) {
          console.error("Insert error", error);
          throw error;
        }
      }
    }

    return NextResponse.json({ 
      success, 
      errors, 
      message: `${success.length} ta yozuv bazaga kiritildi. Topilmagan: ${errors.length} ta` 
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ message: "Xatolik yuz berdi" }, { status: 500 });
  }
}
