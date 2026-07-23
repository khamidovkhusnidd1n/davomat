import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function checkAdminAuth(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid Authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  // Use admin client to reliably check role from users table bypassing RLS if needed,
  // or just normal query. Since we just need to read the user's own role, normal client works,
  // but using service role is safer to avoid any RLS issues during edge cases.
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  
  const { data: userData, error: userError } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userError || !userData || userData.role !== 'admin') {
    return { error: 'Unauthorized: Admin role required', status: 403 };
  }

  return { user, status: 200 };
}
