'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
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
  LogOut 
} from 'lucide-react';
import styles from './Sidebar.module.css';

const menuItems = [
  { name: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard },
  { name: "O'quvchilar", path: '/students', icon: GraduationCap },
  { name: "O'qituvchilar", path: '/tutors', icon: Users },
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

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    if (typeof window !== 'undefined') localStorage.removeItem('demo_login');
    router.push('/login');
  };

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
            {menuItems.map((item) => {
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
            {bottomItems.map((item) => {
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
          <div className={styles.avatar}>A</div>
          <div className={styles.userDetails}>
            <span className={styles.userName}>Admin</span>
            <span className={styles.userRole}>Boshqaruvchi</span>
          </div>
        </div>
        <button className={styles.logoutBtn} title="Tizimdan chiqish" onClick={handleLogout}>
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}
