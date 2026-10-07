'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, Users, BookOpen, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import styles from './page.module.css';

export default function CourseMonitorPage() {
  const [groups, setGroups] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [gRes, lRes, sRes] = await Promise.all([
        supabase.from('groups').select('*'),
        supabase.from('lessons').select('id, group_id, lesson_date, title').order('lesson_date', { ascending: true }),
        supabase.from('students').select('id, group_id')
      ]);

      setGroups(gRes.data || []);
      setLessons(lRes.data || []);
      setStudents(sRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const courseStats = useMemo(() => {
    return groups.map(g => {
      const gLessons = lessons.filter(l => l.group_id === g.id);
      const gStudents = students.filter(s => s.group_id === g.id);

      const completedHours = gLessons.length * 6; // Har bir dars = 6 soat
      const totalHours = g.total_hours || 0;
      const progressPercent = totalHours > 0 ? Math.min(Math.round((completedHours / totalHours) * 100), 100) : 0;
      const remainingHours = Math.max(totalHours - completedHours, 0);

      // Birinchi va oxirgi dars sanasi
      const firstLesson = gLessons.length > 0 ? gLessons[0].lesson_date : null;
      const lastLesson = gLessons.length > 0 ? gLessons[gLessons.length - 1].lesson_date : null;

      let statusLabel = 'Faol';
      let statusColor = '#16a34a';
      if (g.status === 'archived') {
        statusLabel = 'Yakunlangan';
        statusColor = '#6b7280';
      } else if (progressPercent >= 90) {
        statusLabel = 'Tugash arafasida';
        statusColor = '#f59e0b';
      }

      return {
        ...g,
        studentCount: gStudents.length,
        lessonsCount: gLessons.length,
        completedHours,
        remainingHours,
        progressPercent,
        firstLesson,
        lastLesson,
        statusLabel,
        statusColor,
        educationLabel: g.education_type === 'qayta_tayyorlov' ? 'Qayta tayyorlash' : 'Malaka oshirish'
      };
    }).sort((a, b) => {
      if (a.status === 'archived' && b.status !== 'archived') return 1;
      if (a.status !== 'archived' && b.status === 'archived') return -1;
      return b.progressPercent - a.progressPercent;
    });
  }, [groups, lessons, students]);

  // Summary
  const summary = useMemo(() => {
    const active = courseStats.filter(c => c.status !== 'archived');
    const archived = courseStats.filter(c => c.status === 'archived');
    const totalStudents = courseStats.reduce((s, c) => s + c.studentCount, 0);
    const totalCompletedHours = courseStats.reduce((s, c) => s + c.completedHours, 0);
    return { active: active.length, archived: archived.length, totalStudents, totalCompletedHours };
  }, [courseStats]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Yuklanmoqda...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Kurs Monitoring</h1>
        <p>Barcha kurslar va guruhlarning o'tilish jarayoni</p>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <BookOpen size={24} color="#4f46e5" />
          <div>
            <div className={styles.summaryNumber}>{summary.active}</div>
            <div className={styles.summaryLabel}>Faol kurslar</div>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <CheckCircle size={24} color="#16a34a" />
          <div>
            <div className={styles.summaryNumber}>{summary.archived}</div>
            <div className={styles.summaryLabel}>Yakunlangan</div>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <Users size={24} color="#0891b2" />
          <div>
            <div className={styles.summaryNumber}>{summary.totalStudents}</div>
            <div className={styles.summaryLabel}>Jami tinglovchilar</div>
          </div>
        </div>
        <div className={styles.summaryCard}>
          <Clock size={24} color="#f59e0b" />
          <div>
            <div className={styles.summaryNumber}>{summary.totalCompletedHours}</div>
            <div className={styles.summaryLabel}>O'tilgan soatlar</div>
          </div>
        </div>
      </div>

      {/* Course Cards */}
      <div className={styles.courseGrid}>
        {courseStats.map(c => (
          <div key={c.id} className={`${styles.courseCard} ${c.status === 'archived' ? styles.archivedCard : ''}`}>
            <div className={styles.courseHeader}>
              <div>
                <h3 className={styles.courseName}>{c.name}</h3>
                <span className={styles.courseType} style={{ background: c.education_type === 'qayta_tayyorlov' ? '#ede9fe' : '#ecfdf5', color: c.education_type === 'qayta_tayyorlov' ? '#6d28d9' : '#059669' }}>
                  {c.educationLabel}
                </span>
              </div>
              <span className={styles.statusBadge} style={{ background: c.statusColor + '20', color: c.statusColor }}>
                {c.statusLabel}
              </span>
            </div>

            {/* Progress Bar */}
            <div className={styles.progressSection}>
              <div className={styles.progressInfo}>
                <span>{c.completedHours} / {c.total_hours || '?'} soat</span>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c.progressPercent}%</span>
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ 
                    width: `${c.progressPercent}%`,
                    background: c.progressPercent >= 90 ? '#16a34a' : c.progressPercent >= 50 ? '#f59e0b' : '#4f46e5'
                  }} 
                />
              </div>
              {c.remainingHours > 0 && (
                <div className={styles.remainingText}>
                  Qolgan: {c.remainingHours} soat ({Math.ceil(c.remainingHours / 6)} ta dars)
                </div>
              )}
            </div>

            {/* Stats */}
            <div className={styles.courseStats}>
              <div className={styles.statItem}>
                <Users size={16} />
                <span>{c.studentCount} tinglovchi</span>
              </div>
              <div className={styles.statItem}>
                <BookOpen size={16} />
                <span>{c.lessonsCount} ta dars o'tildi</span>
              </div>
              {(c.start_date && c.end_date) ? (
                <div className={styles.statItem}>
                  <TrendingUp size={16} />
                  <span>Muddati: {c.start_date} / {c.end_date}</span>
                </div>
              ) : c.firstLesson ? (
                <div className={styles.statItem}>
                  <TrendingUp size={16} />
                  <span>Darslar davri: {c.firstLesson} dan {c.lastLesson} gacha</span>
                </div>
              ) : null}
            </div>

            {c.course_name && (
              <div className={styles.courseNameTag}>
                {c.course_name}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
