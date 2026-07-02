'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';
import ThemeToggle from '@/components/ThemeToggle';

export default function Login() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Login ni email formatga o'girish (Supabase auth email talab qiladi)
      const email = login.includes('@') ? login : `${login}@app.local`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (typeof window !== 'undefined') localStorage.removeItem('demo_login');
      router.push('/dashboard');
    } catch (err) {
      setError("Login yoki parol noto'g'ri");
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
              <label htmlFor="login">Login</label>
              <div className={styles.inputWrapper}>
                <User className={styles.inputIcon} size={18} />
                <input
                  id="login"
                  type="text"
                  className="input"
                  style={{ paddingLeft: '40px' }}
                  placeholder="admin"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
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
            <p><strong>Admin kirish:</strong></p>
            <p>Login: admin</p>
            <p>Parol: Admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
