import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/job-seekers', label: 'Job Seekers' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/matches', label: 'Matches' },
];

function navClass({ isActive }) {
  return `block rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`;
}

export function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-indigo-600">Talent Hub</span>
          </div>

          <nav className="hidden gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClass}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden sm:block">
            <button
              onClick={handleLogout}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Log out
            </button>
          </div>

          <button
            className="rounded-md p-2 text-slate-600 sm:hidden"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-200 px-4 pb-3 sm:hidden">
            <nav className="flex flex-col gap-1 pt-2">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={navClass} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </NavLink>
              ))}
              <button
                onClick={handleLogout}
                className="mt-1 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Log out
              </button>
            </nav>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
