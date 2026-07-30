import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export function useUserRole() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function getRole() {
      try {
        const isDemo = typeof window !== 'undefined' && localStorage.getItem('demo_login');
        if (isDemo) {
          setRole('sysadmin');
          setUser({ id: 'demo', email: 'demo@app.local' });
          setLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          setUser(session.user);
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (userData) {
            setRole(userData.role);
          }
        }
      } catch (e) {
        console.error('Error fetching user role:', e);
      } finally {
        setLoading(false);
      }
    }
    getRole();
  }, []);

  return { role, loading, user };
}
