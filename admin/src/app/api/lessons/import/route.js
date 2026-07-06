import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const lessonsMap = new Map();

    // 2. Process each row
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
        // Automatically create the missing group
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

      // Format title: "15:00-16:20 | Mavzu nomi (O'qituvchi)"
      const startClean = String(boshlanish || '').replace('-', ':');
      const endClean = String(tugash || '').replace('-', ':');
      const timeStr = startClean && endClean ? `${startClean}-${endClean} | ` : '';
      const tutorStr = oqituvchi ? ` (${oqituvchi})` : '';
      
      const title = `${timeStr}${mavzu}${tutorStr}`;

      // Instead of array, use a Map to merge duplicates
      const key = `${matchedGroup.id}_${sana}`;
      if (lessonsMap.has(key)) {
        const existing = lessonsMap.get(key);
        existing.lesson.title += ` /// ${title}`;
        existing.rows.push(row);
      } else {
        lessonsMap.set(key, {
          lesson: {
            group_id: matchedGroup.id,
            lesson_date: sana,
            title: title
          },
          rows: [row]
        });
      }
    }

    const uniqueLessons = Array.from(lessonsMap.values());
    const finalLessonsToInsert = uniqueLessons.map(x => x.lesson);

    console.log(`Finished processing rows. Inserting ${finalLessonsToInsert.length} UNIQUE lessons...`);

    // 3. Bulk Insert
    if (finalLessonsToInsert.length > 0) {
      // Chunk the array if it's too big
      const CHUNK_SIZE = 200;
      for (let i = 0; i < finalLessonsToInsert.length; i += CHUNK_SIZE) {
        console.log(`Inserting chunk ${i} to ${i + CHUNK_SIZE}...`);
        const chunk = finalLessonsToInsert.slice(i, i + CHUNK_SIZE);
        const { data, error } = await adminSupabase
          .from('lessons')
          .upsert(chunk, { onConflict: 'group_id,lesson_date' })
          .select('id');

        if (error) {
          console.error('Chunk insert error:', error);
          return NextResponse.json({ error: 'Saqlashda xato: ' + error.message }, { status: 500 });
        } else if (data) {
          // Mark all successfully inserted
          for (let j = 0; j < data.length; j++) {
            const originalRows = uniqueLessons[i + j].rows;
            for (const r of originalRows) {
              success.push({ row: r, id: data[j].id });
            }
          }
        }
      }

      // Automatically extract and insert weekly schedules to populate Jadval page
      const schedulesMap = new Map();
      for (const les of finalLessonsToInsert) {
        const dateObj = new Date(les.lesson_date);
        let dayOfWeek = dateObj.getDay();
        if (dayOfWeek === 0) dayOfWeek = 7;
        
        // Extract first time slot from title if possible (e.g. "15:00-16:20 | Mavzu")
        let start = '15:00';
        let end = '16:00';
        const match = les.title.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
        if (match) {
          start = match[1];
          end = match[2];
        }

        const skey = `${les.group_id}_${dayOfWeek}`;
        if (!schedulesMap.has(skey)) {
          schedulesMap.set(skey, {
            group_id: les.group_id,
            day_of_week: dayOfWeek,
            start_time: start,
            end_time: end
          });
        }
      }

      const schedulesToInsert = Array.from(schedulesMap.values());
      if (schedulesToInsert.length > 0) {
        // Upsert schedules so we don't crash if they already exist
        await adminSupabase
          .from('schedules')
          .upsert(schedulesToInsert, { onConflict: 'group_id, day_of_week' })
          .select('id');
      }
    }

    console.log(`Import finished! Success: ${success.length}, Failed: ${failed.length}`);
    return NextResponse.json({ success, failed });

  } catch (err) {
    console.error('Lesson import xatosi:', err);
    return NextResponse.json({ error: 'Server xatosi: ' + err.message }, { status: 500 });
  }
}
