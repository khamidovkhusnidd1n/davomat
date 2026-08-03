import { useState, useEffect } from 'react';
import Modal from '@/components/Modal/Modal';
import { supabase } from '@/lib/supabase';
import styles from '../students/StudentModal.module.css';

const DAYS = [
  { val: 1, label: 'Dushanba' },
  { val: 2, label: 'Seshanba' },
  { val: 3, label: 'Chorshanba' },
  { val: 4, label: 'Payshanba' },
  { val: 5, label: 'Juma' },
  { val: 6, label: 'Shanba' },
];

export default function ScheduleModal({ isOpen, onClose, schedule, groups, onSuccess }) {
  const isEdit = !!schedule;
  
  const [formData, setFormData] = useState({
    group_id: '',
    day_of_week: 1,
    start_time: '',
    end_time: '',
    teacher_id: '',
    subject_id: ''
  });
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: tData } = await supabase
          .from('teachers')
          .select(`
            id, 
            full_name,
            max_hours,
            teacher_subjects(completed_hours)
          `)
          .order('full_name');
        const { data: sData } = await supabase.from('subjects').select('id, name').order('name');
        
        if (tData) {
          const todayStr = new Date(new Date().getTime() + 5 * 60 * 60 * 1000).toISOString().split('T')[0];
          const teachersWithStats = await Promise.all(tData.map(async (t) => {
            const { data: lesData } = await supabase
              .from('lessons')
              .select('lesson_date, start_time, end_time')
              .eq('teacher_id', t.id);
            
            const manualCompleted = t.teacher_subjects?.reduce((sum, ts) => sum + (ts.completed_hours || 0), 0) || 0;

            const futureLessons = (lesData || []).filter(l => l.lesson_date >= todayStr);
            const dynamicHours = futureLessons.reduce((sum, l) => {
              const start = l.start_time || '09:00';
              const end = l.end_time || '13:00';
              const [startH, startM] = start.substring(0, 5).split(':').map(Number);
              const [endH, endM] = end.substring(0, 5).split(':').map(Number);
              const diffHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
              const hours = diffHours > 0 ? Math.round(diffHours * 1.5) : 6;
              return sum + hours;
            }, 0);

            const completedHours = manualCompleted + dynamicHours;
            
            return {
              ...t,
              completed_hours: completedHours,
              limit_reached: completedHours >= (t.max_hours || 120)
            };
          }));
          setTeachers(teachersWithStats);
        }
        if (sData) setSubjects(sData);
      } catch (err) {
        console.error("Error loading modal dropdowns:", err);
      }
    }

    if (isOpen) {
      loadData();
      if (isEdit) {
        setFormData({
          id: schedule.id,
          group_id: schedule.group_id || '',
          day_of_week: schedule.day_of_week || 1,
          start_time: schedule.start_time ? schedule.start_time.substring(0, 5) : '',
          end_time: schedule.end_time ? schedule.end_time.substring(0, 5) : '',
          teacher_id: schedule.teacher_id || '',
          subject_id: schedule.subject_id || '',
        });
      } else {
        setFormData({ group_id: '', day_of_week: 1, start_time: '', end_time: '', teacher_id: '', subject_id: '' });
      }
    }
  }, [isOpen, schedule, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Frontend validation for time inputs
    if (!formData.start_time || !formData.end_time) {
      alert("Iltimos, darsning boshlanish va tugash vaqtini kiriting.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        group_id: formData.group_id,
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        teacher_id: formData.teacher_id || null,
        subject_id: formData.subject_id || null,
      };

      if (isEdit) {
        payload.id = formData.id;
      }

      // Auto-create lessons payload for next 16 weeks (only for new schedules)
      const lessonDates = [];
      if (!isEdit) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetJsDay = formData.day_of_week % 7; 
        const startDate = new Date(today);
        const todayJs = today.getDay();
        let daysUntilTarget = (targetJsDay - todayJs + 7) % 7;
        if (daysUntilTarget === 0) daysUntilTarget = 0; 

        startDate.setDate(startDate.getDate() + daysUntilTarget);

        for (let week = 0; week < 16; week++) {
          const d = new Date(startDate);
          d.setDate(d.getDate() + week * 7);
          const dateStr = d.toISOString().split('T')[0];

          const subject = subjects.find(s => s.id === formData.subject_id);
          const titleParts = [];
          if (formData.start_time && formData.end_time) {
            titleParts.push(`${formData.start_time}-${formData.end_time} |`);
          }
          if (subject) titleParts.push(subject.name);
          const title = titleParts.join(' ');

          lessonDates.push({
            group_id: formData.group_id,
            lesson_date: dateStr,
            title,
            start_time: formData.start_time || null,
            end_time: formData.end_time || null,
            teacher_id: formData.teacher_id || null,
            subject_id: formData.subject_id || null,
            lesson_type: 'practice',
          });
        }
      }

      // Call our API Route to bypass RLS issues for sysadmin and perform insert atomically
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/schedules/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({
          action: isEdit ? 'update' : 'insert',
          schedule: payload,
          lessons: lessonDates
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Saqlashda xatolik yuz berdi');

      onSuccess?.();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };



  const footer = (
    <>
      <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Bekor qilish</button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "Jadvalni tahrirlash" : "Yangi jadval qo'shish"}
      footer={footer}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Guruh *</label>
          <select 
            className="input" 
            value={formData.group_id}
            onChange={e => setFormData({...formData, group_id: e.target.value})}
            required
          >
            <option value="">— Guruh tanlang —</option>
            {groups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label>Hafta kuni *</label>
          <select 
            className="input" 
            value={formData.day_of_week}
            onChange={e => setFormData({...formData, day_of_week: Number(e.target.value)})}
            required
          >
            {DAYS.map(d => (
              <option key={d.val} value={d.val}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>O'qituvchi</label>
          <select 
            className="input" 
            value={formData.teacher_id}
            onChange={e => setFormData({...formData, teacher_id: e.target.value})}
          >
            <option value="">— Tanlanmagan —</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>
                {t.full_name} {t.limit_reached ? `(Limit to'lgan: ${t.completed_hours}/${t.max_hours} s)` : `(${t.completed_hours}/${t.max_hours} s)`}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Fan</label>
          <select 
            className="input" 
            value={formData.subject_id}
            onChange={e => setFormData({...formData, subject_id: e.target.value})}
          >
            <option value="">— Tanlanmagan —</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <div className="form-group">
            <label>Boshlanish vaqti *</label>
            <input 
              type="time"
              className="input" 
              value={formData.start_time}
              onChange={e => setFormData({...formData, start_time: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Tugash vaqti *</label>
            <input 
              type="time"
              className="input" 
              value={formData.end_time}
              onChange={e => setFormData({...formData, end_time: e.target.value})}
              required
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
