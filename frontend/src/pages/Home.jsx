import Navbar from "../components/Navbar.jsx";
import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main>
        <section className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl items-center justify-center px-6 py-20">
          <div className="max-w-4xl text-center">
            <p className="mb-5 inline-block rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold tracking-wide text-indigo-600">
              FOR STUDENTS, BY STUDENTS
            </p>

            <h1 className="font-[Manrope] text-5xl font-extrabold leading-tight text-slate-900 md:text-7xl">
              Get things done around your campus.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Find campus tasks, earn money, and help other students. A
              simpler, safer way to get stuff done.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                to="/register"
                className="rounded-xl bg-indigo-600 px-7 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700"
              >
                Get Started →
              </Link>

              <Link
                to="/login"
                className="rounded-xl border border-slate-200 bg-white px-7 py-3.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Login
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-600">
              <span>✓ Safe & Verified</span>
              <span>✓ Student Community</span>
              <span>✓ Quick & Easy</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;