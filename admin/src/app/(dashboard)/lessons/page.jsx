'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Calendar, Eye } from 'lucide-react';
import styles from './page.module.css';

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLessons();
  }, []);

  async function fetchLessons() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          lesson_date,
          groups ( name, course_name ),
          users!lessons_created_by_fkey ( full_name ),
          attendance ( status )
        `)
        .order('lesson_date', { ascending: false });
      
      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLessons = lessons.filter(l => 
    l.title?.toLowerCase().includes(search.toLowerCase()) || 
    l.groups?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Dars mavzusi yoki guruh..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        {loading ? (
          <div className={styles.loading}>Yuklanmoqda...</div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Guruh</th>
                  <th>Mavzu</th>
                  <th>Yaratuvchi</th>
                  <th>Davomat</th>
                  <th>Batafsil</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filteredLessons.map((lesson) => {
                    const present = lesson.attendance.filter(a => a.status === 'present').length;
                    const total = lesson.attendance.length;
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                    
                    return (
                      <tr key={lesson.id}>
                        <td>
                          <div className={styles.dateWrapper}>
                            <Calendar size={14} className={styles.dateIcon} />
                            {new Date(lesson.lesson_date).toLocaleDateString('uz-UZ')}
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{lesson.groups?.name || 'Noma\'lum'}</td>
                        <td>{lesson.title || 'Mavzusiz'}</td>
                        <td>{lesson.users?.full_name || 'Tizim'}</td>
                        <td>
                          {total > 0 ? (
                            <div className={styles.progressWrapper}>
                              <div className={styles.progressBar}>
                                <div 
                                  className={styles.progressFill} 
                                  style={{ width: `${rate}%`, background: rate > 80 ? 'var(--success)' : rate > 50 ? 'var(--warning)' : 'var(--error)' }}
                                ></div>
                              </div>
                              <span className={styles.progressText}>{rate}% ({present}/{total})</span>
                            </div>
                          ) : (
                            <span className={styles.textMuted}>Kiritilmagan</span>
                          )}
                        </td>
                        <td>
                          <button className={styles.actionBtn} title="Ko'rish">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
