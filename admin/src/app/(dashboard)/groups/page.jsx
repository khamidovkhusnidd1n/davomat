'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit2, BookOpen, FileSpreadsheet } from 'lucide-react';
import GroupModal from './GroupModal';
import SyllabusModal from './SyllabusModal';
import ExcelGroupsImport from '@/components/ExcelGroupsImport/ExcelGroupsImport';
import styles from './page.module.css';

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const [showGroupsImport, setShowGroupsImport] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData(silent = false) {
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
      
      const [groupsRes, nazoratchisRes, monitorsRes] = await Promise.all([
        supabase.from('groups').select(`
          id,
          name,
          course_name,
          education_type,
          nazoratchi_id,
          monitor_id,
          created_at,
          nazoratchi:users!groups_nazoratchi_id_fkey(full_name),
          monitor:users!groups_monitor_id_fkey(full_name),
          students(count)
        `),
        supabase.from('users').select('id, full_name').eq('role', 'nazoratchi'),
        supabase.from('users').select('id, full_name').eq('role', 'monitor')
      ]);
      
      if (groupsRes.error) throw groupsRes.error;
      setGroups(groupsRes.data || []);
      setTutors(nazoratchisRes.data || []);
      setMonitors(monitorsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Rostdan ham o\'chirasizmi?')) return;
    try {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  const [activeTab, setActiveTab] = useState('active');

  const filteredGroups = groups.filter(g => {
    const isStatusMatch = activeTab === 'active' ? (g.status !== 'archived') : (g.status === 'archived');
    if (!isStatusMatch) return false;

    return g.name?.toLowerCase().includes(search.toLowerCase()) || 
           g.course_name?.toLowerCase().includes(search.toLowerCase()) ||
           g.nazoratchi?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
           g.monitor?.full_name?.toLowerCase().includes(search.toLowerCase());
  });

  const toggleArchive = async (id, currentStatus) => {
    const newStatus = currentStatus === 'archived' ? 'active' : 'archived';
    try {
      const { error } = await supabase.from('groups').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      fetchData(true);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Guruh nomi yoki kurs..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(userRole === 'sysadmin' || userRole === 'admin') && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-secondary" onClick={() => setShowGroupsImport(true)}>
              <FileSpreadsheet size={18} /> Excel yuklash
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingGroup(null); setShowModal(true); }}>
              <Plus size={18} /> Yangi Guruh
            </button>
          </div>
        )}
      </div>

      <div className={styles.tabs} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <button 
          className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('active')}
        >
          Faol Guruhlar
        </button>
        <button 
          className={`btn ${activeTab === 'archived' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('archived')}
        >
          Arxivlangan
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
                  <th>Ta'lim turi</th>
                  <th>Guruh Nomi</th>
                  <th>Kurs Nomi</th>
                  <th>Nazoratchi</th>
                  <th>Sinf sardori</th>
                  <th>Tinglovchilar soni</th>
                  <th>Status</th>
                  <th>Yaratilgan sana</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filteredGroups.map((group) => (
                    <tr key={group.id} style={{ opacity: group.status === 'archived' ? 0.6 : 1 }}>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: group.education_type === 'malaka_oshirish' ? '#dbeafe' : '#dcfce7',
                          color: group.education_type === 'malaka_oshirish' ? '#1d4ed8' : '#15803d'
                        }}>
                          {group.education_type === 'malaka_oshirish' ? 'Malaka oshirish' : 'Qayta tayyorlov'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{group.name}</td>
                      <td>{group.course_name}</td>
                      <td>{group.nazoratchi?.full_name || 'Biriktirilmagan'}</td>
                      <td>{group.monitor?.full_name || 'Biriktirilmagan'}</td>
                      <td>
                        <span className={styles.countBadge}>
                          {group.students[0]?.count || 0} ta
                        </span>
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${group.status === 'archived' ? styles.archived : styles.active}`}>
                           {group.status === 'archived' ? 'Arxiv' : 'Faol'}
                        </span>
                      </td>
                      <td>{new Date(group.created_at).toLocaleDateString('uz-UZ')}</td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.actionBtn} title="Dars dasturi" onClick={() => { setEditingGroup(group); setShowSyllabus(true); }}>
                            <BookOpen size={16} />
                          </button>
                          {(userRole === 'sysadmin' || userRole === 'admin') && (
                            <>
                              <button className={styles.actionBtn} title="Tahrirlash" onClick={() => { setEditingGroup(group); setShowModal(true); }}>
                                <Edit2 size={16} />
                              </button>
                              <button 
                                className={styles.actionBtn} 
                                style={{ color: group.status === 'archived' ? '#10B981' : '#F59E0B' }}
                                title={group.status === 'archived' ? 'Faollashtirish' : 'Arxivlash'} 
                                onClick={() => toggleArchive(group.id, group.status)}
                              >
                                {group.status === 'archived' ? '♻️' : '📦'}
                              </button>
                              <button className={`${styles.actionBtn} ${styles.danger}`} title="O'chirish" onClick={() => handleDelete(group.id)}>
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
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

      <GroupModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        group={editingGroup}
        nazoratchis={tutors}
        monitors={monitors}
        organizationId={organizationId}
        onSuccess={() => fetchData(true)}
      />
      <SyllabusModal
        isOpen={showSyllabus}
        onClose={() => setShowSyllabus(false)}
        group={editingGroup}
      />
      <ExcelGroupsImport
        isOpen={showGroupsImport}
        onClose={() => setShowGroupsImport(false)}
        organizationId={organizationId}
        onSuccess={() => fetchData(true)}
      />
    </div>
  );
}
