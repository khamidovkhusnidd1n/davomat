'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit2, Clock } from 'lucide-react';
import ScheduleModal from './ScheduleModal';
import styles from './page.module.css';

const DAYS = {
  1: 'Dushanba',
  2: 'Seshanba',
  3: 'Chorshanba',
  4: 'Payshanba',
  5: 'Juma',
  6: 'Shanba',
  7: 'Yakshanba'
};

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      const [schedulesRes, groupsRes] = await Promise.all([
        supabase
          .from('schedules')
          .select(`
            id,
            group_id,
            day_of_week,
            start_time,
            end_time,
            groups ( id, name, course_name )
          `)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase.from('groups').select('id, name')
      ]);
      
      if (schedulesRes.error) throw schedulesRes.error;
      setSchedules(schedulesRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Rostdan ham o\'chirasizmi?')) return;
    try {
      const { error } = await supabase.from('schedules').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredSchedules = schedules.filter(s => 
    s.groups?.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.groups?.course_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={20} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Guruh nomi orqali izlash..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingSchedule(null); setShowModal(true); }}>
          <Plus size={18} /> Yangi Dars Vaqti
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
                  <th>Guruh Nomi</th>
                  <th>Hafta Kuni</th>
                  <th>Boshlanish Vaqti</th>
                  <th>Tugash Vaqti</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.length === 0 ? (
                  <tr>
                    <td colSpan="5" className={styles.emptyText}>Ma'lumot topilmadi</td>
                  </tr>
                ) : (
                  filteredSchedules.map((schedule) => {
                    const start = schedule.start_time.substring(0, 5);
                    const end = schedule.end_time.substring(0, 5);
                    return (
                      <tr key={schedule.id}>
                        <td style={{ fontWeight: 'bold' }}>{schedule.groups?.name || 'Noma\'lum'}</td>
                        <td>
                          <span className={styles.dayBadge}>
                            {DAYS[schedule.day_of_week] || 'Noma\'lum'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.timeWrapper}>
                            <Clock size={14} className={styles.timeIcon} />
                            {start}
                          </div>
                        </td>
                        <td>
                          <div className={styles.timeWrapper}>
                            <Clock size={14} className={styles.timeIcon} />
                            {end}
                          </div>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button className={styles.actionBtn} onClick={() => { setEditingSchedule(schedule); setShowModal(true); }}>
                              <Edit2 size={16} />
                            </button>
                            <button className={`${styles.actionBtn} ${styles.danger}`} onClick={() => handleDelete(schedule.id)}>
                              <Trash2 size={16} />
                            </button>
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

      <ScheduleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        schedule={editingSchedule}
        groups={groups}
        onSuccess={fetchData}
      />
    </div>
  );
}
