import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal/Modal';
import styles from '../students/StudentModal.module.css';

export default function TutorModal({ isOpen, onClose, tutor, organizationId, onSuccess }) {
  const isEdit = !!tutor;
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEdit) {
        setFormData({
          id: tutor.id,
          full_name: tutor.full_name || '',
          phone: tutor.phone || '',
          email: tutor.email || '',
          password: '',
        });
      } else {
        setFormData({ full_name: '', phone: '', email: '', password: '' });
      }
    }
  }, [isOpen, tutor]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        role: 'tutor',
        organization_id: organizationId,
      };

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!isEdit && data.password) {
        alert(`Tutor qo'shildi!\nVaqtinchalik parol: ${data.password}`);
      }
      
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
      title={isEdit ? "Tutorni tahrirlash" : "Yangi tutor qo'shish"}
      footer={footer}
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className="form-group">
          <label>F.I.Sh *</label>
          <input 
            className="input" 
            value={formData.full_name}
            onChange={e => setFormData({...formData, full_name: e.target.value})}
            required
            autoFocus
          />
        </div>
        
        <div className={styles.row}>
          <div className="form-group">
            <label>Telefon</label>
            <input 
              className="input" 
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Login (yoki email)</label>
            <input 
              className="input" 
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              placeholder="Masalan: tutor1"
            />
          </div>
        </div>

        <div className="form-group">
          <label>{isEdit ? 'Yangi parol (bo\'sh qoldirsa o\'zgarmaydi)' : 'Parol (ixtiyoriy)'}</label>
          <input 
            type="password"
            className="input" 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            placeholder={isEdit ? '••••••••' : 'Standart parol: 123456'}
            required={false}
            minLength={6}
          />
        </div>
      </form>
    </Modal>
  );
}
