'use client';
import { Users, GraduationCap, BookOpen, CalendarClock, TrendingUp, UserMinus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import styles from './page.module.css';

const weekData = [
  { name: 'Dush', foiz: 95 },
  { name: 'Sesh', foiz: 92 },
  { name: 'Chor', foiz: 96 },
  { name: 'Pay', foiz: 90 },
  { name: 'Jum', foiz: 98 },
  { name: 'Shan', foiz: 85 },
];

const monthData = [
  { name: '1-hafta', foiz: 94 },
  { name: '2-hafta', foiz: 92 },
  { name: '3-hafta', foiz: 96 },
  { name: '4-hafta', foiz: 95 },
];

const activities = [
  { id: 1, title: 'Yangi o\'quvchi qo\'shildi', desc: 'Ali Valiyev "Frontend 101" guruhiga qo\'shildi', time: '10 daqiqa oldin', type: 'student' },
  { id: 2, title: 'Davomat belgilandi', desc: 'Backend-02 guruhi uchun davomat kiritildi', time: '1 soat oldin', type: 'attendance' },
  { id: 3, title: 'Yangi guruh ochildi', desc: 'UI/UX Design guruhi yaratildi', time: '3 soat oldin', type: 'group' },
  { id: 4, title: 'O\'qituvchi tayinlandi', desc: 'Hasanov Javlon yangi guruhga biriktirildi', time: 'Kecha, 15:30', type: 'teacher' },
];

export default function Dashboard() {
  return (
    <div className={styles.container}>
      
      {/* STATS CARDS */}
      <div className={styles.statsGrid}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <GraduationCap size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Jami O'quvchilar</p>
            <h3 className={styles.statValue}>1,250</h3>
            <span className={styles.statTrend} data-trend="up">+12% joriy oyda</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Jami O'qituvchilar</p>
            <h3 className={styles.statValue}>45</h3>
            <span className={styles.statTrend} data-trend="neutral">O'zgarmagan</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <BookOpen size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Jami Guruhlar</p>
            <h3 className={styles.statValue}>82</h3>
            <span className={styles.statTrend} data-trend="up">+3 ta yangi</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--info-light)', color: '#3b82f6' }}>
            <CalendarClock size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Bugungi Darslar</p>
            <h3 className={styles.statValue}>24</h3>
            <span className={styles.statTrend} data-trend="neutral">Hozir: 8 ta faol</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Davomat Foizi</p>
            <h3 className={styles.statValue}>94.5%</h3>
            <span className={styles.statTrend} data-trend="up">+2.1% o'sish</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--error-light)', color: 'var(--error)' }}>
            <UserMinus size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Kelmaganlar</p>
            <h3 className={styles.statValue}>18</h3>
            <span className={styles.statTrend} data-trend="down">Bugungi kunda</span>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* CHARTS */}
        <div className={styles.chartsSection}>
          <div className={`card ${styles.chartCard}`}>
            <h3 className={styles.sectionTitle}>Haftalik Davomat K'orsatkichi</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{ fill: 'var(--primary-light)' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow)', background: 'var(--bg-sidebar)' }} 
                  />
                  <Bar dataKey="foiz" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`card ${styles.chartCard}`}>
            <h3 className={styles.sectionTitle}>Oylik Trend (Foiz)</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} domain={[80, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow)', background: 'var(--bg-sidebar)' }} 
                  />
                  <Line type="monotone" dataKey="foiz" stroke="var(--success)" strokeWidth={3} dot={{ r: 4, fill: 'var(--success)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className={`card ${styles.activityCard}`}>
          <h3 className={styles.sectionTitle}>So'nggi Faoliyat</h3>
          <div className={styles.activityList}>
            {activities.map(activity => (
              <div key={activity.id} className={styles.activityItem}>
                <div className={styles.activityDot}></div>
                <div className={styles.activityContent}>
                  <h4>{activity.title}</h4>
                  <p>{activity.desc}</p>
                  <span className={styles.activityTime}>{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
          <button className={`btn btn-secondary ${styles.viewAllBtn}`}>Barchasini ko'rish</button>
        </div>
      </div>
    </div>
  );
}
