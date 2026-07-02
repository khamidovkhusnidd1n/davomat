import { createClient } from '@supabase/supabase-js';

// Service Role key kerak — bu faqat server-side ishlaydi
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Service Role Key (maxfiy)
);

export async function POST(request) {
  try {
    const { students, groupId, organizationId } = await request.json();

    if (!students || !groupId || !organizationId) {
      return Response.json({ error: 'students, groupId, organizationId kerak' }, { status: 400 });
    }

    const results = { success: [], failed: [] };

    for (const student of students) {
      const { full_name, phone, email } = student;

      if (!full_name?.trim()) {
        results.failed.push({ full_name, reason: 'Ism bo\'sh' });
        continue;
      }

      // 1) auth.users yaratish (email yoki phone orqali)
      const words = full_name.toLowerCase().trim().split(/\s+/);
      const loginBase = (words[0] + (words[1] ? '_' + words[1] : '')).replace(/[^a-z0-9_]/g, '');
      const uniqueSuffix = Math.floor(Math.random() * 10000);
      
      const finalLogin = email?.trim() || `${loginBase}_${uniqueSuffix}`;
      const authEmail = finalLogin.includes('@') ? finalLogin : `${finalLogin}@app.local`;
      const tempPassword = '123456'; // Default parol

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: tempPassword,
        email_confirm: true,
      });

      if (authError) {
        results.failed.push({ full_name, reason: authError.message });
        continue;
      }

      const userId = authData.user.id;

      // 2) public.users yaratish
      const { error: userError } = await supabaseAdmin.from('users').insert({
        id: userId,
        organization_id: organizationId,
        full_name: full_name.trim(),
        email: finalLogin, // Generated loginni ko'rinishi uchun public.users ga saqlaymiz
        phone: phone?.trim() || null,
        role: 'student',
      });

      if (userError) {
        // Rollback: auth user o'chir
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.failed.push({ full_name, reason: userError.message });
        continue;
      }

      // 3) public.students yaratish
      const { error: studentError } = await supabaseAdmin.from('students').insert({
        user_id: userId,
        group_id: groupId,
        status: 'active',
      });

      if (studentError) {
        // Rollback
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        results.failed.push({ full_name, reason: studentError.message });
        continue;
      }

      results.success.push({ full_name, userId });
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
