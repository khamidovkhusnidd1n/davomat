'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Upload, ChevronDown, ChevronUp, Edit, LayoutGrid, TableProperties, Download, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import TeacherImportModal from './TeacherImportModal';
import TeacherModal from './TeacherModal';
import styles from './page.module.css';

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  useEffect(() => {
    fetchData();
  }, [academicYear]);

  async function fetchData(silent = false) {
    try {
      if (!silent) setLoading(true);
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
          degree,
          max_hours,
          teacher_subjects(
            id,
            allocated_hours,
            completed_hours,
            academic_year,
            allocated_theory_hours,
            allocated_practice_hours,
            completed_theory_hours,
            completed_practice_hours,
            subjects(id, name)
          )
        `)
        .order('full_name');

      if (error) throw error;

      // For each teacher, calculate completed hours from future lessons (starting from tomorrow)
      const todayStr = new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toISOString().split('T')[0];
      const teachersWithStats = await Promise.all((data || []).map(async (t) => {
        const { data: lesData } = await supabase
          .from('lessons')
          .select('lesson_date, start_time, end_time, subject_id, lesson_type')
          .eq('teacher_id', t.id);
        
        // Filter teacher_subjects by academic year
        const rawSubjectsThisYear = t.teacher_subjects?.filter(ts => ts.academic_year === academicYear) || [];

        // Faqatgina vaqti o'tib bo'lgan (tugagan) darslarni "o'tildi" (completed) hisobiga qo'shamiz
        const now = new Date(new Date().getTime() + 5 * 60 * 60 * 1000); // UZ time
        const pastLessons = (lesData || []).filter(l => {
          const end = l.end_time || '13:00';
          const lessonEnd = new Date(`${l.lesson_date}T${end}:00+05:00`);
          return lessonEnd < now;
        });
        
        const subjectsThisYear = rawSubjectsThisYear.map(ts => {
          const subPastLessons = pastLessons.filter(l => l.subject_id === ts.subjects?.id);
          
          // Calculate dynamic theory hours
          const dynamicTheory = subPastLessons
            .filter(l => l.lesson_type === 'theory')
            .reduce((sum, l) => {
              const start = l.start_time || '09:00';
              const end = l.end_time || '13:00';
              const [startH, startM] = start.substring(0, 5).split(':').map(Number);
              const [endH, endM] = end.substring(0, 5).split(':').map(Number);
              const diffHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
              return sum + (diffHours > 0 ? Math.round(diffHours * 1.5) : 6);
            }, 0);

          // Calculate dynamic practice hours
          const dynamicPractice = subPastLessons
            .filter(l => l.lesson_type === 'practice')
            .reduce((sum, l) => {
              const start = l.start_time || '09:00';
              const end = l.end_time || '13:00';
              const [startH, startM] = start.substring(0, 5).split(':').map(Number);
              const [endH, endM] = end.substring(0, 5).split(':').map(Number);
              const diffHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
              return sum + (diffHours > 0 ? Math.round(diffHours * 1.5) : 6);
            }, 0);

          const totalTheory = (ts.completed_theory_hours || 0) + dynamicTheory;
          const totalPractice = (ts.completed_practice_hours || 0) + dynamicPractice;

          return {
            ...ts,
            total_theory_completed: totalTheory,
            total_practice_completed: totalPractice,
            total_completed: totalTheory + totalPractice
          };
        });

        const completedHours = subjectsThisYear.reduce((sum, ts) => sum + ts.total_completed, 0);
        const totalAllocated = subjectsThisYear.reduce((sum, ts) => sum + (ts.allocated_theory_hours || 0) + (ts.allocated_practice_hours || 0), 0);

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

  const handleDeleteTeacher = async (id) => {
    if (!confirm("Haqiqatan ham ushbu o'qituvchini o'chirmoqchimisiz? Uning barcha biriktirilgan darslaridagi statistikalar ham o'chadi!")) return;
    try {
      const { error } = await supabase.from('teachers').delete().eq('id', id);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      alert("Xatolik yuz berdi: " + err.message);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filtered.map((t, idx) => ({
      "№": idx + 1,
      "O'qituvchi": t.full_name,
      "Ilmiy daraja": t.degree || 'Kiritilmagan',
      "Ta'lim turi": t.education_type === 'ikkalasi' ? 'Barchasi' : (t.education_type === 'malaka_oshirish' ? 'Malaka oshirish' : 'Qayta tayyorlov'),
      "Telefon": t.phone || 'Kiritilmagan',
      "Yillik limit soati": t.max_hours || 120,
      "Nazariy soat (O'tilgan/Reja)": `${t.teacher_subjects.reduce((sum, ts) => sum + (ts.total_theory_completed || 0), 0)} / ${t.teacher_subjects.reduce((sum, ts) => sum + (ts.allocated_theory_hours || 0), 0)}`,
      "Amaliy soat (O'tilgan/Reja)": `${t.teacher_subjects.reduce((sum, ts) => sum + (ts.total_practice_completed || 0), 0)} / ${t.teacher_subjects.reduce((sum, ts) => sum + (ts.allocated_practice_hours || 0), 0)}`,
      "Jami soat (O'tilgan/Reja)": `${t.completed_hours} / ${t.total_allocated}`,
      "Qoldiq soat": t.remaining_hours,
      "Bajarilishi (%)": t.max_hours > 0 ? Math.round((t.completed_hours / t.max_hours) * 100) : 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "O'qituvchilar Hisoboti");

    // Auto-fit column widths
    const max_len = dataToExport.reduce((acc, row) => {
      Object.keys(row).forEach((key, col_idx) => {
        const val_len = String(row[key] || '').length;
        acc[col_idx] = Math.max(acc[col_idx] || 10, val_len + 2);
      });
      return acc;
    }, []);
    worksheet['!cols'] = max_len.map(w => ({ wch: w }));

    XLSX.writeFile(workbook, `O'qituvchilar_Hisoboti_${academicYear}.xlsx`);
  };

  const filtered = teachers.filter(t => {
    const matchSearch = t.full_name.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || t.education_type === filterType || t.education_type === 'ikkalasi';
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={styles.toggleGroup}>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'cards' ? styles.activeToggle : ''}`} 
              onClick={() => setViewMode('cards')}
              title="Kartalar ko'rinishi"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              className={`${styles.toggleBtn} ${viewMode === 'table' ? styles.activeToggle : ''}`} 
              onClick={() => setViewMode('table')}
              title="Jadval hisoboti ko'rinishi"
            >
              <TableProperties size={18} />
            </button>
          </div>
          {viewMode === 'table' && (
            <button className="btn btn-secondary" style={{ backgroundColor: '#ecfdf5', color: '#10b981', borderColor: '#a7f3d0' }} onClick={handleExportExcel}>
              <Download size={18} /> Excel hisobot
            </button>
          )}
          {canWrite && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }} onClick={() => setShowImport(true)}>
                <Upload size={18} /> Excel yuklash
              </button>
              <button className="btn btn-primary" onClick={() => { setSelectedTeacher(null); setShowAddModal(true); }}>
                <Plus size={18} /> O'qituvchi qo'shish
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats summary */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{teachers.length}</span>
          <span className={styles.statLabel}>Jami o'qituvchi</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>
            {teachers.filter(t => t.education_type === 'malaka_oshirish' || t.education_type === 'ikkalasi').length}
          </span>
          <span className={styles.statLabel}>Malaka oshirish</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>
            {teachers.filter(t => t.education_type === 'qayta_tayyorlov' || t.education_type === 'ikkalasi').length}
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
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-secondary" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }} onClick={() => setShowImport(true)}>
                <Upload size={18} /> Excel orqali qo'shish
              </button>
              <button className="btn btn-primary" onClick={() => { setSelectedTeacher(null); setShowAddModal(true); }}>
                <Plus size={18} /> O'qituvchi qo'shish
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'cards' ? (
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
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`${styles.typeBadge} ${teacher.education_type === 'malaka_oshirish' ? styles.malaka : teacher.education_type === 'ikkalasi' ? styles.ikkalasi : styles.qayta}`}>
                        {teacher.education_type === 'ikkalasi' ? 'Barchasi' : (teacher.education_type === 'malaka_oshirish' ? 'Malaka oshirish' : 'Qayta tayyorlov')}
                      </span>
                      {teacher.degree && (
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-secondary)', border: '1px solid var(--border)', fontWeight: '500' }}>
                          {teacher.degree}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {canWrite && (
                      <>
                        <button
                          className={styles.editBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeacher(teacher);
                            setShowAddModal(true);
                          }}
                          title="O'qituvchini tahrirlash"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className={styles.editBtn}
                          style={{ color: '#ef4444', marginLeft: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTeacher(teacher.id);
                          }}
                          title="O'qituvchini o'chirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    <button
                      className={styles.expandBtn}
                      onClick={() => setExpandedId(isExpanded ? null : teacher.id)}
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className={styles.progressSection}>
                  <div className={styles.progressInfo}>
                    <span>{teacher.completed_hours} soat o'tildi</span>
                    <span>Ajratilgan: {teacher.total_allocated} soat (Limit: {teacher.max_hours} s)</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${pct}%`,
                        background: teacher.completed_hours >= teacher.max_hours ? '#ef4444' : pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e'
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
                            <th>Nazariy (O'tilgan / Reja)</th>
                            <th>Amaliy (O'tilgan / Reja)</th>
                            <th>Jami (O'tilgan / Reja)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teacher.teacher_subjects.map(ts => (
                            <tr key={ts.id}>
                              <td>{ts.subjects?.name || '—'}</td>
                              <td>{ts.total_theory_completed || 0} / {ts.allocated_theory_hours || 0} soat</td>
                              <td>{ts.total_practice_completed || 0} / {ts.allocated_practice_hours || 0} soat</td>
                              <td>{ts.total_completed || 0} / {(ts.allocated_theory_hours || 0) + (ts.allocated_practice_hours || 0)} soat</td>
                            </tr>
                          ))}
                          <tr className={styles.totalRow}>
                            <td><strong>Jami</strong></td>
                            <td><strong>{teacher.teacher_subjects.reduce((sum, ts) => sum + (ts.total_theory_completed || 0), 0)} / {teacher.teacher_subjects.reduce((sum, ts) => sum + (ts.allocated_theory_hours || 0), 0)} soat</strong></td>
                            <td><strong>{teacher.teacher_subjects.reduce((sum, ts) => sum + (ts.total_practice_completed || 0), 0)} / {teacher.teacher_subjects.reduce((sum, ts) => sum + (ts.allocated_practice_hours || 0), 0)} soat</strong></td>
                            <td><strong>{teacher.completed_hours} / {teacher.total_allocated} soat</strong></td>
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
      ) : (
        <div className={`card ${styles.tableCard}`}>
          <div className={styles.tableResponsive}>
            <table className={styles.reportTable}>
              <thead>
                <tr>
                  <th>№</th>
                  <th>O'qituvchi (F.I.Sh.)</th>
                  <th>Ta'lim turi</th>
                  <th>Biriktirilgan fanlar</th>
                  <th>Yillik limit</th>
                  <th>Nazariy (O'tilgan/Reja)</th>
                  <th>Amaliy (O'tilgan/Reja)</th>
                  <th>Jami (O'tilgan/Reja)</th>
                  <th>Qoldiq limit</th>
                  <th>Bajarilishi (%)</th>
                  {canWrite && <th>Amal</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((teacher, idx) => {
                  const pct = teacher.total_allocated > 0
                    ? Math.min(100, Math.round((teacher.completed_hours / teacher.total_allocated) * 100))
                    : 0;
                  return (
                    <tr key={teacher.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: '600' }}>
                        {teacher.full_name}
                        {teacher.degree && (
                          <span style={{ fontSize: '0.75rem', padding: '1px 5px', borderRadius: '3px', background: '#f3f4f6', color: '#4b5563', marginLeft: '6px', fontWeight: 'normal', border: '1px solid #e5e7eb' }}>
                            {teacher.degree}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.typeBadge} ${teacher.education_type === 'malaka_oshirish' ? styles.malaka : teacher.education_type === 'ikkalasi' ? styles.ikkalasi : styles.qayta}`}>
                          {teacher.education_type === 'ikkalasi' ? 'Barchasi' : (teacher.education_type === 'malaka_oshirish' ? 'Malaka oshirish' : 'Qayta tayyorlov')}
                        </span>
                      </td>
                      <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {teacher.teacher_subjects.map(ts => ts.subjects?.name).filter(Boolean).join(', ') || '—'}
                      </td>
                      <td style={{ fontWeight: '500' }}>{teacher.max_hours} soat</td>
                      <td style={{ fontWeight: '600' }}>
                        {teacher.teacher_subjects.reduce((sum, ts) => sum + (ts.total_theory_completed || 0), 0)} / {teacher.teacher_subjects.reduce((sum, ts) => sum + (ts.allocated_theory_hours || 0), 0)} soat
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {teacher.teacher_subjects.reduce((sum, ts) => sum + (ts.total_practice_completed || 0), 0)} / {teacher.teacher_subjects.reduce((sum, ts) => sum + (ts.allocated_practice_hours || 0), 0)} soat
                      </td>
                      <td style={{ color: 'var(--primary)', fontWeight: '600' }}>
                        {teacher.completed_hours} / {teacher.total_allocated} soat
                      </td>
                      <td style={{ color: teacher.remaining_hours > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{teacher.remaining_hours} soat</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div className={styles.tableProgressBar}>
                            <div
                              className={styles.tableProgressFill}
                              style={{
                                width: `${pct}%`,
                                background: teacher.completed_hours >= teacher.max_hours ? '#ef4444' : pct >= 90 ? '#ef4444' : pct >= 60 ? '#f59e0b' : '#22c55e',
                                height: '100%',
                                borderRadius: '4px'
                              }}
                            />
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{pct}%</span>
                        </div>
                      </td>
                      {canWrite && (
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className={styles.actionBtn}
                              onClick={() => {
                                setSelectedTeacher(teacher);
                                setShowAddModal(true);
                              }}
                              title="Tahrirlash"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className={styles.actionBtn}
                              style={{ color: '#ef4444' }}
                              onClick={() => handleDeleteTeacher(teacher.id)}
                              title="O'chirish"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TeacherImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={() => fetchData(true)}
        academicYear={academicYear}
      />

      <TeacherModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        teacher={selectedTeacher}
        academicYear={academicYear}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}
