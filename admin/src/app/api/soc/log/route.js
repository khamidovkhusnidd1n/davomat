import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { event_type, username, details, severity = 'INFO' } = body;

    // Get client IP and User-Agent
    const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';

    // Insert log using Supabase RPC or direct insert (if RLS bypassed via service role)
    const { error } = await supabaseAdmin.rpc('log_security_event', {
      p_event_type: event_type,
      p_username: username,
      p_ip: ip_address,
      p_user_agent: user_agent,
      p_severity: severity,
      p_details: details || {}
    });

    if (error) {
      console.error('SOC Log error:', error);
      // Fallback: direct insert in case RPC isn't created yet
      const { error: insertErr } = await supabaseAdmin
        .from('security_events')
        .insert([{
          event_type,
          username,
          ip_address,
          user_agent,
          severity,
          details: details || {}
        }]);
      
      if (insertErr) {
        return NextResponse.json({ error: 'Failed to log event' }, { status: 500 });
      }
    }

    // Check for brute force (if login failed)
    if (event_type === 'login_failed') {
      // Very basic check: Get count of failed logins for this user/ip in last 5 minutes
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: recentFails } = await supabaseAdmin
        .from('security_events')
        .select('id')
        .eq('event_type', 'login_failed')
        .eq('username', username)
        .gte('created_at', fiveMinsAgo);

      if (recentFails && recentFails.length >= 4) { // This is the 5th attempt
        // Log a brute force alert
        await supabaseAdmin.rpc('log_security_event', {
          p_event_type: 'brute_force_detected',
          p_username: username,
          p_ip: ip_address,
          p_user_agent: user_agent,
          p_severity: 'HIGH',
          p_details: { message: `Multiple failed logins detected (${recentFails.length + 1} attempts)` }
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('SOC API Error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
