import { useCallback, useEffect, useState } from "react";
import AiAssistant from "../components/AiAssistant.jsx";
import Navbar from "../components/Navbar.jsx";
import { api } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

const emptyTask = {
  title: "",
  description: "",
  reward: "",
  pickupLocation: "",
  dropLocation: "",
};

const badgeStyles = {
  open: "bg-emerald-50 text-emerald-700",
  accepted: "bg-amber-50 text-amber-700",
  completed: "bg-sky-50 text-sky-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function Field({ label, children }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function TaskCard({ task, actionLabel, onAction }) {
  const canAct =
    (actionLabel === "Mark complete" && task.status === "accepted") ||
    (actionLabel !== "Mark complete" && task.status === "open");

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-[Manrope] text-lg font-bold">{task.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {task.description}
          </p>
        </div>
        <span className={"shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize " + badgeStyles[task.status]}>
          {task.status}
        </span>
      </div>

      <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
        <span>Pickup: <b className="text-slate-800">{task.pickupLocation}</b></span>
        <span>Drop: <b className="text-slate-800">{task.dropLocation}</b></span>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="font-[Manrope] text-xl font-extrabold text-indigo-600">
          ₹{task.reward}
        </span>
        {actionLabel && canAct && (
          <button
            onClick={() => onAction(task._id)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  );
}

function TaskGrid({ loading, tasks, emptyMessage, actionLabel, onAction }) {
  if (loading) {
    return <p className="py-12 text-center text-slate-500">Loading tasks…</p>;
  }

  if (!tasks.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white py-14 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {tasks.map((task) => (
        <TaskCard
          key={task._id}
          task={task}
          actionLabel={actionLabel}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function Dashboard() {
  const { token } = useAuth();
  const [tab, setTab] = useState("browse");
  const [tasks, setTasks] = useState([]);
  const [posted, setPosted] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [form, setForm] = useState(emptyTask);
  const [filters, setFilters] = useState({ minReward: "", maxReward: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: "open", limit: "50" });
      if (filters.minReward) params.set("minReward", filters.minReward);
      if (filters.maxReward) params.set("maxReward", filters.maxReward);

      const [available, myPosted, myAccepted] = await Promise.all([
        api("/tasks?" + params),
        api("/tasks/my/posted", { token }),
        api("/tasks/my/accepted", { token }),
      ]);

      setTasks(available.tasks);
      setPosted(myPosted.tasks);
      setAccepted(myAccepted.tasks);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  async function updateTask(taskId, operation, successMessage) {
    setError("");
    try {
      await api("/tasks/" + taskId + "/" + operation, {
        method: "PATCH",
        token,
      });
      setMessage(successMessage);
      await loadTasks();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/tasks", {
        method: "POST",
        token,
        body: JSON.stringify({ ...form, reward: Number(form.reward) }),
      });
      setForm(emptyTask);
      setMessage("Your task is live and ready for helpers.");
      setTab("posted");
      await loadTasks();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const tabClass = (id) =>
    tab === id
      ? "border-b-2 border-indigo-600 px-1 pb-3 text-sm font-semibold text-indigo-600"
      : "border-b-2 border-transparent px-1 pb-3 text-sm font-semibold text-slate-500 hover:text-slate-800";

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-9 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold tracking-wide text-indigo-600">
              CAMPUS MARKETPLACE
            </p>
            <h1 className="mt-1 font-[Manrope] text-3xl font-extrabold sm:text-4xl">
              Your gigs dashboard
            </h1>
            <p className="mt-2 text-slate-600">
              Browse open work, post a request, and track your progress.
            </p>
          </div>
          <button onClick={() => setTab("create")} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-indigo-700">
            + Post a task
          </button>
        </div>

        <div className="mt-8 flex gap-6 overflow-x-auto border-b border-slate-200">
          <button onClick={() => setTab("browse")} className={tabClass("browse")}>Browse tasks</button>
          <button onClick={() => setTab("create")} className={tabClass("create")}>Post a task</button>
          <button onClick={() => setTab("posted")} className={tabClass("posted")}>My posted ({posted.length})</button>
          <button onClick={() => setTab("accepted")} className={tabClass("accepted")}>My gigs ({accepted.length})</button>
          <button onClick={() => setTab("assistant")} className={tabClass("assistant")}>AI Assistant</button>
        </div>

        {(error || message) && (
          <p className={"mt-6 rounded-lg px-4 py-3 text-sm " + (error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700")}>
            {error || message}
          </p>
        )}

        {tab === "browse" && (
          <section className="mt-7">
            <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <Field label="Minimum reward">
                <input type="number" min="10" value={filters.minReward} onChange={(event) => setFilters({ ...filters, minReward: event.target.value })} className="input" placeholder="₹10" />
              </Field>
              <Field label="Maximum reward">
                <input type="number" min="10" value={filters.maxReward} onChange={(event) => setFilters({ ...filters, maxReward: event.target.value })} className="input" placeholder="Any" />
              </Field>
              <button onClick={() => setFilters({ minReward: "", maxReward: "" })} className="pb-2 text-sm font-semibold text-indigo-600">Clear filters</button>
            </div>
            <TaskGrid loading={loading} tasks={tasks} emptyMessage="No open tasks match these filters." actionLabel="Accept task" onAction={(id) => updateTask(id, "accept", "Task accepted — it is now in My gigs.")} />
          </section>
        )}

        {tab === "posted" && (
          <section className="mt-7">
            <TaskGrid loading={loading} tasks={posted} emptyMessage="You have not posted a task yet." actionLabel="Cancel task" onAction={(id) => updateTask(id, "cancel", "Task cancelled.")} />
          </section>
        )}

        {tab === "accepted" && (
          <section className="mt-7">
            <TaskGrid loading={loading} tasks={accepted} emptyMessage="No accepted tasks yet. Browse the marketplace to get started." actionLabel="Mark complete" onAction={(id) => updateTask(id, "complete", "Great work — task marked complete.")} />
          </section>
        )}

        {tab === "assistant" && <AiAssistant />}

        {tab === "create" && (
          <section className="mt-7 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-[Manrope] text-2xl font-extrabold">Post a new task</h2>
            <p className="mt-1 text-sm text-slate-600">Be specific so a fellow student can help quickly.</p>
            <form onSubmit={createTask} className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Task title"><input required minLength="2" value={form.title} onChange={(event) => updateForm("title", event.target.value)} className="input" placeholder="Pick up library books" /></Field>
              <Field label="Reward (₹)"><input required type="number" min="10" value={form.reward} onChange={(event) => updateForm("reward", event.target.value)} className="input" placeholder="100" /></Field>
              <Field label="Pickup location"><input required value={form.pickupLocation} onChange={(event) => updateForm("pickupLocation", event.target.value)} className="input" placeholder="Main library" /></Field>
              <Field label="Drop location"><input required value={form.dropLocation} onChange={(event) => updateForm("dropLocation", event.target.value)} className="input" placeholder="Hostel block A" /></Field>
              <label className="block text-sm font-semibold sm:col-span-2">Description<textarea required minLength="10" maxLength="200" rows="4" value={form.description} onChange={(event) => updateForm("description", event.target.value)} className="input mt-1.5" placeholder="What needs to be done?" /></label>
              <button disabled={saving} className="rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 sm:col-span-2">{saving ? "Publishing…" : "Publish task"}</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
