'use client';
import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, Info, Search, ShieldAlert, RefreshCw } from 'lucide-react';
import styles from './page.module.css';

export default function SOCDashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, HIGH, CRITICAL, login_failed

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/soc/events?limit=100');
      const json = await res.json();
      if (json.data) {
        setEvents(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(e => {
    if (filter === 'ALL') return true;
    if (filter === 'HIGH') return ['HIGH', 'CRITICAL'].includes(e.severity);
    if (filter === 'FAILED') return e.event_type === 'login_failed';
    return true;
  });

  const getSeverityBadge = (severity) => {
    switch(severity) {
      case 'CRITICAL': return <span className={`${styles.badge} ${styles.badgeCritical}`}><AlertTriangle size={14}/> CRITICAL</span>;
      case 'HIGH': return <span className={`${styles.badge} ${styles.badgeHigh}`}><AlertTriangle size={14}/> HIGH</span>;
      case 'MEDIUM': return <span className={`${styles.badge} ${styles.badgeMedium}`}>MEDIUM</span>;
      case 'LOW': return <span className={`${styles.badge} ${styles.badgeLow}`}>LOW</span>;
      default: return <span className={`${styles.badge} ${styles.badgeInfo}`}>INFO</span>;
    }
  };

  const getEventIcon = (type) => {
    switch(type) {
      case 'login_success': return <CheckCircle className={styles.iconSuccess} size={18} />;
      case 'login_failed': return <ShieldAlert className={styles.iconWarning} size={18} />;
      case 'brute_force_detected': return <AlertTriangle className={styles.iconCritical} size={18} />;
      default: return <Info className={styles.iconInfo} size={18} />;
    }
  };

  return (
    <div className="container" style={{ padding: '24px' }}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}><Shield className={styles.titleIcon} /> SOC Desk (Xavfsizlik)</h1>
          <p className={styles.subtitle}>Tizim xavfsizligi va loglarni monitoring qilish markazi</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchEvents} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Yangilash
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Jami Loglar</h3>
          <p className={styles.statValue}>{events.length}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Xatoliklar</h3>
          <p className={styles.statValue}>{events.filter(e => e.event_type === 'login_failed').length}</p>
        </div>
        <div className={styles.statCardDanger}>
          <h3>Xavfli (Alert)</h3>
          <p className={styles.statValue}>{events.filter(e => ['HIGH', 'CRITICAL'].includes(e.severity)).length}</p>
        </div>
      </div>

      <div className={styles.filters}>
        <button className={`btn ${filter === 'ALL' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter('ALL')}>Barchasi</button>
        <button className={`btn ${filter === 'HIGH' ? 'btn-danger' : 'btn-outline'}`} onClick={() => setFilter('HIGH')}>Faqat Xavfli</button>
        <button className={`btn ${filter === 'FAILED' ? 'btn-warning' : 'btn-outline'}`} onClick={() => setFilter('FAILED')}>Xato kirishlar</button>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vaqti</th>
              <th>Status</th>
              <th>Hodisa</th>
              <th>Foydalanuvchi</th>
              <th>IP Manzil</th>
              <th>Batafsil</th>
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Yuklanmoqda...</td></tr>
            ) : filteredEvents.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>Hodisalar topilmadi.</td></tr>
            ) : (
              filteredEvents.map(event => (
                <tr key={event.id}>
                  <td>
                    <div className={styles.timeCell}>
                      <Clock size={14} /> 
                      {new Date(event.created_at).toLocaleString('uz-UZ')}
                    </div>
                  </td>
                  <td>{getSeverityBadge(event.severity)}</td>
                  <td>
                    <div className={styles.eventCell}>
                      {getEventIcon(event.event_type)}
                      <span>{event.event_type}</span>
                    </div>
                  </td>
                  <td className={styles.username}>{event.username || '-'}</td>
                  <td className={styles.ip}>{event.ip_address}</td>
                  <td>
                    <pre className={styles.detailsJson}>
                      {JSON.stringify(event.details, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
