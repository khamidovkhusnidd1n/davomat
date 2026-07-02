'use client';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './layout.module.css';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      // Check demo bypass first for MVP testing without DB
      const isDemo = typeof window !== 'undefined' && localStorage.getItem('demo_login');
      if (isDemo) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);
  
  // Format pathname for header title
  const getPageTitle = () => {
    const path = pathname.split('/')[1];
    switch(path) {
      case 'dashboard': return 'Bosh sahifa';
      case 'students': return "O'quvchilar";
      case 'teachers': return "O'qituvchilar";
      case 'groups': return 'Guruhlar';
      case 'schedules': return 'Jadval';
      case 'lessons': return 'Darslar';
      case 'attendance': return 'Davomat';
      case 'reports': return 'Hisobotlar';
      case 'settings': return 'Sozlamalar';
      case 'profile': return 'Profil';
      default: return 'DAVOMAD';
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Yuklanmoqda...</div>;
  }

  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <h2 className={styles.pageTitle}>{getPageTitle()}</h2>
          </div>
          <div className={styles.headerRight}>
            <ThemeToggle />
          </div>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
