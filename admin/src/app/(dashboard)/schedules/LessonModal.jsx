'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal/Modal';

export default function LessonModal({ isOpen, onClose, lesson, groups, prefilledDate, prefilledGroupId, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);

  const [formData, setFormData] = useState({
    id: '',
    group_id: '',
    lesson_date: '',
    title: '',
    start_time: '09:00',
    end_time: '13:00',
    subject_id: '',
    teacher_id: '',
    custom_subject_name: '',
    lesson_type: 'practice'
  });

  useEffect(() => {
    fetchSubjects();
    fetchTeachers();
    fetchTeacherSubjects();
  }, []);

  useEffect(() => {
    if (lesson) {
      // Parse subject name from title if it was custom
      const parts = lesson.title ? lesson.title.split(' | ') : [];
      const titleWithoutTime = parts.length > 1 ? parts.slice(1).join(' | ') : (parts[0] || '');
      
      setFormData({
        id: lesson.id || '',
        group_id: lesson.group_id || '',
        lesson_date: lesson.lesson_date || '',
        title: titleWithoutTime === (lesson.subjects?.name || '') ? '' : titleWithoutTime,
        start_time: lesson.start_time?.substring(0, 5) || '09:00',
        end_time: lesson.end_time?.substring(0, 5) || '13:00',
        subject_id: lesson.subject_id || '',
        teacher_id: lesson.teacher_id || '',
        custom_subject_name: lesson.subject_id ? '' : titleWithoutTime,
        lesson_type: lesson.lesson_type || 'practice'
      });
    } else {
      setFormData({
        id: '',
        group_id: prefilledGroupId || '',
        lesson_date: prefilledDate || new Date().toISOString().split('T')[0],
        title: '',
        start_time: '09:00',
        end_time: '13:00',
        subject_id: '',
        teacher_id: '',
        custom_subject_name: '',
        lesson_type: 'practice'
      });
    }
  }, [lesson, prefilledDate, prefilledGroupId, isOpen]);

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    if (data) setSubjects(data);
  }

  async function fetchTeachers() {
    const { data } = await supabase
      .from('teachers')
      .select(`
        id, 
        full_name, 
        education_type,
        max_hours,
        teacher_subjects(completed_hours)
      `)
      .order('full_name');
    
    if (data) {
      // Calculate dynamic hours
      const todayStr = new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toISOString().split('T')[0];
      const teachersWithStats = await Promise.all(data.map(async (t) => {
        const { data: lesData } = await supabase
          .from('lessons')
          .select('lesson_date, start_time, end_time')
          .eq('teacher_id', t.id);
        
        const manualCompleted = t.teacher_subjects?.reduce((sum, ts) => sum + (ts.completed_hours || 0), 0) || 0;

        // Soat faqat dars boshlanganidan 1 soat o'tgach ayriladi
        const now = new Date(new Date().getTime() + 5 * 60 * 60 * 1000); // UZ time
        const startedLessons = (lesData || []).filter(l => {
          const start = l.start_time || '09:00';
          const lessonStart = new Date(`${l.lesson_date}T${start.substring(0, 5)}:00+05:00`);
          lessonStart.setHours(lessonStart.getHours() + 1);
          return lessonStart < now;
        });
        const dynamicHours = startedLessons.reduce((sum, l) => {
          const start = l.start_time || '09:00';
          const end = l.end_time || '13:00';
          const [startH, startM] = start.substring(0, 5).split(':').map(Number);
          const [endH, endM] = end.substring(0, 5).split(':').map(Number);
          const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
          const hours = totalMinutes > 0 ? Math.floor((totalMinutes + 10) / 90) * 2 : 2;
          return sum + hours;
        }, 0);

        const totalHours = manualCompleted + dynamicHours;
        return {
          ...t,
          completed_hours: totalHours,
          limit_reached: totalHours >= (t.max_hours || 228)
        };
      }));
      setTeachers(teachersWithStats);
    }
  }

  async function fetchTeacherSubjects() {
    const { data } = await supabase.from('teacher_subjects').select('*');
    if (data) setTeacherSubjects(data);
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedGroup = groups.find(g => g.id === formData.group_id);
      const groupEduType = selectedGroup?.education_type;
      
      const teacher = teachers.find(t => t.id === formData.teacher_id);
      if (teacher && teacher.education_type !== groupEduType) {
        if (!confirm(`Ogohlantirish: O'qituvchi ta'lim turi (${teacher.education_type}) guruh ta'lim turiga (${groupEduType}) mos kelmaydi. Baribir saqlashni xohlaysizmi?`)) {
          setLoading(false);
          return;
        }
      }

      // Format payload
      const payload = {
        id: formData.id || undefined,
        group_id: formData.group_id,
        lesson_date: formData.lesson_date,
        title: formData.subject_id === 'custom_subject' ? formData.custom_subject_name : (subjects.find(s => s.id === formData.subject_id)?.name || formData.title),
        start_time: formData.start_time,
        end_time: formData.end_time,
        subject_id: formData.subject_id === 'custom_subject' ? null : formData.subject_id,
        teacher_id: formData.teacher_id || null,
        custom_subject_name: formData.subject_id === 'custom_subject' ? formData.custom_subject_name : '',
        lesson_type: formData.lesson_type
      };

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/lessons/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Darsni saqlashda xatolik yuz berdi');

      onSuccess();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedTeacher = teachers.find(t => t.id === formData.teacher_id);
  const assignedSubjectIds = new Set(teacherSubjects.filter(ts => ts.teacher_id === formData.teacher_id).map(ts => ts.subject_id));
  const assignedSubs = subjects.filter(s => assignedSubjectIds.has(s.id));
  const hasAssignedSubs = assignedSubs.length > 0;

  // Filter teachers by group education type
  const activeGroup = groups.find(g => g.id === formData.group_id);
  const displayTeachers = activeGroup?.education_type
    ? teachers.filter(t => t.education_type === activeGroup.education_type || t.education_type === 'ikkalasi')
    : teachers;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formData.id ? "Darsni tahrirlash" : "Yangi dars qo'shish"}
    >
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label>Guruh</label>
          <select 
            className="input" 
            value={formData.group_id}
            onChange={(e) => setFormData({...formData, group_id: e.target.value, subject_id: '', teacher_id: ''})}
            required
            disabled={!!prefilledGroupId || !!formData.id}
          >
            <option value="">Guruhni tanlang</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Dars boshlanishi</label>
            <input 
              type="time" 
              className="input" 
              value={formData.start_time}
              onChange={(e) => setFormData({...formData, start_time: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Dars tugashi</label>
            <input 
              type="time" 
              className="input" 
              value={formData.end_time}
              onChange={(e) => setFormData({...formData, end_time: e.target.value})}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="form-group">
            <label>Sana</label>
            <input 
              type="date" 
              className="input" 
              value={formData.lesson_date}
              onChange={(e) => setFormData({...formData, lesson_date: e.target.value})}
              required
              disabled={!!formData.id}
            />
          </div>
          <div className="form-group">
            <label>Dars turi</label>
            <select
              className="input"
              value={formData.lesson_type}
              onChange={(e) => setFormData({...formData, lesson_type: e.target.value})}
              required
            >
              <option value="practice">Amaliy (Practice)</option>
              <option value="theory">Nazariy (Theory)</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>O'qituvchi</label>
          <select 
            className="input" 
            value={formData.teacher_id}
            onChange={(e) => {
              const tId = e.target.value;
              const assigned = teacherSubjects
                .filter(ts => ts.teacher_id === tId)
                .map(ts => subjects.find(s => s.id === ts.subject_id))
                .filter(Boolean);
              
              setFormData({
                ...formData,
                teacher_id: tId,
                subject_id: assigned.length > 0 ? '' : 'custom_subject',
                custom_subject_name: ''
              });
            }}
            required
          >
            <option value="">O'qituvchini tanlang</option>
            {displayTeachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.full_name} {t.limit_reached ? `(Limit to'lgan: ${t.completed_hours}/${t.max_hours || 228} s)` : `(${t.completed_hours}/${t.max_hours || 228} s)`}
              </option>
            ))}
          </select>
        </div>

        {formData.teacher_id && (
          <div className="form-group">
            <label>Fan</label>
            {hasAssignedSubs ? (
              <>
                <select 
                  className="input" 
                  value={formData.subject_id}
                  onChange={(e) => setFormData({
                    ...formData, 
                    subject_id: e.target.value,
                    custom_subject_name: e.target.value === 'custom_subject' ? formData.custom_subject_name : ''
                  })}
                  required
                >
                  <option value="">Fanni tanlang</option>
                  {assignedSubs.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="custom_subject">+ Yangi fan yozish</option>
                </select>
                
                {formData.subject_id === 'custom_subject' && (
                  <input 
                    type="text"
                    className="input"
                    style={{ marginTop: '0.5rem' }}
                    placeholder="Fan nomini kiriting..."
                    value={formData.custom_subject_name}
                    onChange={(e) => setFormData({...formData, custom_subject_name: e.target.value})}
                    required
                  />
                )}
              </>
            ) : (
              <input 
                type="text"
                className="input"
                placeholder="Fan nomini kiriting..."
                value={formData.custom_subject_name}
                onChange={(e) => setFormData({
                  ...formData, 
                  subject_id: 'custom_subject', 
                  custom_subject_name: e.target.value
                })}
                required
              />
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Bekor qilish
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
