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

    const { full_name, phone, email, role, organization_id, group_id, password } = await request.json();

    if (!full_name || !role || !organization_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Login formatda auth email yaratish
    let finalLogin = email?.trim();
    let authEmail;

    if (finalLogin && finalLogin.includes('@')) {
      authEmail = finalLogin;
    } else if (finalLogin) {
      authEmail = `${finalLogin}@app.local`;
    } else {
      // Generate friendly login from full_name
      const words = full_name.toLowerCase().trim().split(/\s+/);
      const loginBase = (words[0] + (words[1] ? '_' + words[1] : '')).replace(/[^a-z0-9_]/g, '');
      const uniqueSuffix = Math.floor(Math.random() * 1000);
      finalLogin = `${loginBase}_${uniqueSuffix}`;
      authEmail = `${finalLogin}@app.local`;
    }

    const userPassword = password?.trim() || '123456';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: userPassword,
      email_confirm: true,
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2) Insert into public.users
    const { error: userError } = await supabaseAdmin.from('users').insert({
      id: userId,
      organization_id,
      full_name: full_name.trim(),
      email: finalLogin, // Generated yoki kiritilgan loginni saqlaymiz
      phone: phone?.trim() || null,
      role,
    });

    if (userError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw userError;
    }

    // 3) If student or monitor, add to group
    if (['student', 'monitor'].includes(role) && group_id) {
      const { error: studentError } = await supabaseAdmin.from('students').insert({
        user_id: userId,
        group_id,
        status: 'active',
      });
      if (studentError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        await supabaseAdmin.from('users').delete().eq('id', userId);
        throw studentError;
      }
      
      // Agar monitor bo'lsa, groups jadvalidagi monitor_id ni ham yangilash
      if (role === 'monitor') {
        await supabaseAdmin.from('groups').update({ monitor_id: userId }).eq('id', group_id);
      }
    }

    return Response.json({ success: true, userId, password: userPassword });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const auth = await checkAdminAuth(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

    const { id, full_name, phone, email, group_id, role, password } = await request.json();

    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    let finalLogin = email?.trim();
    if (finalLogin && !finalLogin.includes('@')) {
      finalLogin = finalLogin; // bu public.users uchun
    }
    
    const { error: userError } = await supabaseAdmin.from('users').update({
      full_name, phone, email: finalLogin
    }).eq('id', id);

    if (userError) throw userError;

    if (['student', 'monitor'].includes(role) && group_id) {
      const { data: updatedData, error: studentError } = await supabaseAdmin.from('students')
        .update({ group_id }).eq('user_id', id).select();
      if (studentError) throw studentError;
      
      if (!updatedData || updatedData.length === 0) {
        const { error: insertError } = await supabaseAdmin.from('students').insert({
          user_id: id,
          group_id,
          status: 'active'
        });
        if (insertError) throw insertError;
      }
      
      // Agar role monitor bo'lsa, groups dagi monitor_id ni ham yangilash
      if (role === 'monitor') {
        await supabaseAdmin.from('groups').update({ monitor_id: id }).eq('id', group_id);
      }
    }

    // Parol o'zgartirish
    if (password && password.trim().length >= 6) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: password.trim(),
      });
      if (authError) throw authError;
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const auth = await checkAdminAuth(request);
    if (auth.error) return Response.json({ error: auth.error }, { status: auth.status });

    const { id } = await request.json();
    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    // Since auth.users has ON DELETE CASCADE to public.users, deleting auth user will delete everything
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
