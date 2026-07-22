'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit2, FileSpreadsheet } from 'lucide-react';
import ExcelImport from '@/components/ExcelImport/ExcelImport';
import StudentModal from './StudentModal';
import styles from './page.module.css';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBot, setFilterBot] = useState('all'); // 'all' | 'connected' | 'not_connected'
  const [showImport, setShowImport] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
        if (userData) setOrganizationId(userData.organization_id);
      }

      const [studentsRes, groupsRes] = await Promise.all([
        supabase.from('students').select(`
          id,
          status,
          joined_at,
          user_id,
          users ( id, full_name, phone, email, telegram_id ),
          groups ( id, name, course_name )
        `),
        supabase.from('groups').select('id, name, course_name'),
      ]);

      setStudents(studentsRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Rostdan ham o\'chirasizmi?')) return;
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      fetchAll();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.users?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                          s.groups?.name?.toLowerCase().includes(search.toLowerCase());
    
    let matchesBot = true;
    if (filterBot === 'connected') matchesBot = !!s.users?.telegram_id;
    if (filterBot === 'not_connected') matchesBot = !s.users?.telegram_id;

    return matchesSearch && matchesBot;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="O'quvchi ismi yoki guruh..."
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="input" 
          style={{ maxWidth: '180px' }}
          value={filterBot}
          onChange={(e) => setFilterBot(e.target.value)}
        >
          <option value="all">Barcha o'quvchilar</option>
          <option value="connected">Botga ulanganlar</option>
          <option value="not_connected">Botga ulanmaganlar</option>
        </select>

        <div className={styles.btnGroup}>
          <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
            <FileSpreadsheet size={18} /> Excel Import
          </button>
          <button className="btn btn-primary" onClick={() => { setEditingStudent(null); setShowModal(true); }}>
            <Plus size={18} /> Yangi O'quvchi
          </button>
        </div>
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
                  <th>F.I.Sh</th>
                  <th>Login</th>
                  <th>Guruh</th>
                  <th>Telefon</th>
                  <th>Bot</th>
                  <th>Status</th>
                  <th>Qo'shilgan sana</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="9" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filteredStudents.map((student, index) => (
                    <tr key={student.id}>
                      <td>{index + 1}</td>
                      <td>{student.users?.full_name || 'Noma\'lum'}</td>
                      <td>{student.users?.email || '-'}</td>
                      <td>{student.groups?.name || 'Guruhsiz'}</td>
                      <td>{student.users?.phone || '-'}</td>
                      <td>
                        {student.users?.telegram_id ? (
                          <span className={styles.statusBadge} style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }}>Ulangan</span>
                        ) : (
                          <span className={styles.statusBadge} style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>Yo'q</span>
                        )}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles[student.status] || ''}`}>
                          {student.status === 'active' ? 'Faol' : student.status === 'left' ? 'Ketgan' : 'Ko\'chgan'}
                        </span>
                      </td>
                      <td>{new Date(student.joined_at).toLocaleDateString('uz-UZ')}</td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn} onClick={() => { setEditingStudent(student); setShowModal(true); }}>
                            <Edit2 size={16} />
                          </button>
                          <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(student.user_id)}>
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

      <ExcelImport
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        groups={groups}
        organizationId={organizationId}
        onSuccess={fetchAll}
      />
      
      <StudentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        student={editingStudent}
        groups={groups}
        organizationId={organizationId}
        onSuccess={fetchAll}
      />
    </div>
  );
}
