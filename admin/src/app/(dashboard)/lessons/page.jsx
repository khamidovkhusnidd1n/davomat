'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Calendar, Eye, Plus, X, Edit, Trash } from 'lucide-react';
import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';
import ExcelLessonsImport from '@/components/ExcelLessonsImport/ExcelLessonsImport';
import Modal from '@/components/Modal/Modal';
import styles from './page.module.css';

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [formData, setFormData] = useState({
    group_id: '',
    lesson_date: new Date().toISOString().split('T')[0],
    title: ''
  });
  const [editFormData, setEditFormData] = useState({
    id: '',
    group_id: '',
    lesson_date: '',
    title: ''
  });

  useEffect(() => {
    fetchLessons();
    fetchGroups();
  }, []);

  async function fetchGroups() {
    const { data } = await supabase.from('groups').select('id, name').order('name');
    if (data) setGroups(data);
  }

  async function fetchLessons() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
      
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          title,
          lesson_date,
          groups ( name, course_name ),
          users!lessons_created_by_fkey ( full_name ),
          attendance ( status )
        `)
        .order('lesson_date', { ascending: false });
      
      if (error) throw error;
      setLessons(data || []);
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLessons = lessons.filter(l => 
    l.title?.toLowerCase().includes(search.toLowerCase()) || 
    l.groups?.name?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSaveLesson(e) {
    e.preventDefault();
    if (!formData.group_id || !formData.lesson_date || !formData.title) return;
    
    try {
      setSaving(true);
      const { error } = await supabase.from('lessons').insert({
        group_id: formData.group_id,
        lesson_date: formData.lesson_date,
        title: formData.title,
        created_by: null // Tizim
      });
      
      if (error) throw error;
      
      setShowModal(false);
      setFormData({ group_id: '', lesson_date: new Date().toISOString().split('T')[0], title: '' });
      fetchLessons();
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  }

  const handleEditClick = (lesson) => {
    setEditFormData({
      id: lesson.id,
      group_id: lesson.group_id || '',
      lesson_date: lesson.lesson_date || '',
      title: lesson.title || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateLesson = async (e) => {
    e.preventDefault();
    if (!editFormData.group_id || !editFormData.lesson_date || !editFormData.title) return;
    try {
      setEditing(true);
      const { error } = await supabase
        .from('lessons')
        .update({
          group_id: editFormData.group_id,
          lesson_date: editFormData.lesson_date,
          title: editFormData.title
        })
        .eq('id', editFormData.id);
      
      if (error) throw error;
      setShowEditModal(false);
      fetchLessons();
    } catch (err) {
      console.error(err);
      alert('Xatolik yuz berdi: ' + err.message);
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteLesson = async (id) => {
    if (!confirm("Haqiqatan ham ushbu darsni o'chirmoqchimisiz? Darsga tegishli barcha davomatlar ham butunlay o'chib ketadi!")) return;
    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchLessons();
    } catch (err) {
      console.error(err);
      alert("O'chirishda xatolik: " + err.message);
    }
  };

  if (userRole === 'director') {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Sizda ushbu sahifaga kirish huquqi yo'q.</div>;
  }

  const isWriteEnabled = userRole === 'sysadmin' || userRole === 'admin' || userRole === 'academic';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Dars mavzusi yoki guruh..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isWriteEnabled && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" style={{backgroundColor: '#e0e7ff', color: '#4f46e5'}} onClick={() => setShowImport(true)}>
              <FileSpreadsheet size={18} /> Excel Import
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={20} />
              <span>Dars qo'shish</span>
            </button>
          </div>
        )}
      </div>

      <div className={`card ${styles.tableCard}`}>
        {loading ? (
          <div className={styles.loading}>Yuklanmoqda...</div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sana</th>
                  <th>Guruh</th>
                  <th>Mavzu</th>
                  <th>Yaratuvchi</th>
                  <th>Davomat</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filteredLessons.map((lesson, index) => {
                    const present = lesson.attendance.filter(a => a.status === 'present').length;
                    const total = lesson.attendance.length;
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                    
                    return (
                      <tr key={lesson.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className={styles.dateWrapper}>
                            <Calendar size={14} className={styles.dateIcon} />
                            {new Date(lesson.lesson_date).toLocaleDateString('uz-UZ')}
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{lesson.groups?.name || 'Noma\'lum'}</td>
                        <td>{lesson.title || 'Mavzusiz'}</td>
                        <td>{lesson.users?.full_name || 'Tizim'}</td>
                        <td>
                          {total > 0 ? (
                            <div className={styles.progressWrapper}>
                              <div className={styles.progressBar}>
                                <div 
                                  className={styles.progressFill} 
                                  style={{ width: `${rate}%`, background: rate > 80 ? 'var(--success)' : rate > 50 ? 'var(--warning)' : 'var(--error)' }}
                                ></div>
                              </div>
                              <span className={styles.progressText}>{rate}% ({present}/{total})</span>
                            </div>
                          ) : (
                            <span className={styles.textMuted}>Kiritilmagan</span>
                          )}
                        </td>
                        <td>
                          <div className={styles.actionsContainer}>
                            <Link href={`/attendance?group=${encodeURIComponent(lesson.groups?.name || '')}&date=${lesson.lesson_date}`}>
                              <button className={styles.actionBtn} title="Ko'rish">
                                <Eye size={18} />
                              </button>
                            </Link>
                            {isWriteEnabled && (
                              <button className={styles.actionBtn} onClick={() => handleEditClick(lesson)} title="Tahrirlash">
                                <Edit size={18} />
                              </button>
                            )}
                            {(userRole === 'sysadmin' || userRole === 'admin') && (
                              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDeleteLesson(lesson.id)} title="O'chirish">
                                <Trash size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Yangi dars qo'shish"
      >
        <form onSubmit={handleSaveLesson}>
          <div className="form-group">
            <label>Guruh</label>
            <select 
              className="input" 
              value={formData.group_id}
              onChange={(e) => setFormData({...formData, group_id: e.target.value})}
              required
            >
              <option value="">Guruhni tanlang</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Sana</label>
            <input 
              type="date" 
              className="input" 
              value={formData.lesson_date}
              onChange={(e) => setFormData({...formData, lesson_date: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Modul/fan mavzusi (masalan: Rangtasvir)</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Mavzuni kiriting..."
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Darsni tahrirlash"
      >
        <form onSubmit={handleUpdateLesson}>
          <div className="form-group">
            <label>Guruh</label>
            <select 
              className="input" 
              value={editFormData.group_id}
              onChange={(e) => setEditFormData({...editFormData, group_id: e.target.value})}
              required
            >
              <option value="">Guruhni tanlang</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Sana</label>
            <input 
              type="date" 
              className="input" 
              value={editFormData.lesson_date}
              onChange={(e) => setEditFormData({...editFormData, lesson_date: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Modul/fan mavzusi (masalan: Rangtasvir)</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Mavzuni kiriting..."
              value={editFormData.title}
              onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn btn-primary" disabled={editing}>
              {editing ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </form>
      </Modal>

      <ExcelLessonsImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={fetchLessons}
      />
    </div>
  );
}
