import { Link, Navigate, useNavigate } from "react-router-dom";
import { useState } from "react";
import Navbar from "../components/Navbar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";

function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      navigate("/login", { state: { registered: true } });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto flex max-w-7xl justify-center px-5 py-14">
        <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
          <p className="text-sm font-semibold text-indigo-600">JOIN THE COMMUNITY</p>
          <h1 className="mt-2 font-[Manrope] text-3xl font-extrabold">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Post jobs you need done or earn from gigs around campus.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="block text-sm font-semibold">
              Full name
              <input required minLength="2" value={form.name} onChange={(event) => updateForm("name", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="Your name" />
            </label>

            <label className="block text-sm font-semibold">
              Email
              <input required type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="you@college.edu" />
            </label>

            <label className="block text-sm font-semibold">
              Password
              <input required minLength="6" type="password" value={form.password} onChange={(event) => updateForm("password", event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" placeholder="At least 6 characters" />
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button disabled={loading} className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already a member? <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Log in</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

export default Register;
