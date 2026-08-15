'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal/Modal';
import { Loader2 } from 'lucide-react';
import styles from './TeacherModal.module.css';

export default function TeacherAnalyticsModal({ isOpen, onClose, teacher, academicYear }) {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState([]);

  useEffect(() => {
    if (isOpen && teacher) {
      fetchAnalytics();
    }
  }, [isOpen, teacher, academicYear]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      // 1. Fetch teacher subjects limits
      const { data: teacherSubjects, error: tsError } = await supabase
        .from('teacher_subjects')
        .select(`
          id,
          allocated_hours,
          allocated_theory_hours,
          allocated_practice_hours,
          subjects ( id, name )
        `)
        .eq('teacher_id', teacher.id)
        .eq('academic_year', academicYear);
        
      if (tsError) throw tsError;

      // 2. Fetch all lessons for this teacher
      const { data: lessons, error: lError } = await supabase
        .from('lessons')
        .select(`
          id,
          subject_id,
          lesson_type,
          start_time,
          end_time,
          groups ( id, name, education_type, status )
        `)
        .eq('teacher_id', teacher.id);
        
      if (lError) throw lError;

      // 3. Process and group data
      const subjectsMap = {};

      teacherSubjects?.forEach(ts => {
        const sid = ts.subjects?.id;
        if (!sid) return;
        subjectsMap[sid] = {
          subjectId: sid,
          subjectName: ts.subjects?.name || 'Noma\'lum fan',
          limits: {
            total: ts.allocated_hours || 0,
            theory: ts.allocated_theory_hours || 0,
            practice: ts.allocated_practice_hours || 0
          },
          educationTypes: {},
          totalTaught: 0
        };
      });

      lessons?.forEach(lesson => {
        const sid = lesson.subject_id;
        if (!sid) return;
        
        if (!subjectsMap[sid]) {
          subjectsMap[sid] = {
            subjectId: sid,
            subjectName: 'Boshqa fan (Limiti yo\'q)',
            limits: { total: 0, theory: 0, practice: 0 },
            educationTypes: {},
            totalTaught: 0
          };
        }

        const g = lesson.groups;
        if (!g) return;

        const edType = g.education_type || "Noma'lum";
        
        if (!subjectsMap[sid].educationTypes[edType]) {
          subjectsMap[sid].educationTypes[edType] = {
            totalHours: 0,
            groups: {}
          };
        }
        
        const edTypeObj = subjectsMap[sid].educationTypes[edType];

        if (!edTypeObj.groups[g.id]) {
          edTypeObj.groups[g.id] = {
            groupId: g.id,
            groupName: g.name,
            status: g.status,
            hours: 0
          };
        }

        let lessonHours = 2; // Default to 1 pair = 2 acad hours
        if (lesson.start_time && lesson.end_time) {
          const [sh, sm] = lesson.start_time.split(':').map(Number);
          const [eh, em] = lesson.end_time.split(':').map(Number);
          if (!isNaN(sh) && !isNaN(eh)) {
            const diffHours = (eh + em/60) - (sh + sm/60);
            if (diffHours > 0 && diffHours < 12) {
              lessonHours = Math.round(diffHours); 
            }
          }
        }

        edTypeObj.groups[g.id].hours += lessonHours;
        edTypeObj.totalHours += lessonHours;
        subjectsMap[sid].totalTaught += lessonHours;
      });

      setAnalyticsData(Object.values(subjectsMap));

    } catch (err) {
      console.error(err);
      alert('Tahlil ma\'lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${teacher?.full_name || 'O\'qituvchi'} — Tahlil`} large={true}>
      <div className="modalContent" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '8px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2  size={24} />
          </div>
        ) : analyticsData.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>Ma'lumot topilmadi.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {analyticsData.map(subject => {
              const remaining = subject.limits.total - subject.totalTaught;
              const isOverLimit = remaining < 0;

              return (
                <div key={subject.subjectId} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc' }}>
                  <h4 style={{ margin: '0 0 12px 0', color: '#0f172a', fontSize: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>📚 {subject.subjectName}</span>
                    <span style={{ fontSize: '0.9rem', padding: '4px 8px', borderRadius: '12px', background: '#e2e8f0' }}>
                      Jami limit: <strong>{subject.limits.total}</strong> soat
                    </span>
                  </h4>
                  
                  {Object.keys(subject.educationTypes).length === 0 ? (
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Hali hech qaysi guruhga dars o'tilmagan.</p>
                  ) : (
                    Object.entries(subject.educationTypes).map(([edType, edData]) => (
                      <div key={edType} style={{ marginBottom: '16px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                        <h5 style={{ margin: '0 0 8px 0', color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>
                          🎓 Ta'lim turi: <strong>{edType}</strong>
                          <span style={{ float: 'right', color: '#64748b', fontWeight: 'normal' }}>Jami: <strong>{edData.totalHours}</strong> soat</span>
                        </h5>
                        
                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#475569', fontSize: '0.95rem' }}>
                          {Object.values(edData.groups).map(g => (
                            <li key={g.groupId} style={{ margin: '4px 0', display: 'flex', justifyContent: 'space-between' }}>
                              <span>
                                {g.groupName} 
                                {g.status === 'arxiv' || g.status === 'inactive' ? (
                                  <span style={{ fontSize: '0.8rem', color: '#ef4444', marginLeft: '6px', background: '#fee2e2', padding: '2px 6px', borderRadius: '10px' }}>
                                    Yakunlangan
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '0.8rem', color: '#22c55e', marginLeft: '6px', background: '#dcfce7', padding: '2px 6px', borderRadius: '10px' }}>
                                    Joriy
                                  </span>
                                )}
                              </span>
                              <strong>{g.hours} soat</strong>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  )}

                  <div style={{ 
                    marginTop: '12px', 
                    padding: '12px', 
                    background: isOverLimit ? '#fef2f2' : '#f0fdf4', 
                    border: `1px solid ${isOverLimit ? '#fecaca' : '#bbf7d0'}`,
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: isOverLimit ? '#dc2626' : '#166534', fontWeight: '500' }}>
                      {isOverLimit ? 'Limitdan oshib ketilgan:' : 'Qoldiq limit (barcha guruhlar uchun):'}
                    </span>
                    <strong style={{ color: isOverLimit ? '#dc2626' : '#166534', fontSize: '1.1rem' }}>
                      {Math.abs(remaining)} soat {isOverLimit && 'oshikcha'}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.modalFooter} style={{ marginTop: '20px' }}>
        <button className="btn" onClick={onClose} type="button">
          Yopish
        </button>
      </div>
    </Modal>
  );
}
