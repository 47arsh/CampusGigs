import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const { signIn, isAuthenticated } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  async function submit(event) { event.preventDefault(); setError(""); setLoading(true); try { const data = await api("/auth/login", { method: "POST", body: JSON.stringify(form) }); signIn(data.token); navigate("/dashboard"); } catch (err) { setError(err.message); } finally { setLoading(false); } }
  return <div className="min-h-screen bg-slate-50"><Navbar /><main className="mx-auto flex max-w-7xl justify-center px-5 py-14"><section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9"><p className="text-sm font-semibold text-indigo-600">WELCOME BACK</p><h1 className="mt-2 font-[Manrope] text-3xl font-extrabold">Log in to CampusGigs</h1><p className="mt-2 text-sm leading-6 text-slate-600">Find a task, lend a hand, and keep your campus moving.</p>{location.state?.registered && <p className="mt-5 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">Account created. You can log in now.</p>}<form onSubmit={submit} className="mt-7 space-y-5"><label className="block text-sm font-semibold">Email<input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="you@college.edu" /></label><label className="block text-sm font-semibold">Password<input required minLength="6" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="••••••••" /></label>{error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button disabled={loading} className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{loading ? "Logging in…" : "Log in"}</button></form><p className="mt-6 text-center text-sm text-slate-600">New here? <Link to="/register" className="font-semibold text-indigo-600 hover:underline">Create an account</Link></p></section></main></div>;
}
export default Login;
