import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/auth_check';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

// Fuzzy string matching helper
function levenshteinDistance(a, b) {
  const matrix = [];
  let i, j;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  for (i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

function findBestMatch(target, options) {
  if (!target || !options || options.length === 0) return null;
  target = target.toLowerCase().replace(/[^a-z0-9]/g, '');
  let bestMatch = null;
  let minDistance = Infinity;
  for (const opt of options) {
    const optClean = opt.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const distance = levenshteinDistance(target, optClean);
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = opt;
    }
  }
  // Allow a small error margin
  if (minDistance <= Math.max(2, target.length * 0.4)) {
    return bestMatch;
  }
  return null;
}

export async function POST(req) {
  try {
    const auth = await checkAdminAuth(req);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    console.log('Import API started');
    const { lessonsData } = await req.json();

    if (!lessonsData || !Array.isArray(lessonsData)) {
      return NextResponse.json({ error: 'Noma\'lum ma\'lumot formati' }, { status: 400 });
    }

    console.log(`Processing ${lessonsData.length} rows...`);

    // 1. Fetch all groups and tutors to map names to IDs
    const { data: allGroups } = await adminSupabase.from('groups').select('id, name');
    const { data: allTutors } = await adminSupabase.from('users').select('id, full_name').eq('role', 'tutor');

    const groupOptions = (allGroups || []).map(g => ({ id: g.id, name: g.name }));
    const tutorOptions = (allTutors || []).map(t => ({ id: t.id, name: t.full_name }));

    const success = [];
    const failed = [];
    const schedulesMap = new Map();
    const rowsToProcess = [];

    // 2. Process each row and identify unique schedules first
    for (let i = 0; i < lessonsData.length; i++) {
      const row = lessonsData[i];
      if (i % 100 === 0) console.log(`Processed ${i} rows...`);
      
      const guruhName = row.Guruh || row.guruh;
      const sana = row.Sana || row.sana;
      const boshlanish = row.Boshlanish || row.boshlanish;
      const tugash = row.Tugash || row.tugash;
      const mavzu = row.Mavzu || row.mavzu || 'Mavzusiz';
      const oqituvchi = row.Oqituvchi || row.oqituvchi;

      if (!guruhName || !sana) {
        failed.push({ row, reason: "Guruh nomi yoki sana yo'q" });
        continue;
      }

      // Find group
      let matchedGroup = findBestMatch(String(guruhName), groupOptions);
      if (!matchedGroup) {
        console.log(`Creating missing group: ${guruhName}`);
        const { data: newGroup, error: ngErr } = await adminSupabase
          .from('groups')
          .insert({
            name: String(guruhName),
            course_name: 'Noma\'lum',
            organization_id: '11111111-1111-1111-1111-111111111111'
          })
          .select('id, name')
          .single();
          
        if (ngErr) {
          failed.push({ row, reason: `Yangi guruh yaratishda xato: ${ngErr.message}` });
          continue;
        }
        
        matchedGroup = newGroup;
        groupOptions.push({ id: newGroup.id, name: newGroup.name });
      }

      // Calculate day of week
      const dateObj = new Date(sana);
      let dayOfWeek = dateObj.getDay();
      if (dayOfWeek === 0) dayOfWeek = 7;

      let start = '15:00';
      let end = '16:00';
      if (boshlanish) start = String(boshlanish).trim().replace('-', ':');
      if (tugash) end = String(tugash).trim().replace('-', ':');

      const skey = `${matchedGroup.id}_${dayOfWeek}_${start}`;
      if (!schedulesMap.has(skey)) {
        schedulesMap.set(skey, {
          group_id: matchedGroup.id,
          day_of_week: dayOfWeek,
          start_time: start,
          end_time: end
        });
      }

      rowsToProcess.push({
        row,
        groupId: matchedGroup.id,
        sana,
        start,
        end,
        mavzu,
        oqituvchi,
        dayOfWeek
      });
    }

    // 3. Upsert schedules first to obtain IDs
    const schedulesToInsert = Array.from(schedulesMap.values());
    const scheduleIdMap = new Map();

    if (schedulesToInsert.length > 0) {
      console.log(`Upserting ${schedulesToInsert.length} schedules...`);
      const { data: insertedSchedules, error: schErr } = await adminSupabase
        .from('schedules')
        .upsert(schedulesToInsert, { onConflict: 'group_id,day_of_week,start_time' })
        .select('id, group_id, day_of_week, start_time');

      if (schErr) {
        console.error('Schedules upsert error:', schErr);
        return NextResponse.json({ error: 'Jadvallarni saqlashda xato: ' + schErr.message }, { status: 500 });
      }

      if (insertedSchedules) {
        for (const s of insertedSchedules) {
          const skey = `${s.group_id}_${s.day_of_week}_${s.start_time}`;
          scheduleIdMap.set(skey, s.id);
        }
      }
    }

    // 4. Map lessons to schedule IDs and build unique lessons
    const lessonsMap = new Map();
    for (const item of rowsToProcess) {
      const skey = `${item.groupId}_${item.dayOfWeek}_${item.start}`;
      const scheduleId = scheduleIdMap.get(skey) || null;

      const timeStr = item.start && item.end ? `${item.start}-${item.end} | ` : '';
      const tutorStr = item.oqituvchi ? ` (${item.oqituvchi})` : '';
      const title = `${timeStr}${item.mavzu}${tutorStr}`;

      const lessonKey = `${item.groupId}_${item.sana}_${scheduleId}`;
      if (lessonsMap.has(lessonKey)) {
        const existing = lessonsMap.get(lessonKey);
        existing.lesson.title += ` /// ${title}`;
        existing.rows.push(item.row);
      } else {
        lessonsMap.set(lessonKey, {
          lesson: {
            group_id: item.groupId,
            lesson_date: item.sana,
            title: title,
            schedule_id: scheduleId
          },
          rows: [item.row]
        });
      }
    }

    const uniqueLessons = Array.from(lessonsMap.values());
    const finalLessonsToInsert = uniqueLessons.map(x => x.lesson);

    console.log(`Finished processing rows. Upserting ${finalLessonsToInsert.length} UNIQUE lessons...`);

    // 5. Bulk Upsert Lessons
    if (finalLessonsToInsert.length > 0) {
      const CHUNK_SIZE = 200;
      for (let i = 0; i < finalLessonsToInsert.length; i += CHUNK_SIZE) {
        console.log(`Upserting chunk ${i} to ${i + CHUNK_SIZE}...`);
        const chunk = finalLessonsToInsert.slice(i, i + CHUNK_SIZE);
        const { data, error } = await adminSupabase
          .from('lessons')
          .upsert(chunk, { onConflict: 'group_id,lesson_date,schedule_id' })
          .select('id');

        if (error) {
          console.error('Chunk insert error:', error);
          return NextResponse.json({ error: 'Saqlashda xato: ' + error.message }, { status: 500 });
        } else if (data) {
          for (let j = 0; j < data.length; j++) {
            const originalRows = uniqueLessons[i + j].rows;
            for (const r of originalRows) {
              success.push({ row: r, id: data[j].id });
            }
          }
        }
      }
    }

    console.log(`Import finished! Success: ${success.length}, Failed: ${failed.length}`);
    return NextResponse.json({ success, failed });

  } catch (err) {
    console.error('Lesson import xatosi:', err);
    return NextResponse.json({ error: 'Server xatosi: ' + err.message }, { status: 500 });
  }
}
