import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import { api } from "../lib/api.js";

function formatJoined(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function Profile() {
  const { id } = useParams();
  const [result, setResult] = useState({ id: null, profile: null, error: "" });

  useEffect(() => {
    let active = true;

    api("/users/" + id + "/profile")
      .then((data) => {
        if (active) setResult({ id, profile: data.profile, error: "" });
      })
      .catch((requestError) => {
        if (active) setResult({ id, profile: null, error: requestError.message });
      });

    return () => {
      active = false;
    };
  }, [id]);

  const loading = result.id !== id;
  const profile = loading ? null : result.profile;
  const error = loading ? "" : result.error;
  const initials = profile?.name ? profile.name.trim().charAt(0).toUpperCase() : "?";
  const rating = profile?.rating;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-3xl px-5 py-9 sm:px-6">
        {loading && <p className="py-12 text-center text-slate-500">Loading profile…</p>}

        {!loading && error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {!loading && profile && (
          <>
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-[Manrope] text-2xl font-extrabold text-indigo-700">
                  {initials}
                </span>
                <div>
                  <h1 className="font-[Manrope] text-3xl font-extrabold">{profile.name}</h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Joined {formatJoined(profile.joinedAt)}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-bold tracking-wide text-slate-500">
                    COMPLETED GIGS
                  </p>
                  <p className="mt-1 font-[Manrope] text-2xl font-extrabold text-slate-900">
                    {profile.completedTasks}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs font-bold tracking-wide text-slate-500">RATING</p>
                  <p className="mt-1 font-[Manrope] text-2xl font-extrabold text-slate-900">
                    {rating?.average == null ? "New" : rating.average.toFixed(1) + " / 5"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {rating?.average == null
                      ? "No ratings yet"
                      : rating.count + (rating.count === 1 ? " review" : " reviews")}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="font-[Manrope] text-xl font-extrabold">Reviews</h2>
              <p className="mt-3 rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
                No reviews yet.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default Profile;
