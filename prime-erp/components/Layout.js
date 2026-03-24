import Link from 'next/link';
import { useRouter } from 'next/router';

const NAV = [
  {
    section: 'BOM',
    items: [
      { label: 'Vendors', href: '/vendors', icon: '🏭' },
      { label: 'Raw Materials', href: '/materials', icon: '🪨' },
      { label: 'SKUs', href: '/skus', icon: '📦' },
      { label: 'Bill of Materials', href: '/bom', icon: '📋' },
    ],
  },
  {
    section: 'Coming Soon',
    items: [
      { label: 'Orders', href: '/orders', icon: '🛒', disabled: true },
      { label: 'Customers', href: '/customers', icon: '👥', disabled: true },
    ],
  },
];

export default function Layout({ children }) {
  const router = useRouter();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Prime Industries</h1>
          <span>ERP</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((section) => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map((item) => (
                item.disabled ? (
                  <div key={item.href} className="nav-item" style={{ opacity: 0.4, cursor: 'default' }}>
                    <span>{item.icon}</span>
                    {item.label}
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${router.pathname === item.href ? ' active' : ''}`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
