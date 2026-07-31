'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal/Modal';
import { Trash2, Plus, AlertCircle } from 'lucide-react';
import styles from './TeacherModal.module.css';

export default function TeacherModal({ isOpen, onClose, teacher, academicYear, onSuccess }) {
  const isEdit = !!teacher;

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    education_type: 'qayta_tayyorlov',
    degree: ''
  });
  const [assignedSubjects, setAssignedSubjects] = useState([]); // Array of { id, subject_id, new_subject_name, allocated_hours, completed_hours }
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
      fetchOrgId();
      if (isEdit) {
        setFormData({
          full_name: teacher.full_name || '',
          phone: teacher.phone || '',
          education_type: teacher.education_type || 'qayta_tayyorlov',
          degree: teacher.degree || ''
        });
        // Map existing subjects
        const subjectsList = teacher.teacher_subjects?.map(ts => ({
          id: ts.id,
          subject_id: ts.subjects?.id || '',
          new_subject_name: '',
          allocated_hours: ts.allocated_hours || 120,
          completed_hours: ts.completed_hours || 0
        })) || [];
        
        if (subjectsList.length === 0) {
          subjectsList.push({
            id: 'new-' + Date.now(),
            subject_id: '',
            new_subject_name: '',
            allocated_hours: 120,
            completed_hours: 0
          });
        }
        setAssignedSubjects(subjectsList);
      } else {
        setFormData({
          full_name: '',
          phone: '',
          education_type: 'qayta_tayyorlov',
          degree: ''
        });
        setAssignedSubjects([
          {
            id: 'new-' + Date.now(),
            subject_id: '',
            new_subject_name: '',
            allocated_hours: 120,
            completed_hours: 0
          }
        ]);
      }
    }
  }, [isOpen, teacher]);

  async function fetchOrgId() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
      if (data) setOrgId(data.organization_id);
    }
  }

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    if (data) setAllSubjects(data);
  }

  const handleAddSubjectRow = () => {
    setAssignedSubjects([
      ...assignedSubjects,
      { id: 'new-' + Date.now(), subject_id: '', new_subject_name: '', allocated_hours: 120, completed_hours: 0 }
    ]);
  };

  const handleRemoveSubjectRow = (index) => {
    setAssignedSubjects(assignedSubjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index, field, value) => {
    const updated = [...assignedSubjects];
    updated[index][field] = value;
    setAssignedSubjects(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name) {
      alert('Ism-sharif kiritilishi shart');
      return;
    }
    setLoading(true);

    try {
      let currentOrgId = orgId;
      if (!currentOrgId) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data } = await supabase.from('users').select('organization_id').eq('id', user?.id).single();
        currentOrgId = data?.organization_id || '11111111-1111-1111-1111-111111111111';
      }

      let teacherId = teacher?.id;

      // 1. Insert or Update Teacher
      if (isEdit) {
        const { error } = await supabase
          .from('teachers')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            education_type: formData.education_type,
            degree: formData.degree || null
          })
          .eq('id', teacher.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('teachers')
          .insert({
            organization_id: currentOrgId,
            full_name: formData.full_name,
            phone: formData.phone,
            education_type: formData.education_type,
            degree: formData.degree || null
          })
          .select('id')
          .single();
        if (error) throw error;
        teacherId = data.id;
      }

      // 2. Process subjects (clean delete & insert new)
      const { error: delErr } = await supabase
        .from('teacher_subjects')
        .delete()
        .eq('teacher_id', teacherId)
        .eq('academic_year', academicYear);
      if (delErr) throw delErr;

      for (const as of assignedSubjects) {
        let finalSubjectId = as.subject_id;

        // If it's a new custom subject, insert it first
        if (as.subject_id === 'new_subject') {
          if (!as.new_subject_name) continue;
          
          const { data: subData, error: subErr } = await supabase
            .from('subjects')
            .upsert({
              organization_id: currentOrgId,
              name: as.new_subject_name
            }, { onConflict: 'organization_id,name' })
            .select('id')
            .single();

          if (subErr) throw subErr;
          finalSubjectId = subData.id;
        }

        if (finalSubjectId) {
          const { error: tsErr } = await supabase
            .from('teacher_subjects')
            .insert({
              teacher_id: teacherId,
              subject_id: finalSubjectId,
              allocated_hours: parseInt(as.allocated_hours) || 0,
              completed_hours: parseInt(as.completed_hours) || 0,
              academic_year: academicYear
            });
          if (tsErr) throw tsErr;
        }
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className={styles.modalFooter}>
      <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
        Bekor qilish
      </button>
      <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Saqlanmoqda...' : 'Saqlash'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi qo'shish"}
      footer={footer}
    >
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className="form-group">
          <label>F.I.Sh. *</label>
          <input
            type="text"
            className="input"
            value={formData.full_name}
            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Professor ismi..."
            required
            autoFocus
          />
        </div>

        <div className={styles.row}>
          <div className="form-group">
            <label>Telefon</label>
            <input
              type="text"
              className="input"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+998901234567"
            />
          </div>
          <div className="form-group">
            <label>Ta'lim turi</label>
            <select
              className="input"
              value={formData.education_type}
              onChange={e => setFormData({ ...formData, education_type: e.target.value })}
            >
              <option value="qayta_tayyorlov">Qayta tayyorlov</option>
              <option value="malaka_oshirish">Malaka oshirish</option>
            </select>
          </div>
          <div className="form-group">
            <label>Ilmiy daraja</label>
            <select
              className="input"
              value={formData.degree}
              onChange={e => setFormData({ ...formData, degree: e.target.value })}
            >
              <option value="">— Tanlanmagan —</option>
              <option value="PhD">PhD</option>
              <option value="Academic">Academic</option>
              <option value="Professor">Professor</option>
            </select>
          </div>
        </div>

        {/* Subjects list */}
        <div className={styles.subjectsSection}>
          <div className={styles.subjectsHeader}>
            <h4>Fanlar va biriktirilgan soatlar ({academicYear})</h4>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              onClick={handleAddSubjectRow}
            >
              <Plus size={14} /> Fan qo'shish
            </button>
          </div>

          {assignedSubjects.length === 0 ? (
            <div className={styles.noSubjectsAlert}>
              <AlertCircle size={16} />
              <span>O'quv yili uchun hali hech qanday fan tanlanmagan.</span>
            </div>
          ) : (
            <div className={styles.subjectsList}>
              {assignedSubjects.map((as, index) => (
                <div key={as.id} className={styles.subjectRow}>
                  <div className={styles.subjectCol}>
                    <select
                      className="input"
                      value={as.subject_id}
                      onChange={e => handleSubjectChange(index, 'subject_id', e.target.value)}
                      required
                    >
                      <option value="">Fanni tanlang</option>
                      {allSubjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                      <option value="new_subject" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        + Yangi fan qo'shish
                      </option>
                    </select>
                    {as.subject_id === 'new_subject' && (
                      <input
                        type="text"
                        className="input"
                        style={{ marginTop: '6px' }}
                        placeholder="Yangi fan nomini kiriting..."
                        value={as.new_subject_name}
                        onChange={e => handleSubjectChange(index, 'new_subject_name', e.target.value)}
                        required
                      />
                    )}
                  </div>
                  <div className={styles.hoursCol} style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Ajratilgan</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: '80px' }}
                        placeholder="Ajratilgan"
                        value={as.allocated_hours}
                        onChange={e => handleSubjectChange(index, 'allocated_hours', e.target.value)}
                        min="0"
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>O'tilgan</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: '80px' }}
                        placeholder="O'tilgan"
                        value={as.completed_hours}
                        onChange={e => handleSubjectChange(index, 'completed_hours', e.target.value)}
                        min="0"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.deleteRowBtn}
                    onClick={() => handleRemoveSubjectRow(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
