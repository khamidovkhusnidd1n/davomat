import { useState, useEffect } from 'react';
import Modal from '@/components/Modal/Modal';
import { supabase } from '@/lib/supabase';
import styles from '../students/StudentModal.module.css'; // Reusing CSS

export default function GroupModal({ isOpen, onClose, group, nazoratchis, monitors, organizationId, onSuccess }) {
  const isEdit = !!group;
  const [formData, setFormData] = useState({
    name: '',
    course_name: '',
    education_type: 'qayta_tayyorlov',
    nazoratchi_id: '',
    monitor_id: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEdit) {
        setFormData({
          id: group.id,
          name: group.name || '',
          course_name: group.course_name || '',
          education_type: group.education_type || 'qayta_tayyorlov',
          nazoratchi_id: group.nazoratchi_id || '',
          monitor_id: group.monitor_id || '',
        });
      } else {
        setFormData({ name: '', course_name: '', education_type: 'qayta_tayyorlov', nazoratchi_id: '', monitor_id: '' });
      }
    }
  }, [isOpen, group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        name: formData.name,
        course_name: formData.course_name,
        education_type: formData.education_type,
        nazoratchi_id: formData.nazoratchi_id || null,
        monitor_id: formData.monitor_id || null,
        organization_id: organizationId,
      };

      console.log("Supabase Insert Payload:", payload);

      let error;
      if (isEdit) {
        const { error: err } = await supabase.from('groups').update(payload).eq('id', formData.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('groups').insert(payload);
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
      title={isEdit ? "Guruhni tahrirlash" : "Yangi guruh qo'shish"}
      footer={footer}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Ta'lim turi *</label>
          <select
            className="input"
            value={formData.education_type}
            onChange={e => setFormData({...formData, education_type: e.target.value})}
            required
          >
            <option value="qayta_tayyorlov">Qayta tayyorlov</option>
            <option value="malaka_oshirish">Malaka oshirish</option>
          </select>
        </div>

        <div className="form-group">
          <label>Guruh nomi *</label>
          <input 
            className="input" 
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            required
            autoFocus
          />
        </div>
        
        <div className="form-group">
          <label>Kurs nomi *</label>
          <input 
            className="input" 
            value={formData.course_name}
            onChange={e => setFormData({...formData, course_name: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>Nazoratchi (Guruh rahbari)</label>
          <select 
            className="input" 
            value={formData.nazoratchi_id || ''}
            onChange={e => setFormData({...formData, nazoratchi_id: e.target.value})}
          >
            <option value="">— Biriktirilmagan —</option>
            {nazoratchis?.map(t => (
              <option key={t.id} value={t.id}>{t.full_name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Sinf sardori (Monitor)</label>
          <select 
            className="input" 
            value={formData.monitor_id || ''}
            onChange={e => setFormData({...formData, monitor_id: e.target.value})}
          >
            <option value="">— Biriktirilmagan —</option>
            {monitors?.map(m => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
