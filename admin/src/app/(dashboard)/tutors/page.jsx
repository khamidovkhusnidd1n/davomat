'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit2 } from 'lucide-react';
import TutorModal from './TutorModal';
import styles from './page.module.css';

export default function TutorsPage() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTutor, setEditingTutor] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);

  useEffect(() => {
    fetchTutors();
  }, []);

  async function fetchTutors() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
        if (userData) setOrganizationId(userData.organization_id);
      }
      
      // Fetch tutors and their assigned groups
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          phone,
          email,
          created_at,
          groups!groups_tutor_id_fkey ( name, course_name )
        `)
        .eq('role', 'tutor');
      
      if (error) throw error;
      setTutors(data || []);
    } catch (error) {
      console.error('Error fetching tutors:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Rostdan ham o\'chirasizmi?')) return;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      fetchTutors();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredTutors = tutors.filter(t => 
    t.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    t.phone?.includes(search)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Tutor ismi yoki telefon..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingTutor(null); setShowModal(true); }}>
          <Plus size={18} /> Yangi Tutor
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
                  <th>F.I.Sh</th>
                  <th>Guruhlari</th>
                  <th>Telefon</th>
                  <th>Email</th>
                  <th>Qo'shilgan sana</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredTutors.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filteredTutors.map((tutor) => (
                    <tr key={tutor.id}>
                      <td>{tutor.full_name || 'Noma\'lum'}</td>
                      <td>
                        {tutor.groups && tutor.groups.length > 0 
                          ? tutor.groups.map(g => g.name).join(', ') 
                          : 'Guruhsiz'}
                      </td>
                      <td>{tutor.phone || '-'}</td>
                      <td>{tutor.email || '-'}</td>
                      <td>{new Date(tutor.created_at).toLocaleDateString('uz-UZ')}</td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn} onClick={() => { setEditingTutor(tutor); setShowModal(true); }}>
                            <Edit2 size={16} />
                          </button>
                          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(tutor.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TutorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        tutor={editingTutor}
        organizationId={organizationId}
        onSuccess={fetchTutors}
      />
    </div>
  );
}
