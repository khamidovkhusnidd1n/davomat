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
          const teachersWithStats = await Promise.all(tData.map(async (t) => {
            const { count } = await supabase
              .from('lessons')
              .select('id', { count: 'exact', head: true })
              .eq('teacher_id', t.id);
            
            const manualCompleted = t.teacher_subjects?.reduce((sum, ts) => sum + (ts.completed_hours || 0), 0) || 0;
            const completedHours = ((count || 0) * 2) + manualCompleted;
            
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

      let error;
      if (isEdit) {
        const { error: err } = await supabase.from('schedules').update(payload).eq('id', formData.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('schedules').insert(payload);
        error = err;
      }

      if (error) throw error;
      
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
