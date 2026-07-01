import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata = {
  title: 'DAVOMAD - Admin Panel',
  description: "O'quv markazlari uchun davomat tizimi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" data-theme="light">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
