'use client';
import Sidebar from '@/components/Sidebar';
import ThemeToggle from '@/components/ThemeToggle';
import { usePathname } from 'next/navigation';
import styles from './layout.module.css';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  
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
