import { createClient } from '@supabase/supabase-js';
import { checkAdminAuth } from '@/lib/auth_check';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const auth = await checkAdminAuth(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

    const { schedules, groupId, organizationId } = await request.json();

    if (!schedules || !groupId || !organizationId) {
      return Response.json({ error: 'schedules, groupId, organizationId kerak' }, { status: 400 });
    }

    const results = { success: [], failed: [] };

    for (const schedule of schedules) {
      const { hafta_kuni, boshlanish_vaqti, tugash_vaqti } = schedule;

      let dayOfWeek = parseInt(hafta_kuni, 10);
      if (isNaN(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
        results.failed.push({ 
          day_of_week: hafta_kuni, 
          start_time: boshlanish_vaqti, 
          reason: 'Hafta kuni 1 dan 7 gacha bo\'lishi kerak' 
        });
        continue;
      }

      // Check format HH:mm
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(boshlanish_vaqti) || !timeRegex.test(tugash_vaqti)) {
        results.failed.push({ 
          day_of_week: hafta_kuni, 
          start_time: boshlanish_vaqti, 
          reason: 'Vaqt formati noto\'g\'ri (Masalan: 14:00)' 
        });
        continue;
      }

      const { data, error } = await supabaseAdmin.from('schedules').insert({
        group_id: groupId,
        day_of_week: dayOfWeek,
        start_time: boshlanish_vaqti,
        end_time: tugash_vaqti,
      });

      if (error) {
        results.failed.push({ 
          day_of_week: hafta_kuni, 
          start_time: boshlanish_vaqti, 
          reason: error.message 
        });
        continue;
      }

      results.success.push({ day_of_week: dayOfWeek, start_time: boshlanish_vaqti });
    }

    return Response.json({
      message: `${results.success.length} ta muvaffaqiyatli, ${results.failed.length} ta xatolik`,
      success: results.success,
      failed: results.failed,
    });

  } catch (err) {
    console.error('Import error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
