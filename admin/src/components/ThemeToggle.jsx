'use client';
import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark ? 'dark' : 'light';
    setIsDark(!isDark);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return (
    <button className={styles.toggle} onClick={toggleTheme} aria-label="Temani o'zgartirish">
      <div className={`${styles.iconWrapper} ${isDark ? styles.dark : styles.light}`}>
        {isDark ? <Moon size={20} /> : <Sun size={20} />}
      </div>
    </button>
  );
}
