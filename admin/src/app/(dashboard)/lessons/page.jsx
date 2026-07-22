'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Calendar, Eye, Plus, X } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    group_id: '',
    lesson_date: new Date().toISOString().split('T')[0],
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
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          <span>Dars qo'shish</span>
        </button>
      </div>

      <div className={`card ${styles.tableCard}`}>
        {loading ? (
          <div className={styles.loading}>Yuklanmoqda...</div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Guruh</th>
                  <th>Mavzu</th>
                  <th>Yaratuvchi</th>
                  <th>Davomat</th>
                  <th>Batafsil</th>
                </tr>
              </thead>
              <tbody>
                {filteredLessons.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filteredLessons.map((lesson) => {
                    const present = lesson.attendance.filter(a => a.status === 'present').length;
                    const total = lesson.attendance.length;
                    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
                    
                    return (
                      <tr key={lesson.id}>
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
                          <Link href={`/attendance?group=${encodeURIComponent(lesson.groups?.name || '')}&date=${lesson.lesson_date}`}>
                            <button className={styles.actionBtn} title="Ko'rish">
                              <Eye size={18} />
                            </button>
                          </Link>
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

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Yangi dars qo'shish</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveLesson} className="modal-form">
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
                <label>Dars mavzusi yoki nomi (masalan: 14:00 darsi)</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Mavzuni kiriting..."
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Bekor qilish
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
