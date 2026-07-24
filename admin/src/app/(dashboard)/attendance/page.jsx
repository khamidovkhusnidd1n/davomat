'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter, Edit2 } from 'lucide-react';
import styles from './page.module.css';

export default function AttendancePage() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterDate, setFilterDate] = useState('');
  
  const [editingId, setEditingId] = useState(null);
  const [lateHours, setLateHours] = useState('');

  const handleUpdateLateHours = async (id) => {
    try {
      const hours = parseInt(lateHours, 10);
      if (isNaN(hours) || hours < 0 || hours > 6) {
        alert("Soat 0 dan 6 gacha bo'lishi kerak!");
        return;
      }
      const { error } = await supabase.from('attendance').update({ late_hours: hours }).eq('id', id);
      if (error) throw error;
      setEditingId(null);
      fetchAttendance();
    } catch (e) {
      alert("Xatolik yuz berdi: " + e.message);
    }
  };

  useEffect(() => {
    let initialDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('group')) setFilterGroup(params.get('group'));
      if (params.get('date')) initialDate = params.get('date');
    }
    setFilterDate(initialDate);
    fetchAttendance();
  }, []);

  async function fetchAttendance() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          id,
          status,
          late_hours,
          created_at,
          students ( users ( full_name ) ),
          lessons ( lesson_date, title, groups ( name ) ),
          users!attendance_marked_by_fkey ( full_name )
        `)
        .order('created_at', { ascending: false })
        .limit(500); // Kengaytirildi
      
      if (error) throw error;
      setAttendances(data || []);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  // Guruhlar ro'yxatini ajratib olish
  const uniqueGroups = [...new Set(attendances.map(a => a.lessons?.groups?.name).filter(Boolean))];

  const filtered = attendances.filter(a => {
    const studentName = a.students?.users?.full_name?.toLowerCase() || '';
    const groupName = a.lessons?.groups?.name || '';
    const query = search.toLowerCase();
    
    const matchesSearch = studentName.includes(query) || groupName.toLowerCase().includes(query);
    const matchesGroup = filterGroup ? groupName === filterGroup : true;
    const matchesDate = filterDate ? a.lessons?.lesson_date === filterDate : true;

    return matchesSearch && matchesGroup && matchesDate;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Tinglovchi yoki guruh..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select 
          className="input" 
          style={{ maxWidth: '200px' }}
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
        >
          <option value="">Barcha guruhlar</option>
          {uniqueGroups.map(g => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>

        <input 
          type="date"
          className="input"
          style={{ maxWidth: '160px' }}
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
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
                  <th>Tinglovchi</th>
                  <th>Guruh</th>
                  <th>Dars Mavzusi</th>
                  <th>Status</th>
                  <th>Kech qolgan soat</th>
                  <th>Belgiladi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filtered.map((record, index) => {
                    const dateObj = new Date(record.created_at);
                    return (
                      <tr key={record.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className={styles.dateBlock}>
                            <span className={styles.date}>{dateObj.toLocaleDateString('uz-UZ')}</span>
                            <span className={styles.time}>{dateObj.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 'bold' }}>{record.students?.users?.full_name || 'Noma\'lum'}</td>
                        <td>{record.lessons?.groups?.name || '-'}</td>
                        <td>{record.lessons?.title || 'Mavzusiz'}</td>
                        <td>
                          <span className={`${styles.statusBadge} ${styles[record.status] || ''}`}>
                            {record.status === 'present' ? 'Kelgan' : record.status === 'excused' ? 'Kelmagan (Sababli)' : record.status === 'absent' || record.status === 'unexcused' ? 'Kelmagan (Sababsiz)' : 'Kech qolgan'}
                          </span>
                        </td>
                        <td>
                          {record.status === 'late' ? (
                            editingId === record.id ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <input type="number" min="0" max="6" style={{ width: '60px' }} value={lateHours} onChange={(e) => setLateHours(e.target.value)} />
                                <button className="btn btn-primary" style={{ padding: '4px 8px' }} onClick={() => handleUpdateLateHours(record.id)}>OK</button>
                                <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingId(null)}>X</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span>{record.late_hours || 0} soat</span>
                                <button className={styles.actionBtn} onClick={() => { setEditingId(record.id); setLateHours(record.late_hours?.toString() || '0'); }}>
                                  <Edit2 size={16} />
                                </button>
                              </div>
                            )
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className={styles.textSmall}>{record.users?.full_name || 'Tizim'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
