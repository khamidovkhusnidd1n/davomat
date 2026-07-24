'use client';
import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, CalendarClock, TrendingUp, UserMinus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

// Using the same mock charts data for now since generating historical chart data requires complex SQL 
// and we want to focus on the top stats cards and real recent activity.
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

export default function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    groups: 0,
    lessonsToday: 0,
    attendanceRate: 0,
    absentToday: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch students count
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
        
        // Fetch teachers count
        const { count: teacherCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
        
        // Fetch groups count
        const { count: groupCount } = await supabase.from('groups').select('*', { count: 'exact', head: true });
        
        // Fetch today's lessons count
        const { count: lessonsCount } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('lesson_date', today);

        // Fetch attendance for today
        const { data: attendanceData } = await supabase.from('attendance')
          .select('status, lessons!inner(lesson_date)')
          .eq('lessons.lesson_date', today);

        let absent = 0;
        let present = 0;
        let late = 0;
        if (attendanceData) {
          attendanceData.forEach(record => {
            if (record.status === 'absent' || record.status === 'excused' || record.status === 'unexcused') absent++;
            else if (record.status === 'present') present++;
            else if (record.status === 'late') late++;
          });
        }
        
        const totalAttendance = present + absent + late;
        const rate = totalAttendance > 0 ? ((present + late) / totalAttendance * 100).toFixed(1) : 0;

        setStats({
          students: studentCount || 0,
          teachers: teacherCount || 0,
          groups: groupCount || 0,
          lessonsToday: lessonsCount || 0,
          attendanceRate: rate,
          absentToday: absent
        });

        // Set some dummy recent activity
        setActivities([
          { id: 1, title: 'Tizim ishga tushdi', desc: 'Davomat statistikasi real vaqtda yangilanmoqda', time: 'Hozir', type: 'system' }
        ]);

      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className={styles.container}>
      {/* STATS CARDS */}
      <div className={styles.statsGrid}>
        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <GraduationCap size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Jami Tinglovchilar</p>
            <h3 className={styles.statValue}>{loading ? '...' : stats.students}</h3>
            <span className={styles.statTrend} data-trend="neutral">Faol o'quvchilar</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
            <Users size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Jami O'qituvchilar</p>
            <h3 className={styles.statValue}>{loading ? '...' : stats.teachers}</h3>
            <span className={styles.statTrend} data-trend="neutral">Faol o'qituvchilar</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--warning-light)', color: 'var(--warning)' }}>
            <BookOpen size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Jami Guruhlar</p>
            <h3 className={styles.statValue}>{loading ? '...' : stats.groups}</h3>
            <span className={styles.statTrend} data-trend="neutral">Faol guruhlar</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--info-light)', color: '#3b82f6' }}>
            <CalendarClock size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Bugungi Darslar</p>
            <h3 className={styles.statValue}>{loading ? '...' : stats.lessonsToday}</h3>
            <span className={styles.statTrend} data-trend="neutral">Rejalashtirilgan</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Davomat Foizi</p>
            <h3 className={styles.statValue}>{loading ? '...' : `${stats.attendanceRate}%`}</h3>
            <span className={styles.statTrend} data-trend="neutral">Bugungi ko'rsatkich</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--error-light)', color: 'var(--error)' }}>
            <UserMinus size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Kelmaganlar</p>
            <h3 className={styles.statValue}>{loading ? '...' : stats.absentToday}</h3>
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
