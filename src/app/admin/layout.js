'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './layout.module.css';
import { FiGrid, FiCalendar, FiUsers, FiMap, FiSettings, FiChevronLeft, FiChevronRight, FiBell, FiSearch, FiMenu, FiX } from 'react-icons/fi';

const NAV_ITEMS = [
  { href: '/admin', icon: FiGrid, label: 'Tổng quan' },
  { href: '/admin/bookings', icon: FiCalendar, label: 'Đặt bàn' },
  { href: '/admin/customers', icon: FiUsers, label: 'Khách hàng' },
  { href: '/admin/floor-plan', icon: FiMap, label: 'Sơ đồ bàn' },
  { href: '/admin/settings', icon: FiSettings, label: 'Cài đặt' },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <div className={`${styles.adminLayout} admin-area`}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className={styles.mobileOverlay} onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/" className={styles.logo}>
            <div className={styles.logoIcon}>BG</div>
            {!collapsed && <span className={styles.logoText}>Báo Garden</span>}
          </Link>
          <button
            className={`${styles.collapseBtn} ${collapsed ? styles.collapseBtnRotated : ''}`}
            onClick={() => setCollapsed(!collapsed)}
            id="sidebar-toggle"
          >
            <FiChevronLeft />
          </button>
          <button className={styles.mobileClose} onClick={() => setMobileOpen(false)}>
            <FiX />
          </button>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navActive : ''}`}
                onClick={() => setMobileOpen(false)}
                id={`nav-${item.href.split('/').pop() || 'dashboard'}`}
              >
                <Icon className={styles.navIcon} />
                {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                {active && <div className={styles.navIndicator} />}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          {!collapsed && (
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>AD</div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>Admin</span>
                <span className={styles.userRole}>Quản lý</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={`${styles.mainWrapper} ${collapsed ? styles.mainCollapsed : ''}`}>
        {/* Top bar */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button className={styles.mobileMenuBtn} onClick={() => setMobileOpen(true)}>
              <FiMenu />
            </button>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Tìm kiếm..."
                className={styles.searchInput}
                id="global-search"
              />
            </div>
          </div>
          <div className={styles.topBarRight}>
            <button className={styles.notifBtn} id="notifications-btn">
              <FiBell />
              <span className={styles.notifDot} />
            </button>
            <div className={styles.topBarUser}>
              <div className={styles.topBarAvatar}>AD</div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
