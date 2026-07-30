'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import TeacherImportModal from './TeacherImportModal';
import styles from './page.module.css';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [academicYear, setAcademicYear] = useState('2025-2026');

  useEffect(() => {
    fetchData();
  }, [academicYear]);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ud } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (ud) setUserRole(ud.role);
      }

      const { data, error } = await supabase
        .from('teachers')
        .select(`
          id,
          full_name,
          phone,
          education_type,
          teacher_subjects(
            id,
            allocated_hours,
            academic_year,
            subjects(id, name)
          )
        `)
        .order('full_name');

      if (error) throw error;

      // For each teacher, calculate completed hours from lessons
      const teachersWithStats = await Promise.all((data || []).map(async (t) => {
        const { count } = await supabase
          .from('lessons')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', t.id);
        
        const completedHours = (count || 0) * 2; // 1 lesson = 2 hours
        
        // Filter teacher_subjects by academic year
        const subjectsThisYear = t.teacher_subjects?.filter(ts => ts.academic_year === academicYear) || [];
        const totalAllocated = subjectsThisYear.reduce((sum, ts) => sum + (ts.allocated_hours || 0), 0);

        return {
          ...t,
          teacher_subjects: subjectsThisYear,
          completed_hours: completedHours,
          total_allocated: totalAllocated,
          remaining_hours: Math.max(0, totalAllocated - completedHours),
        };
      }));

      setTeachers(teachersWithStats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = teachers.filter(t => {
    const matchSearch = t.full_name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.education_type === filterType;
    return matchSearch && matchType;
  });

  const canWrite = ['sysadmin', 'admin', 'academic'].includes(userRole);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="O'qituvchi ismi..."
              className="input"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input"
            style={{ width: 'auto', minWidth: '180px' }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="all">Barcha ta'lim turlari</option>
            <option value="malaka_oshirish">Malaka oshirish</option>
            <option value="qayta_tayyorlov">Qayta tayyorlov</option>
          </select>
          <select
            className="input"
            style={{ width: 'auto', minWidth: '140px' }}
            value={academicYear}
            onChange={e => setAcademicYear(e.target.value)}
          >
            <option value="2024-2025">2024-2025</option>
            <option value="2025-2026">2025-2026</option>
            <option value="2026-2027">2026-2027</option>
          </select>
        </div>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => setShowImport(true)}>
            <Upload size={18} /> Excel yuklash
          </button>
        )}
      </div>

      {/* Stats summary */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{teachers.length}</span>
          <span className={styles.statLabel}>Jami o'qituvchi</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>
            {teachers.filter(t => t.education_type === 'malaka_oshirish').length}
          </span>
          <span className={styles.statLabel}>Malaka oshirish</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>
            {teachers.filter(t => t.education_type === 'qayta_tayyorlov').length}
          </span>
          <span className={styles.statLabel}>Qayta tayyorlov</span>
        </div>
      </div>

      {/* Teacher Cards */}
      {loading ? (
        <div className={styles.loading}>Yuklanmoqda...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <p>O'qituvchilar topilmadi</p>
          {canWrite && (
            <button className="btn btn-primary" onClick={() => setShowImport(true)}>
              <Upload size={18} /> Excel orqali qo'shish
            </button>
          )}
        </div>
      ) : (
        <div className={styles.cardsGrid}>
          {filtered.map(teacher => {
            const isExpanded = expandedId === teacher.id;
            const pct = teacher.total_allocated > 0
              ? Math.min(100, Math.round((teacher.completed_hours / teacher.total_allocated) * 100))
              : 0;

            return (
              <div key={teacher.id} className={styles.teacherCard}>
                {/* Card Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardAvatar}>
                    {teacher.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardName}>{teacher.full_name}</h3>
                    <span className={`${styles.typeBadge} ${teacher.education_type === 'malaka_oshirish' ? styles.malaka : styles.qayta}`}>
                      {teacher.education_type === 'malaka_oshirish' ? 'Malaka oshirish' : 'Qayta tayyorlov'}
                    </span>
                  </div>
                  <button
                    className={styles.expandBtn}
                    onClick={() => setExpandedId(isExpanded ? null : teacher.id)}
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Progress Bar */}
                <div className={styles.progressSection}>
                  <div className={styles.progressInfo}>
                    <span>{teacher.completed_hours} soat o'tildi</span>
                    <span>{teacher.total_allocated} soat ajratilgan</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${pct}%`,
                        background: pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e'
                      }}
                    />
                  </div>
                  <div className={styles.progressPct}>{pct}% — Qoldiq: {teacher.remaining_hours} soat</div>
                </div>

                {/* Expanded: Subject breakdown */}
                {isExpanded && (
                  <div className={styles.subjectsTable}>
                    {teacher.teacher_subjects.length === 0 ? (
                      <p className={styles.noSubjects}>Bu o'quv yili uchun fan biriktirilmagan</p>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Fan</th>
                            <th>Ajratilgan soat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacher.teacher_subjects.map(ts => (
                            <tr key={ts.id}>
                              <td>{ts.subjects?.name || '—'}</td>
                              <td>{ts.allocated_hours} soat</td>
                            </tr>
                          ))}
                          <tr className={styles.totalRow}>
                            <td><strong>Jami</strong></td>
                            <td><strong>{teacher.total_allocated} soat</strong></td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TeacherImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={fetchData}
        academicYear={academicYear}
      />
    </div>
  );
}
