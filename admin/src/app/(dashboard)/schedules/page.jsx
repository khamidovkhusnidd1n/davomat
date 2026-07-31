'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Plus, Trash2, Edit2, Clock, FileSpreadsheet } from 'lucide-react';
import ScheduleModal from './ScheduleModal';
import ExcelImportSchedule from '@/components/ExcelImportSchedule/ExcelImportSchedule';

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
  const [showImport, setShowImport] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [expandedDayKey, setExpandedDayKey] = useState(null); // 'groupId-dayOfWeek'
  
  // Fake organizationId hozircha
  const organizationId = '11111111-1111-1111-1111-111111111111';

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
        if (userData) {
          setUserRole(userData.role);
        }
      }
      
      const [schedulesRes, groupsRes] = await Promise.all([
        supabase
          .from('schedules')
          .select(`
            id,
            group_id,
            day_of_week,
            start_time,
            end_time,
            subject_id,
            teacher_id,
            groups ( id, name, course_name, education_type ),
            subjects ( id, name ),
            teachers ( id, full_name )
          `)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase.from('groups').select('id, name, course_name, education_type')
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

  const filteredGroups = groups.filter(g => 
    g.name?.toLowerCase().includes(search.toLowerCase()) || 
    g.course_name?.toLowerCase().includes(search.toLowerCase())
  );

  const groupsWithSchedules = filteredGroups.map(g => {
    const groupSchedules = schedules
      .filter(s => s.group_id === g.id)
      .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
    return {
      ...g,
      schedules: groupSchedules
    };
  });

  const qaytaGroups = groupsWithSchedules.filter(g => g.education_type === 'qayta_tayyorlov');
  const malakaGroups = groupsWithSchedules.filter(g => g.education_type === 'malaka_oshirish');

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
            placeholder="Guruh nomi orqali izlash..." 
            className="input" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isWriteEnabled && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              <FileSpreadsheet size={18} /> Excel Import
            </button>
            <button className="btn btn-primary" onClick={() => { setEditingSchedule(null); setShowModal(true); }}>
              <Plus size={18} /> Yangi Dars Vaqti
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className={styles.loading}>Yuklanmoqda...</div>
      ) : (
        <div className={styles.dashboard}>
          {/* Qayta Tayyorlov Column */}
          <div className={styles.column}>
            <h2 className={`${styles.columnTitle} ${styles.qayta}`}>
              Qayta tayyorlov guruhlari ({qaytaGroups.length})
            </h2>
            {qaytaGroups.length === 0 ? (
              <div className={styles.emptyText}>Guruhlar topilmadi</div>
            ) : (
              qaytaGroups.map(group => {
                const isGroupExpanded = expandedGroupId === group.id;
                const uniqueDays = Array.from(new Set(group.schedules.map(s => s.day_of_week))).sort((a, b) => a - b);

                return (
                  <div key={group.id} className={styles.groupCard}>
                    <div 
                      className={styles.groupCardHeader} 
                      onClick={() => {
                        setExpandedGroupId(isGroupExpanded ? null : group.id);
                        setExpandedDayKey(null);
                      }}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, paddingBottom: isGroupExpanded ? '8px' : 0, borderBottom: isGroupExpanded ? '1px solid var(--border)' : 'none' }}
                    >
                      <div>
                        <h3 className={styles.groupName}>{group.name}</h3>
                        <span className={styles.courseName}>{group.course_name || 'Yo\'nalish kiritilmagan'}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {isGroupExpanded ? '▲ Yopish' : '▼ Haftalik kunlar'}
                      </span>
                    </div>

                    {isGroupExpanded && (
                      <div className={styles.scheduleList} style={{ marginTop: '12px' }}>
                        {group.schedules.length === 0 ? (
                          <p className={styles.noScheduleText}>Hali dars jadvali belgilanmagan</p>
                        ) : (
                          uniqueDays.map(dayOfWeek => {
                            const dayKey = `${group.id}-${dayOfWeek}`;
                            const isDayExpanded = expandedDayKey === dayKey;
                            const daySchedules = group.schedules.filter(s => s.day_of_week === dayOfWeek);

                            return (
                              <div key={dayOfWeek} className={styles.dayGroup}>
                                <div 
                                  className={styles.dayHeader}
                                  onClick={() => setExpandedDayKey(isDayExpanded ? null : dayKey)}
                                  style={{
                                    padding: '10px 12px',
                                    background: isDayExpanded ? 'var(--primary-light)' : 'var(--bg-sidebar)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    color: isDayExpanded ? 'var(--primary)' : 'inherit',
                                    marginBottom: isDayExpanded ? '4px' : '8px'
                                  }}
                                >
                                  <span className={styles.scheduleDay} style={{ fontWeight: '600', color: isDayExpanded ? 'var(--primary)' : 'inherit', minWidth: 'auto' }}>
                                    {DAYS[dayOfWeek]}
                                  </span>
                                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                    {isDayExpanded ? '▲ Darslarni yopish' : `▼ ${daySchedules.length} ta dars`}
                                  </span>
                                </div>

                                {isDayExpanded && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', marginBottom: '8px' }}>
                                    {daySchedules.map(sch => {
                                      const start = sch.start_time.substring(0, 5);
                                      const end = sch.end_time.substring(0, 5);
                                      return (
                                        <div key={sch.id} className={styles.scheduleItem} style={{ borderLeft: '3px solid var(--primary)', padding: '10px 12px' }}>
                                          <div className={styles.scheduleTimeDetail} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <span className={styles.scheduleHours} style={{ fontWeight: '600' }}>{start} - {end}</span>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                              <strong>Fan:</strong> {sch.subjects?.name || '—'}
                                            </span>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                              <strong>Ustoz:</strong> {sch.teachers?.full_name || '—'}
                                            </span>
                                          </div>
                                          {isWriteEnabled && (
                                            <div className={styles.scheduleActions}>
                                              <button 
                                                className={styles.scheduleActionBtn}
                                                onClick={(e) => { e.stopPropagation(); setEditingSchedule(sch); setShowModal(true); }}
                                                title="Tahrirlash"
                                              >
                                                <Edit2 size={14} />
                                              </button>
                                              <button 
                                                className={`${styles.scheduleActionBtn} ${styles.danger}`}
                                                onClick={(e) => { e.stopPropagation(); handleDelete(sch.id); }}
                                                title="O'chirish"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Malaka Oshirish Column */}
          <div className={styles.column}>
            <h2 className={`${styles.columnTitle} ${styles.malaka}`}>
              Malaka oshirish guruhlari ({malakaGroups.length})
            </h2>
            {malakaGroups.length === 0 ? (
              <div className={styles.emptyText}>Guruhlar topilmadi</div>
            ) : (
              malakaGroups.map(group => {
                const isGroupExpanded = expandedGroupId === group.id;
                const uniqueDays = Array.from(new Set(group.schedules.map(s => s.day_of_week))).sort((a, b) => a - b);

                return (
                  <div key={group.id} className={styles.groupCard}>
                    <div 
                      className={styles.groupCardHeader} 
                      onClick={() => {
                        setExpandedGroupId(isGroupExpanded ? null : group.id);
                        setExpandedDayKey(null);
                      }}
                      style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: 0, paddingBottom: isGroupExpanded ? '8px' : 0, borderBottom: isGroupExpanded ? '1px solid var(--border)' : 'none' }}
                    >
                      <div>
                        <h3 className={styles.groupName}>{group.name}</h3>
                        <span className={styles.courseName}>{group.course_name || 'Kurs nomi kiritilmagan'}</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {isGroupExpanded ? '▲ Yopish' : '▼ Haftalik kunlar'}
                      </span>
                    </div>

                    {isGroupExpanded && (
                      <div className={styles.scheduleList} style={{ marginTop: '12px' }}>
                        {group.schedules.length === 0 ? (
                          <p className={styles.noScheduleText}>Hali dars jadvali belgilanmagan</p>
                        ) : (
                          uniqueDays.map(dayOfWeek => {
                            const dayKey = `${group.id}-${dayOfWeek}`;
                            const isDayExpanded = expandedDayKey === dayKey;
                            const daySchedules = group.schedules.filter(s => s.day_of_week === dayOfWeek);

                            return (
                              <div key={dayOfWeek} className={styles.dayGroup}>
                                <div 
                                  className={styles.dayHeader}
                                  onClick={() => setExpandedDayKey(isDayExpanded ? null : dayKey)}
                                  style={{
                                    padding: '10px 12px',
                                    background: isDayExpanded ? 'var(--primary-light)' : 'var(--bg-sidebar)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    color: isDayExpanded ? 'var(--primary)' : 'inherit',
                                    marginBottom: isDayExpanded ? '4px' : '8px'
                                  }}
                                >
                                  <span className={styles.scheduleDay} style={{ fontWeight: '600', color: isDayExpanded ? 'var(--primary)' : 'inherit', minWidth: 'auto' }}>
                                    {DAYS[dayOfWeek]}
                                  </span>
                                  <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                                    {isDayExpanded ? '▲ Darslarni yopish' : `▼ ${daySchedules.length} ta dars`}
                                  </span>
                                </div>

                                {isDayExpanded && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', marginBottom: '8px' }}>
                                    {daySchedules.map(sch => {
                                      const start = sch.start_time.substring(0, 5);
                                      const end = sch.end_time.substring(0, 5);
                                      return (
                                        <div key={sch.id} className={styles.scheduleItem} style={{ borderLeft: '3px solid var(--primary)', padding: '10px 12px' }}>
                                          <div className={styles.scheduleTimeDetail} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            <span className={styles.scheduleHours} style={{ fontWeight: '600' }}>{start} - {end}</span>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                              <strong>Fan:</strong> {sch.subjects?.name || '—'}
                                            </span>
                                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                              <strong>Ustoz:</strong> {sch.teachers?.full_name || '—'}
                                            </span>
                                          </div>
                                          {isWriteEnabled && (
                                            <div className={styles.scheduleActions}>
                                              <button 
                                                className={styles.scheduleActionBtn}
                                                onClick={(e) => { e.stopPropagation(); setEditingSchedule(sch); setShowModal(true); }}
                                                title="Tahrirlash"
                                              >
                                                <Edit2 size={14} />
                                              </button>
                                              <button 
                                                className={`${styles.scheduleActionBtn} ${styles.danger}`}
                                                onClick={(e) => { e.stopPropagation(); handleDelete(sch.id); }}
                                                title="O'chirish"
                                              >
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <ScheduleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        schedule={editingSchedule}
        groups={groups}
        onSuccess={fetchData}
      />

      <ExcelImportSchedule
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        groups={groups}
        organizationId={organizationId}
        onSuccess={fetchData}
      />
    </div>
  );
}
