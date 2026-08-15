'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal/Modal';
import { Trash2, Plus, AlertCircle } from 'lucide-react';
import styles from './TeacherModal.module.css';

const DEFAULT_SUBJECT_HOURS = {
  "Ta'lim jarayoniga raqamli texnologiyalarni joriy etish": { theory: 4, practice: 8 },
  "Art marketing": { theory: 10, practice: 10 },
  "Tasviriy san'atning umumiy tarixi": { theory: 26, practice: 28 },
  "Tasviriy san'atda an'anaviy va zamonaviy uslublar": { theory: 8, practice: 22 },
  "Jonli odam qomatidan anatomik chizmatasvir": { theory: 6, practice: 50 },
  "Materialshunoslik va rangtasvir texnika texnologiyasi": { theory: 10, practice: 70 },
  "Chizmatasvir": { theory: 0, practice: 228 },
  "Rangtasvir": { theory: 0, practice: 228 },
  "Kompozitsiya": { theory: 0, practice: 114 },
  "Kompazitsiya": { theory: 0, practice: 114 },
  "San'at estetikasi": { theory: 16, practice: 0 },
  "Nutq madaniyati": { theory: 0, practice: 14 },
  "Yakuniy attestatsiya": { theory: 0, practice: 12 }
};

export default function TeacherModal({ isOpen, onClose, teacher, academicYear, onSuccess }) {
  const isEdit = !!teacher;

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    education_type: 'qayta_tayyorlov',
    degree: '',
    max_hours: 120
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
          degree: teacher.degree || '',
          max_hours: teacher.max_hours || 120
        });
        // Map existing subjects
        const subjectsList = teacher.teacher_subjects?.map(ts => ({
          id: ts.id,
          subject_id: ts.subjects?.id || '',
          new_subject_name: '',
          allocated_theory_hours: ts.allocated_theory_hours || 0,
          allocated_practice_hours: ts.allocated_practice_hours || 0,
          completed_theory_hours: ts.completed_theory_hours || 0,
          completed_practice_hours: ts.completed_practice_hours || 0
        })) || [];
        
        if (subjectsList.length === 0) {
          subjectsList.push({
            id: 'new-' + Date.now(),
            subject_id: '',
            new_subject_name: '',
            allocated_theory_hours: 0,
            allocated_practice_hours: 0,
            completed_theory_hours: 0,
            completed_practice_hours: 0
          });
        }
        setAssignedSubjects(subjectsList);
      } else {
        setFormData({
          full_name: '',
          phone: '',
          education_type: 'qayta_tayyorlov',
          degree: '',
          max_hours: 120
        });
        setAssignedSubjects([
          {
            id: 'new-' + Date.now(),
            subject_id: '',
            new_subject_name: '',
            allocated_theory_hours: 0,
            allocated_practice_hours: 0,
            completed_theory_hours: 0,
            completed_practice_hours: 0
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
      { id: 'new-' + Date.now(), subject_id: '', new_subject_name: '', allocated_theory_hours: 0, allocated_practice_hours: 0, completed_theory_hours: 0, completed_practice_hours: 0 }
    ]);
  };

  const handleRemoveSubjectRow = (index) => {
    setAssignedSubjects(assignedSubjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (index, field, value) => {
    const updated = [...assignedSubjects];
    updated[index][field] = value;

    // Auto-fill allocated theory and practice hours if subject_id is changed
    if (field === 'subject_id' && value && value !== 'new_subject') {
      const selectedSub = allSubjects.find(s => s.id === value);
      if (selectedSub && DEFAULT_SUBJECT_HOURS[selectedSub.name] !== undefined) {
        const hoursObj = DEFAULT_SUBJECT_HOURS[selectedSub.name];
        updated[index]['allocated_theory_hours'] = hoursObj.theory;
        updated[index]['allocated_practice_hours'] = hoursObj.practice;
      }
    }

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
            degree: formData.degree || null,
            max_hours: parseInt(formData.max_hours) || 120
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
            degree: formData.degree || null,
            max_hours: parseInt(formData.max_hours) || 120
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
          const theoryAlloc = parseInt(as.allocated_theory_hours) || 0;
          const practiceAlloc = parseInt(as.allocated_practice_hours) || 0;
          const theoryComp = parseInt(as.completed_theory_hours) || 0;
          const practiceComp = parseInt(as.completed_practice_hours) || 0;

          const { error: tsErr } = await supabase
            .from('teacher_subjects')
            .insert({
              teacher_id: teacherId,
              subject_id: finalSubjectId,
              allocated_hours: theoryAlloc + practiceAlloc,
              completed_hours: theoryComp + practiceComp,
              allocated_theory_hours: theoryAlloc,
              allocated_practice_hours: practiceAlloc,
              completed_theory_hours: theoryComp,
              completed_practice_hours: practiceComp,
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
      large={true}
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
            <label>Ta'lim turi (Bir nechtasini tanlash mumkin)</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              {[
                { id: 'qayta_tayyorlov', label: 'Qayta tayyorlov' },
                { id: 'malaka_oshirish', label: 'Malaka oshirish' },
                { id: 'otm', label: 'OTM' }
              ].map(opt => {
                let currentTypes = (formData.education_type || '').split(',').map(s => s.trim()).filter(Boolean);
                if (currentTypes.includes('ikkalasi')) {
                  currentTypes = ['qayta_tayyorlov', 'malaka_oshirish'];
                }
                const isChecked = currentTypes.includes(opt.id);
                return (
                  <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      style={{ cursor: 'pointer' }}
                      onChange={() => {
                        let newTypes = [...currentTypes];
                        if (isChecked) {
                          newTypes = newTypes.filter(t => t !== opt.id);
                        } else {
                          newTypes.push(opt.id);
                        }
                        setFormData({ ...formData, education_type: newTypes.join(',') });
                      }}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
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
          <div className="form-group">
            <label>Yillik limit soati *</label>
            <input
              type="number"
              className="input"
              value={formData.max_hours}
              onChange={e => setFormData({ ...formData, max_hours: Number(e.target.value) })}
              min="0"
              required
            />
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
                  <div className={styles.hoursCol} style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '2px', whiteSpace: 'nowrap' }}>Nazariy Ajr.</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: '100px', padding: '10px 8px' }}
                        value={as.allocated_theory_hours}
                        onChange={e => handleSubjectChange(index, 'allocated_theory_hours', e.target.value)}
                        min="0"
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '2px', whiteSpace: 'nowrap' }}>Amaliy Ajr.</span>
                      <input
                        type="number"
                        className="input"
                        style={{ width: '100px', padding: '10px 8px' }}
                        value={as.allocated_practice_hours}
                        onChange={e => handleSubjectChange(index, 'allocated_practice_hours', e.target.value)}
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
