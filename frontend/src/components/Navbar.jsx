import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function Navbar() {
  const { isAuthenticated, signOut } = useAuth();
  const navigate = useNavigate();
  const logout = () => { signOut(); navigate("/"); };

  return <nav className="border-b border-slate-200 bg-white/95">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
      <Link to="/" className="font-[Manrope] text-2xl font-extrabold tracking-tight"><span>Campus</span><span className="text-indigo-600">Gigs</span></Link>
      <div className="flex items-center gap-3 sm:gap-5">
        {isAuthenticated ? <>
          <NavLink to="/dashboard" className="hidden text-sm font-semibold text-slate-600 hover:text-indigo-600 sm:block">Dashboard</NavLink>
          <button onClick={logout} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Log out</button>
        </> : <>
          <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:text-indigo-600 sm:px-4">Log in</Link>
          <Link to="/register" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Get started</Link>
        </>}
      </div>
    </div>
  </nav>;
}

export default Navbar;
