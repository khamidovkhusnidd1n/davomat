'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';
import ThemeToggle from '@/components/ThemeToggle';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      router.push('/dashboard');
    } catch (err) {
      // Agar Supabase bazasi hali to'ldirilmagan bo'lsa (seed.sql run qilinmagan bo'lsa),
      // va foydalanuvchi demo logindan foydalansa, tizimga kiritamiz.
      if (email === 'admin@itacademy.uz' && password === 'Admin123!') {
        router.push('/dashboard');
        return;
      }
      setError("Email yoki parol noto'g'ri. (Yoki Supabase bazasi bo'sh)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
      </div>
      
      <div className={styles.themeToggle}>
        <ThemeToggle />
      </div>

      <div className={styles.loginCardWrapper}>
        <div className={`card ${styles.loginCard}`}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>D</div>
            <h1 className={styles.logoText}>DAVOMAD</h1>
          </div>
          
          <h2 className={styles.title}>Tizimga kirish</h2>
          <p className={styles.subtitle}>Admin paneliga kirish uchun ma'lumotlaringizni kiriting</p>

          {error && (
            <div className={styles.errorAlert}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className={styles.form}>
            <div className="form-group">
              <label htmlFor="email">Email manzil</label>
              <div className={styles.inputWrapper}>
                <Mail className={styles.inputIcon} size={18} />
                <input
                  id="email"
                  type="email"
                  className="input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="admin@itacademy.uz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Parol</label>
              <div className={styles.inputWrapper}>
                <Lock className={styles.inputIcon} size={18} />
                <input
                  id="password"
                  type="password"
                  className="input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={loading}
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Kirilmoqda...</>
              ) : (
                'Tizimga kirish'
              )}
            </button>
          </form>
          
          <div className={styles.demoInfo}>
            <p><strong>Demo akkaunt:</strong></p>
            <p>Email: admin@itacademy.uz</p>
            <p>Parol: Admin123!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
