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

    const { rows, organizationId } = await request.json();

    if (!rows || !organizationId) {
      return Response.json({ error: 'rows va organizationId kerak' }, { status: 400 });
    }

    const results = { success: [], failed: [] };
    const groupCache = {}; // Cache to store group names and their resolved IDs

    for (const row of rows) {
      const groupName = row['Guruh Nomi'] || row['guruh_nomi'] || row['Guruh'] || row['guruh'];
      const courseName = row['Fan Nomi'] || row['fan_nomi'] || row['Fan'] || row['fan'] || 'Umumiy';
      const studentName = row['Talaba F.I.Sh'] || row['talaba_fish'] || row['O\'quvchi'] || row['o\'quvchi'] || row['Ism'] || row['ism'];
      const phone = row['Telefon raqami'] || row['telefon_raqami'] || row['Telefon'] || row['telefon'] || row['phone'];

      if (!groupName || !String(groupName).trim()) {
        results.failed.push({ row, reason: "Guruh nomi bo'sh" });
        continue;
      }

      const cleanGroupName = String(groupName).trim();
      const cleanCourseName = courseName ? String(courseName).trim() : 'Umumiy';

      // 1) Guruhni topish yoki yaratish
      let groupId = groupCache[cleanGroupName];
      if (!groupId) {
        // DBdan qidirib ko'ramiz
        const { data: existingGroup } = await supabaseAdmin
          .from('groups')
          .select('id')
          .eq('name', cleanGroupName)
          .maybeSingle();

        if (existingGroup) {
          groupId = existingGroup.id;
        } else {
          // Guruh yaratamiz
          const { data: newGroup, error: groupErr } = await supabaseAdmin
            .from('groups')
            .insert({
              organization_id: organizationId,
              name: cleanGroupName,
              course_name: cleanCourseName
            })
            .select('id')
            .single();

          if (groupErr) {
            results.failed.push({ row, reason: `Guruh yaratishda xatolik: ${groupErr.message}` });
            continue;
          }
          groupId = newGroup.id;
        }
        groupCache[cleanGroupName] = groupId;
      }

      // Agar o'quvchi ismi bo'lmasa, shunchaki guruhni o'zini yaratgan bo'ladi, buni muvaffaqiyatli deb hisoblaymiz
      if (!studentName || !String(studentName).trim()) {
        results.success.push({ groupName: cleanGroupName, studentName: null, reason: "Faqat guruh yaratildi" });
        continue;
      }

      const cleanStudentName = String(studentName).trim();

      // 2) O'quvchi yaratish
      const words = cleanStudentName.toLowerCase().split(/\s+/);
      const loginBase = (words[0] + (words[1] ? '_' + words[1] : '')).replace(/[^a-z0-9_]/g, '');
      const uniqueSuffix = Math.floor(Math.random() * 10000);
      
      const cleanPhone = phone ? String(phone).trim() : '';
      const finalLogin = cleanPhone.replace(/[^0-9]/g, '') || `${loginBase}_${uniqueSuffix}`;
      const authEmail = finalLogin.includes('@') ? finalLogin : `${finalLogin}@app.local`;
      const tempPassword = 'Student123!'; // Default password

      // Auth user yaratish
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: tempPassword,
        email_confirm: true,
      });

      if (authError) {
        results.failed.push({ row, reason: `O'quvchi auth yaratishda xatolik: ${authError.message}` });
        continue;
      }

      const userId = authData.user.id;

      // public.users ga saqlash
      const { error: userError } = await supabaseAdmin.from('users').insert({
        id: userId,
        organization_id: organizationId,
        full_name: cleanStudentName,
        email: authEmail,
        phone: cleanPhone || null,
        role: 'student',
      });

      if (userError) {
        // Rollback auth user
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.failed.push({ row, reason: `O'quvchi profili yaratishda xatolik: ${userError.message}` });
        continue;
      }

      // public.students ga saqlash
      const { error: studentError } = await supabaseAdmin.from('students').insert({
        user_id: userId,
        group_id: groupId,
        status: 'active',
      });

      if (studentError) {
        // Rollback public.users and auth
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.failed.push({ row, reason: `O'quvchini guruhga biriktirishda xatolik: ${studentError.message}` });
        continue;
      }

      results.success.push({ groupName: cleanGroupName, studentName: cleanStudentName, userId });
    }

    return Response.json({
      message: `${results.success.length} ta yozuv muvaffaqiyatli kiritildi, ${results.failed.length} ta xatolik`,
      success: results.success,
      failed: results.failed,
    });

  } catch (err) {
    console.error('Import groups/students error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
