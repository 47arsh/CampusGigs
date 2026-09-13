function Navbar() {
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        <div className="font-[Manrope] text-2xl font-extrabold">
          <span className="text-slate-900">Campus</span>
          <span className="text-indigo-600">Gigs</span>
        </div>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            How It Works
          </a>

          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Features
          </a>

          <a href="#" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            About
          </a>

          <button className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-50">
            Login
          </button>

          <button className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-700">
            Get Started
          </button>
        </div>

      </div>
    </nav>
  )
}

export default Navbar