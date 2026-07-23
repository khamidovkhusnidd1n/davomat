'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit2 } from 'lucide-react';
import AdminModal from './AdminModal';
import styles from './page.module.css';

export default function SettingsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [organizationId, setOrganizationId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  async function fetchAdmins() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: userData } = await supabase.from('users').select('organization_id').eq('id', user.id).single();
        if (userData) setOrganizationId(userData.organization_id);
      }
      
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          full_name,
          phone,
          email,
          created_at
        `)
        .eq('role', 'admin');
      
      if (error) throw error;
      setAdmins(data || []);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id) => {
    if (id === currentUserId) {
      alert("O'zingizni o'chira olmaysiz!");
      return;
    }
    if (!confirm('Rostdan ham o\'chirasizmi?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      fetchAdmins();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.full_name?.toLowerCase().includes(search.toLowerCase()) || 
    a.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Admin ismi yoki login..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingAdmin(null); setShowModal(true); }}>
          <Plus size={18} /> Yangi Admin Qo'shish
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
                  <th>Login / Email</th>
                  <th>Telefon</th>
                  <th>Qo'shilgan sana</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmins.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyText}>Adminlar topilmadi</td>
                  </tr>
                ) : (
                  filteredAdmins.map(admin => (
                    <tr key={admin.id}>
                      <td>{admin.full_name || '-'} {admin.id === currentUserId ? '(Siz)' : ''}</td>
                      <td>{admin.email || '-'}</td>
                      <td>{admin.phone || '-'}</td>
                      <td>{new Date(admin.created_at).toLocaleDateString('uz-UZ')}</td>
                      <td>
                        <div className={styles.actions}>
                          <button 
                            className={styles.actionBtn}
                            onClick={() => { setEditingAdmin(admin); setShowModal(true); }}
                            title="Tahrirlash"
                          >
                            <Edit2 size={18} />
                          </button>
                          {admin.id !== currentUserId && (
                            <button 
                              className={`${styles.actionBtn} ${styles.danger}`}
                              onClick={() => handleDelete(admin.id)}
                              title="O'chirish"
                            >
                              <Trash2 size={18} />
                            </button>
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

      <AdminModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        admin={editingAdmin}
        organizationId={organizationId}
        onSuccess={fetchAdmins}
      />
    </div>
  );
}
