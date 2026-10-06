'use client';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Menu, X } from 'lucide-react';
import styles from './layout.module.css';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
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
        const { data: user } = await supabase.from('users').select('id, full_name, role').eq('id', session.user.id).single();
        if (user) {
          setCurrentUser(user);
          if (user.full_name?.includes('Guldona') || user.full_name?.includes('Dilnavoz')) {
            setShowNotification(true);
          }
        }
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

  // Sahifa o'zgarganda sidebar yopilsin
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const getPageTitle = () => {
    const path = pathname.split('/')[1];
    switch(path) {
      case 'dashboard': return 'Bosh sahifa';
      case 'students': return "Tinglovchilar";
      case 'tutors': return "Nazoratchilar";
      case 'teachers': return "O'qituvchilar";
      case 'groups': return 'Guruhlar';
      case 'schedules': return 'Jadval';
      case 'lessons': return 'Darslar';
      case 'attendance': return 'Davomat';
      case 'reports': return 'Hisobotlar';
      case 'settings': return 'Sozlamalar';
      case 'profile': return 'Profil';
      case 'soc': return 'SOC Desk';
      case 'courses': return 'Kurs Monitoring';
      default: return 'DAVOMAT';
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Yuklanmoqda...</div>;
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar orqasidagi overlay — bossang yopiladi */}
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {/* Hamburger tugmasi — faqat mobilda ko'rinadi */}
            <button
              className={styles.hamburger}
              onClick={() => setSidebarOpen(prev => !prev)}
              aria-label="Menyuni ochish"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h2 className={styles.pageTitle}>{getPageTitle()}</h2>
          </div>
          <div className={styles.headerRight}>
            <ThemeToggle />
          </div>
        </header>
        {showNotification && (
          <div style={{ backgroundColor: '#ffedd5', color: '#9a3412', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 20px 20px', borderRadius: '8px', borderLeft: '4px solid #f97316' }}>
            <span><strong>Eslatma:</strong> O'zingizga tegishli guruh uchun bugungi davomatni web paneldan kiritishingiz mumkin!</span>
            <button onClick={() => setShowNotification(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a3412' }}><X size={18}/></button>
          </div>
        )}
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
}
