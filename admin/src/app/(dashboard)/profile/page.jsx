'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserRole } from '@/lib/useUserRole';
import { User, Phone, Mail, Shield, Key, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import styles from './page.module.css';

const ROLE_LABELS = {
  sysadmin: 'System Administrator (SYSADMIN)',
  admin: 'Administrator (Admin)',
  director: 'Director (Direktor)',
  academic: 'Academic Affairs Admin (O\'quv Admini)',
  teacher: 'Teacher (O\'qituvchi)',
  student: 'Student (Tinglovchi)'
};

export default function ProfilePage() {
  const { role, loading: roleLoading, user } = useUserRole();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [detailsData, setDetailsData] = useState({ full_name: '', phone: '' });
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  
  const [updatingDetails, setUpdatingDetails] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (user.id === 'demo') {
        setProfile({
          full_name: 'Demo Admin',
          phone: '+998 99 123 45 67',
          email: 'demo@app.local',
          created_at: new Date().toISOString()
        });
        setDetailsData({
          full_name: 'Demo Admin',
          phone: '+998 99 123 45 67'
        });
        setLoading(false);
      } else {
        fetchProfile();
      }
    }
  }, [user]);

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setProfile(data);
      setDetailsData({
        full_name: data.full_name || '',
        phone: data.phone || ''
      });
    } catch (e) {
      console.error(e);
      setError('Profil ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (user.id === 'demo') {
      setError('');
      setSuccess('Tafsilotlar muvaffaqiyatli yangilandi (Demo)');
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    try {
      setUpdatingDetails(true);
      setError('');
      setSuccess('');
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: detailsData.full_name,
          phone: detailsData.phone
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      setSuccess('Profil ma\'lumotlari muvaffaqiyatli yangilandi!');
      setProfile(prev => ({ ...prev, ...detailsData }));
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingDetails(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Yangi parollar mos kelmadi');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
      return;
    }

    if (user.id === 'demo') {
      setError('');
      setSuccess('Parol muvaffaqiyatli o\'zgartirildi (Demo)');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
      return;
    }

    try {
      setUpdatingPassword(true);
      setError('');
      setSuccess('');

      const { error: passwordError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (passwordError) throw passwordError;

      setSuccess('Parolingiz muvaffaqiyatli yangilandi!');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (roleLoading || loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader className={styles.spinner} size={40} />
        <span>Yuklanmoqda...</span>
      </div>
    );
  }

  const avatarLetter = profile?.full_name?.charAt(0).toUpperCase() || 'U';

  return (
    <div className={styles.container}>
      {success && (
        <div className={styles.alert + ' ' + styles.alertSuccess}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className={styles.alert + ' ' + styles.alertError}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.layout}>
        {/* Left Side: Avatar and Quick Stats */}
        <div className={styles.leftCol}>
          <div className={"card " + styles.profileCard}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarBig}>{avatarLetter}</div>
            </div>
            <h2 className={styles.userName}>{profile?.full_name}</h2>
            <div className={styles.roleBadge}>
              <Shield size={14} />
              <span>{ROLE_LABELS[role] || role}</span>
            </div>
            
            <div className={styles.userInfoList}>
              <div className={styles.infoItem}>
                <Mail size={16} />
                <span>{profile?.email || '-'}</span>
              </div>
              <div className={styles.infoItem}>
                <Phone size={16} />
                <span>{profile?.phone || '-'}</span>
              </div>
            </div>

            <div className={styles.metaInfo}>
              <span>Tizimda ro'yxatdan o'tgan:</span>
              <strong>{new Date(profile?.created_at).toLocaleDateString('uz-UZ')}</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Forms */}
        <div className={styles.rightCol}>
          {/* Card 1: Details Update */}
          <div className="card">
            <div className={styles.cardHeader}>
              <User size={20} className={styles.cardIcon} />
              <h3>Profil Tafsilotlari</h3>
            </div>
            <form onSubmit={handleUpdateDetails} className={styles.form}>
              <div className="form-group">
                <label>F.I.Sh *</label>
                <input 
                  type="text" 
                  className="input" 
                  value={detailsData.full_name}
                  onChange={e => setDetailsData({ ...detailsData, full_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Telefon raqami</label>
                <input 
                  type="text" 
                  className="input" 
                  value={detailsData.phone}
                  onChange={e => setDetailsData({ ...detailsData, phone: e.target.value })}
                  placeholder="+998 90 123 45 67"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={updatingDetails}>
                {updatingDetails ? 'Saqlanmoqda...' : 'Tafsilotlarni saqlash'}
              </button>
            </form>
          </div>

          {/* Card 2: Password Change */}
          <div className="card" style={{ marginTop: '24px' }}>
            <div className={styles.cardHeader}>
              <Key size={20} className={styles.cardIcon} />
              <h3>Parolni o'zgartirish</h3>
            </div>
            <form onSubmit={handleUpdatePassword} className={styles.form}>
              <div className="form-group">
                <label>Yangi parol *</label>
                <input 
                  type="password" 
                  className="input" 
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Kamida 6 ta belgi"
                  required
                />
              </div>
              <div className="form-group">
                <label>Yangi parolni tasdiqlash *</label>
                <input 
                  type="password" 
                  className="input" 
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Yangi parolni qayta yozing"
                  required
                />
              </div>
              <button type="submit" className="btn btn-secondary" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }} disabled={updatingPassword}>
                {updatingPassword ? 'Yangilanmoqda...' : 'Parolni yangilash'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
