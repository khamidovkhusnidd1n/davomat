import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { full_name, phone, email, role, organization_id, group_id, password } = await request.json();

    if (!full_name || !role || !organization_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Login formatda auth email yaratish
    const login = full_name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const authEmail = email?.trim() || `${login || Date.now()}@app.local`;
    const userPassword = password?.trim() || (Math.random().toString(36).slice(-10) + 'Aa1!');

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
      email: email?.trim() || null,
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
    }

    return Response.json({ success: true, userId, password: userPassword });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { id, full_name, phone, email, group_id, role, password } = await request.json();

    if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

    const { error: userError } = await supabaseAdmin.from('users').update({
      full_name, phone, email
    }).eq('id', id);

    if (userError) throw userError;

    if (['student', 'monitor'].includes(role) && group_id) {
      const { error: studentError } = await supabaseAdmin.from('students')
        .update({ group_id }).eq('user_id', id);
      if (studentError) throw studentError;
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
