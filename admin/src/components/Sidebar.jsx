'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/lib/useUserRole';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  BookOpen, 
  CalendarDays, 
  CalendarClock, 
  ClipboardCheck, 
  BarChart3, 
  Settings, 
  User, 
  LogOut,
  UserCheck
} from 'lucide-react';
import styles from './Sidebar.module.css';

const menuItems = [
  { name: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard },
  { name: "O'quvchilar", path: '/students', icon: GraduationCap },
  { name: "Nazoratchilar", path: '/tutors', icon: Users },
  { name: "O'qituvchilar", path: '/teachers', icon: UserCheck },
  { name: 'Guruhlar', path: '/groups', icon: BookOpen },
  { name: 'Jadval', path: '/schedules', icon: CalendarDays },
  { name: 'Darslar', path: '/lessons', icon: CalendarClock },
  { name: 'Davomat', path: '/attendance', icon: ClipboardCheck },
  { name: 'Hisobotlar', path: '/reports', icon: BarChart3 },
];

const bottomItems = [
  { name: 'Sozlamalar', path: '/settings', icon: Settings },
  { name: 'Profil', path: '/profile', icon: User },
];

const ROLE_LABELS = {
  sysadmin: 'SYSADMIN',
  admin: 'Admin',
  director: 'Direktor',
  academic: "O'quv Admini",
  nazoratchi: 'Nazoratchi',
  monitor: 'Sinf sardori',
  student: 'Tinglovchi'
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, loading, user } = useUserRole();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (user && user.id !== 'demo') {
      supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfile(data);
        });
    } else if (user && user.id === 'demo') {
      setProfile({ full_name: 'Demo Admin' });
    }
  }, [user]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem('demo_login');
    supabase.auth.signOut().then(() => {
      router.push('/login');
    });
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (loading || !role) return false;
    if (role === 'director') {
      return ['/dashboard', '/students', '/tutors', '/teachers', '/groups', '/attendance', '/reports'].includes(item.path);
    }
    if (role === 'academic') {
      return ['/dashboard', '/students', '/tutors', '/teachers', '/groups', '/schedules', '/lessons', '/attendance', '/reports'].includes(item.path);
    }
    return true; // sysadmin and admin can see all
  });

  const filteredBottomItems = bottomItems.filter(item => {
    if (loading || !role) return false;
    if (item.path === '/settings') {
      return role === 'sysadmin'; // Only sysadmin sees settings
    }
    return true; // Everyone sees profile
  });

  const displayName = profile?.full_name || 'Yuklanmoqda...';
  const displayRole = ROLE_LABELS[role] || 'Boshqaruvchi';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>D</div>
        <span className={styles.logoText}>DAVOMAT</span>
      </div>

      <div className={styles.menuWrapper}>
        <nav className={styles.nav}>
          <div className={styles.navGroup}>
            <span className={styles.navLabel}>ASOSIY</span>
            {!loading && filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
              
              return (
                <Link 
                  href={item.path} 
                  key={item.path}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Icon size={20} className={styles.icon} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navLabel}>TIZIM</span>
            {!loading && filteredBottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              
              return (
                <Link 
                  href={item.path} 
                  key={item.path}
                  className={`${styles.navItem} ${isActive ? styles.active : ''}`}
                >
                  <Icon size={20} className={styles.icon} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{avatarLetter}</div>
          <div className={styles.userDetails}>
            <span className={styles.userName} title={displayName}>{displayName}</span>
            <span className={styles.userRole}>{displayRole}</span>
          </div>
        </div>
        <button className={styles.logoutBtn} title="Tizimdan chiqish" onClick={handleLogout}>
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
