'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit2, FileSpreadsheet, RotateCcw } from 'lucide-react';
import ExcelImport from '@/components/ExcelImport/ExcelImport';
import StudentModal from './StudentModal';
import styles from './page.module.css';

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBot, setFilterBot] = useState('all'); // 'all' | 'connected' | 'not_connected'
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll(silent = false) {
    try {
      if (!silent) setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('organization_id, role').eq('id', user.id).single();
        if (userData) {
          setOrganizationId(userData.organization_id);
          setUserRole(userData.role);
        }
      }

      const [studentsRes, groupsRes, testRes] = await Promise.all([
        supabase.from('students').select(`
          id,
          status,
          joined_at,
          user_id,
          users ( id, full_name, phone, email, telegram_id ),
          groups ( id, name, course_name, status )
        `),
        supabase.from('groups').select('id, name, course_name, status'),
        supabase.from('test_results').select('user_id, score, is_passed')
      ]);

      const testData = testRes.data || [];
      const enrichedStudents = (studentsRes.data || []).map(st => {
        const tr = testData.find(t => t.user_id === st.user_id);
        return { ...st, testResult: tr || null };
      });

      setStudents(enrichedStudents);
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
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({ id: userId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      fetchAll(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleResetTest = async (userId, telegramId) => {
    if (!confirm("Haqiqatan ham bu tinglovchiga testni qayta topshirishga ruxsat berasizmi? (Eski natija o'chadi)")) return;
    try {
      const res = await fetch('/api/test-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, telegram_id: telegramId })
      });
      if (!res.ok) throw new Error("Xatolik yuz berdi");
      alert("Test natijasi bekor qilindi va tinglovchiga bot orqali xabar yuborildi!");
      fetchAll(true);
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

    let matchesGroup = true;
    if (selectedGroupFilter === 'all') {
      matchesGroup = s.groups?.status !== 'archived';
    } else if (selectedGroupFilter === 'all_archived') {
      matchesGroup = s.groups?.status === 'archived';
    } else {
      matchesGroup = s.groups?.id === selectedGroupFilter;
    }

    return matchesSearch && matchesBot && matchesGroup;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Tinglovchi ismi yoki guruh..."
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select 
            className="input" 
            style={{ maxWidth: '180px' }}
            value={filterBot}
            onChange={(e) => setFilterBot(e.target.value)}
          >
            <option value="all">Barcha tinglovchilar</option>
            <option value="connected">Botga ulanganlar</option>
            <option value="not_connected">Botga ulanmaganlar</option>
          </select>

          <select 
            className="input" 
            style={{ maxWidth: '180px' }}
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
          >
            <option value="all">Barcha faol guruhlar</option>
            <option value="all_archived">Barcha arxivdagi guruhlar</option>
            <optgroup label="Faol guruhlar">
              {groups.filter(g => g.status !== 'archived').map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </optgroup>
            <optgroup label="Arxivdagi guruhlar">
              {groups.filter(g => g.status === 'archived').map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {(userRole === 'sysadmin' || userRole === 'admin') && (
          <div className={styles.btnGroup}>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              <FileSpreadsheet size={18} /> Excel Import
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingStudent(null); setShowModal(true); }}>
              <Plus size={18} /> Yangi Tinglovchi
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
                  <th>F.I.Sh</th>
                  <th>Login</th>
                  <th>Guruh</th>
                  <th>Telefon</th>
                  <th>Bot</th>
                  <th>Status</th>
                  <th>Yakuniy</th>
                  <th>Qo'shilgan sana</th>
                  {(userRole === 'sysadmin' || userRole === 'admin') && <th>Amallar</th>}
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
                      <td>
                        {student.testResult ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 'bold', color: student.testResult.is_passed ? 'var(--success)' : 'var(--danger)' }}>
                              {student.testResult.score} bal
                            </span>
                            {(userRole === 'sysadmin' || userRole === 'admin') && (
                              <button 
                                onClick={() => handleResetTest(student.user_id, student.users?.telegram_id)}
                                title="Qayta topshirishga ruxsat berish"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0 }}
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        ) : '-'}
                      </td>
                      <td>{new Date(student.joined_at).toLocaleDateString('uz-UZ')}</td>
                      {(userRole === 'sysadmin' || userRole === 'admin') && (
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
                      )}
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
        groups={groups.filter(g => g.status === 'active')}
        organizationId={organizationId}
        onSuccess={() => fetchAll(true)}
      />
      
      <StudentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        student={editingStudent}
        groups={groups.filter(g => g.status === 'active')}
        organizationId={organizationId}
        onSuccess={() => fetchAll(true)}
      />
    </div>
  );
}
