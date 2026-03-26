import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Home, PlusCircle, List, LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isAdmin = user?.user_metadata?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            {/* --- CHANGED: Replaced Logo component with img tag --- */}
            <img 
              src="/logo.png" 
              alt="Civic Snap Logo" 
              className="w-10 h-10 object-contain" 
            />
            <span className="font-bold text-xl tracking-tight text-slate-900">Civic Snap</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                {isAdmin ? (
                  <Link 
                    to="/admin/issues" 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-medium transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                  >
                    <ShieldCheck size={18} />
                    Admin Panel
                  </Link>
                ) : (
                  <>
                    <NavLink to="/dashboard" active={location.pathname === '/dashboard'}>My Reports</NavLink>
                    <Link 
                      to="/report" 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full font-medium transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                    >
                      <PlusCircle size={18} />
                      Report Issue
                    </Link>
                  </>
                )}
                
                <button 
                  onClick={() => signOut()}
                  className="text-slate-500 hover:text-slate-800 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <Link 
                to="/login" 
                className="text-slate-600 hover:text-blue-600 font-medium transition-colors flex items-center gap-2"
              >
                <LogIn size={18} />
                Login
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-6">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 pb-safe">
        <MobileNavLink to="/" icon={<Home size={24} />} label="Home" active={location.pathname === '/'} />
        
        {user ? (
          isAdmin ? (
            <>
              {/* Admin Mobile Layout */}
              <MobileNavLink to="/admin/issues" icon={<ShieldCheck size={24} />} label="Admin" active={location.pathname === '/admin/issues'} highlight />
              <button 
                onClick={() => signOut()} 
                className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-600"
              >
                <div><LogOut size={24} /></div>
                <span className="text-[10px] font-medium">Logout</span>
              </button>
            </>
          ) : (
            <>
              {/* Citizen Mobile Layout */}
              <MobileNavLink to="/report" icon={<PlusCircle size={24} />} label="Report" active={location.pathname === '/report'} highlight />
              <MobileNavLink to="/dashboard" icon={<List size={24} />} label="Status" active={location.pathname === '/dashboard'} />
            </>
          )
        ) : (
          <>
            {/* Logged Out Mobile Layout */}
            <MobileNavLink to="/report" icon={<PlusCircle size={24} />} label="Report" active={location.pathname === '/report'} highlight />
            <MobileNavLink to="/login" icon={<LogIn size={24} />} label="Login" active={location.pathname === '/login'} />
          </>
        )}
      </nav>
    </div>
  );
}

function NavLink({ to, children, active }: { to: string, children: React.ReactNode, active?: boolean }) {
  return (
    <Link 
      to={to} 
      className={`text-sm font-medium transition-colors ${active ? 'text-blue-600' : 'text-slate-600 hover:text-slate-900'}`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, icon, label, active, highlight }: { to: string, icon: React.ReactNode, label: string, active?: boolean, highlight?: boolean }) {
  return (
    <Link to={to} className={`flex flex-col items-center gap-1 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
      <div className={`${highlight ? 'bg-blue-600 text-white p-3 rounded-full -mt-8 shadow-lg border-4 border-slate-50' : ''}`}>
        {icon}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}