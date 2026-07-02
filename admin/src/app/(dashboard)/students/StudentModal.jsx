import { useState, useEffect } from 'react';
import Modal from '@/components/Modal/Modal';
import styles from './StudentModal.module.css';

export default function StudentModal({ isOpen, onClose, student, groups, organizationId, onSuccess }) {
  const isEdit = !!student;
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    group_id: '',
    isMonitor: false,
    password: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEdit) {
        setFormData({
          id: student.users?.id,
          full_name: student.users?.full_name || '',
          phone: student.users?.phone || '',
          email: student.users?.email || '',
          group_id: student.groups?.id || '',
          isMonitor: student.users?.role === 'monitor',
          password: '',
        });
      } else {
        setFormData({ full_name: '', phone: '', email: '', group_id: '', isMonitor: false, password: '' });
      }
    }
  }, [isOpen, student]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.group_id) return alert('Guruh tanlang');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        role: formData.isMonitor ? 'monitor' : 'student',
        organization_id: organizationId,
      };

      const res = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!isEdit && data.password) {
        alert(`O'quvchi qo'shildi!\nVaqtinchalik parol: ${data.password}`);
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
      title={isEdit ? "O'quvchini tahrirlash" : "Yangi o'quvchi qo'shish"}
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
              placeholder="Bo'sh qolsa avtomatik yaratiladi"
            />
          </div>
        </div>

        <div className="form-group">
          <label>{isEdit ? 'Yangi parol (bo\'sh qoldirsa o\'zgarmaydi)' : 'Parol (bo\'sh qoldirsa standart 123456)'}</label>
          <input 
            type="password"
            className="input" 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            placeholder={isEdit ? '••••••••' : '123456'}
            required={false}
            minLength={6}
          />
        </div>

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
              <option key={g.id} value={g.id}>{g.name} ({g.course_name})</option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
          <input 
            type="checkbox"
            id="isMonitor"
            checked={formData.isMonitor}
            onChange={e => setFormData({...formData, isMonitor: e.target.checked})}
          />
          <label htmlFor="isMonitor" style={{ margin: 0 }}>Ushbu o'quvchi sinf sardori (monitor) mi?</label>
        </div>
      </form>
    </Modal>
  );
}
