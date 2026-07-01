'use client';
import styles from './page.module.css';

export default function SettingsPage() {
  return (
    <div className={styles.container}>
      <div className={"card " + styles.contentCard}>
        <h2>Settings Sahifasi</h2>
        <p>Tez orada qo'shiladi...</p>
      </div>
    </div>
  );
}
