'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Filter } from 'lucide-react';
import styles from './page.module.css';

export default function AttendancePage() {
  const [attendances, setAttendances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('');

  useEffect(() => {
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

    return matchesSearch && matchesGroup;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="O'quvchi yoki guruh..." 
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
                  <th>O'quvchi</th>
                  <th>Guruh</th>
                  <th>Dars Mavzusi</th>
                  <th>Status</th>
                  <th>Belgiladi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filtered.map((record) => {
                    const dateObj = new Date(record.created_at);
                    return (
                      <tr key={record.id}>
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
