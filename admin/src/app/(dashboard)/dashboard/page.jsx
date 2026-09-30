'use client';
import { useState, useEffect } from 'react';
import { Users, GraduationCap, BookOpen, CalendarClock, TrendingUp, UserMinus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import styles from './page.module.css';

// Chart state will be populated dynamically from the database


export default function Dashboard() {
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    groups: 0,
    lessonsToday: 0,
    attendanceRate: 0,
    absentToday: 0
  });
  const [weekData, setWeekData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [activities, setActivities] = useState([]);
  const [recentLessons, setRecentLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // today - render da ham kerak (kelgusi darslar "Bugun" belgisi uchun)
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch students count
        const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });
        
        // Fetch teachers count
        const { count: teacherCount } = await supabase.from('teachers').select('*', { count: 'exact', head: true });
        
        // Fetch groups count
        const { count: groupCount } = await supabase.from('groups').select('*', { count: 'exact', head: true });
        
        // Fetch today's lessons count - CHANGED TO THIS MONTH
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
        
        const { count: lessonsCount } = await supabase.from('lessons')
          .select('*', { count: 'exact', head: true })
          .gte('lesson_date', firstDayOfMonth);

        // Fetch attendance for this month
        const { data: attendanceData } = await supabase.from('attendance')
          .select('status, lessons!inner(lesson_date)')
          .gte('lessons.lesson_date', firstDayOfMonth);

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

        // 1. Yangi: Top 5 talabalar (TG rasm va davomat bilan)
        const { data: topStudentsData } = await supabase.from('users')
          .select('id, full_name, telegram_id, students!inner(id)')
          .eq('role', 'student')
          .limit(5);

        let topStudents = [];
        if (topStudentsData) {
          // Ularning davomatini ham hisoblaymiz (soddalashtirilgan)
          for (let s of topStudentsData) {
            const { count: presentCount } = await supabase.from('attendance')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', s.students[0].id)
              .in('status', ['present', 'late']);
              
            const { count: totalCount } = await supabase.from('attendance')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', s.students[0].id);

            const progress = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
            topStudents.push({
              id: s.id,
              name: s.full_name,
              tg_id: s.telegram_id,
              progress,
              status: progress >= 80 ? 'Yaxshi' : progress >= 60 ? 'O\'rtacha' : 'Xavfli',
              statusColor: progress >= 80 ? 'var(--success)' : progress >= 60 ? 'var(--warning)' : 'var(--error)'
            });
          }
        }
        setActivities(topStudents.sort((a,b) => b.progress - a.progress));

        // 2. Upcoming lessons - kelgusi darslar (bugun va undan keyin)
        const { data: upcomingLessonsData } = await supabase.from('lessons')
          .select('id, title, lesson_date, lesson_type, groups(name)')
          .gte('lesson_date', today)
          .order('lesson_date', { ascending: true })
          .limit(5);
          
        // Agar kelgusi dars bo'lmasa, oxirgi o'tilgan darslarni ko'rsat
        if (upcomingLessonsData && upcomingLessonsData.length > 0) {
          setRecentLessons(upcomingLessonsData);
        } else {
          const { data: pastLessonsData } = await supabase.from('lessons')
            .select('id, title, lesson_date, lesson_type, groups(name)')
            .lt('lesson_date', today)
            .order('lesson_date', { ascending: false })
            .limit(5);
          setRecentLessons(pastLessonsData || []);
        }

        // CHARTS DATA CALCULATION
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: chartData } = await supabase.from('attendance')
          .select('status, lessons!inner(lesson_date)')
          .gte('lessons.lesson_date', startDateStr)
          .lte('lessons.lesson_date', today);

        if (chartData && chartData.length > 0) {
          // Group by date
          const dateMap = {};
          chartData.forEach(row => {
            const date = row.lessons.lesson_date;
            if (!dateMap[date]) dateMap[date] = { total: 0, present: 0 };
            dateMap[date].total += 1;
            if (row.status === 'present' || row.status === 'late') {
              dateMap[date].present += 1;
            }
          });

          // Sort dates
          const sortedDates = Object.keys(dateMap).sort();
          
          // Weekly Data (last 7 available days)
          const last7Dates = sortedDates.slice(-7);
          const weekChart = last7Dates.map(date => {
            const d = new Date(date);
            const days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
            const name = days[d.getDay()];
            const stat = dateMap[date];
            const foiz = stat.total > 0 ? Math.round((stat.present / stat.total) * 100) : 0;
            return { name, foiz };
          });
          
          // If less than 7 days, pad with zeros
          while(weekChart.length < 7) {
            weekChart.unshift({ name: '-', foiz: 0 });
          }
          setWeekData(weekChart);

          // Monthly Data (group into 4 chunks)
          // We have up to 30 days. Split them into 4 weeks.
          const monthChart = [
            { name: '1-hafta', present: 0, total: 0 },
            { name: '2-hafta', present: 0, total: 0 },
            { name: '3-hafta', present: 0, total: 0 },
            { name: '4-hafta', present: 0, total: 0 },
          ];

          sortedDates.forEach((date, index) => {
            const weekIndex = Math.floor((index / Math.max(1, sortedDates.length)) * 4);
            const target = monthChart[Math.min(weekIndex, 3)];
            target.present += dateMap[date].present;
            target.total += dateMap[date].total;
          });

          const finalMonthChart = monthChart.map(w => ({
            name: w.name,
            foiz: w.total > 0 ? Math.round((w.present / w.total) * 100) : 0
          }));
          setMonthData(finalMonthChart);
        } else {
          setWeekData(Array(7).fill({ name: '-', foiz: 0 }));
          setMonthData([
            { name: '1-hafta', foiz: 0 },
            { name: '2-hafta', foiz: 0 },
            { name: '3-hafta', foiz: 0 },
            { name: '4-hafta', foiz: 0 }
          ]);
        }

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
            <span className={styles.statTrend} data-trend="neutral">Faol tinglovchilar</span>
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
          <div className={styles.statIconWrapper} style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <CalendarClock size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Oylik Darslar</p>
            <h3 className={styles.statValue}>{loading ? '...' : stats.lessonsToday}</h3>
            <span className={styles.statTrend} data-trend="neutral">Shu oyda</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Davomat Foizi</p>
            <h3 className={styles.statValue}>{loading ? '...' : `${stats.attendanceRate}%`}</h3>
            <span className={styles.statTrend} data-trend="neutral">Shu oy ko'rsatkichi</span>
          </div>
        </div>

        <div className={`card ${styles.statCard}`}>
          <div className={styles.statIconWrapper} style={{ background: 'var(--error-light)', color: 'var(--error)' }}>
            <UserMinus size={24} />
          </div>
          <div className={styles.statInfo}>
            <p className={styles.statTitle}>Kelmaganlar</p>
            <h3 className={styles.statValue}>{loading ? '...' : stats.absentToday}</h3>
            <span className={styles.statTrend} data-trend="down">Shu oyda</span>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        {/* CHARTS */}
        <div className={styles.chartsSection}>
          <div className={`card ${styles.chartCard}`}>
            <h3 className={styles.sectionTitle}>Haftalik Davomat K'orsatkichi</h3>
            <div className={styles.chartWrapper}>
              <div className={styles.neumorphicChartContainer}>
                {weekData.map((data, index) => (
                  <div key={index} className={styles.chartColumn}>
                    <div className={styles.neumorphicTrack}>
                      <div 
                        className={styles.neumorphicBar} 
                        style={{ height: `${data.foiz}%` }}
                        data-value={data.foiz}
                      ></div>
                    </div>
                    <span className={styles.chartLabel}>{data.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`card ${styles.scheduleCard}`}>
            <div className={styles.scheduleHeader}>
              <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Kelgusi Darslar</h3>
              <Link href="/lessons" className="badge badge-primary" style={{ textDecoration: 'none' }}>Hammasi →</Link>
            </div>
            <div className={styles.scheduleList}>
              {recentLessons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  Kelgusi darslar mavjud emas
                </div>
              ) : recentLessons.map((lesson) => {
                const match = lesson.title.match(/\(([^)]+)\)$/);
                const timeStr = match ? match[1] : '';
                const subjectName = lesson.title.replace(/\([^)]+\)$/, '').trim();
                
                // sana format: 29.09 (Dush)
                const d = new Date(lesson.lesson_date);
                const days = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];
                const dateLabel = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')} (${days[d.getDay()]})`;
                
                const isToday = lesson.lesson_date === today;
                
                return (
                  <div key={lesson.id} className={styles.scheduleItem}>
                    <div className={styles.scheduleTime} style={isToday ? { color: 'var(--primary)', fontWeight: '700' } : {}}>
                      {isToday ? '🟢 Bugun' : dateLabel}
                      {timeStr && <div style={{ fontSize: '11px', opacity: 0.7 }}>{timeStr}</div>}
                    </div>
                    <div className={styles.scheduleInfo}>
                      <span className={styles.scheduleSubject}>{subjectName}</span>
                      <span className={styles.scheduleGroup}>{lesson.groups?.name || 'Guruh'}</span>
                    </div>
                    <div className={styles.scheduleAction}>
                      <Link href={`/lessons?date=${lesson.lesson_date}`} className={styles.scheduleIconBtn}>›</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* STUDENT PROGRESS (Neumorphic List) */}
        <div className={`card ${styles.activityCard}`}>
          <h3 className={styles.sectionTitle}>Tinglovchilar Holati</h3>
          <div className={styles.studentList}>
            <div className={styles.studentListHeader}>
              <span>Tinglovchi</span>
              <span>Foiz</span>
              <span>Holat</span>
            </div>
            {activities.map(student => (
              <div key={student.id} className={styles.studentRow}>
                <div className={styles.studentInfo}>
                  <div className={styles.studentAvatar}>
                    {student.tg_id ? (
                      <img src={`/api/tg-photo?tg_id=${student.tg_id}&name=${encodeURIComponent(student.name)}`} alt={student.name} />
                    ) : (
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=25262B&color=F8F9FA`} alt={student.name} />
                    )}
                  </div>
                  <span className={styles.studentName}>{student.name}</span>
                </div>
                
                <div className={styles.studentProgressWrapper}>
                  <div className={styles.studentProgressBar}>
                    <div 
                      className={styles.studentProgressFill} 
                      style={{ 
                        width: `${student.progress}%`,
                        background: student.statusColor,
                        boxShadow: `0 0 10px ${student.statusColor}` // Neon glow
                      }}
                    ></div>
                  </div>
                  <span className={styles.studentProgressText}>{student.progress}%</span>
                </div>

                <div className={styles.studentStatus} style={{ color: student.statusColor }}>
                  {student.status}
                </div>
              </div>
            ))}
          </div>
          <Link href="/students" className={`btn btn-secondary ${styles.viewAllBtn}`} style={{ textDecoration: 'none', textAlign: 'center' }}>
            Barchasini ko'rish
          </Link>
        </div>
      </div>
    </div>
  );
}

