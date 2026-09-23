import { useState } from "react";
import { api } from "../lib/api.js";

function AiAssistant() {
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function askAssistant(event) {
    event.preventDefault();
    const question = message.trim();

    if (!question || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);

    try {
      const response = await api("/ai/chat", {
        method: "POST",
        body: JSON.stringify({ message: question }),
      });

      setAnswer(response.answer || "");
      setSources(response.sources || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to reach the AI Assistant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-7 max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold tracking-wide text-indigo-600">CAMPUS SUPPORT</p>
      <h2 className="mt-1 font-[Manrope] text-2xl font-extrabold">
        CampusGigs AI Assistant
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Ask about CampusGigs policies, task guidelines, or safety.
      </p>

      <form onSubmit={askAssistant} className="mt-6">
        <label className="block text-sm font-semibold" htmlFor="ai-message">
          Your question
        </label>
        <textarea
          id="ai-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows="4"
          placeholder="What happens if I cancel a gig?"
          className="input mt-1.5 resize-y"
        />
        <button
          type="submit"
          disabled={loading || !message.trim()}
          className="mt-4 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {answer && (
        <div className="mt-6 rounded-xl bg-slate-50 p-5">
          <h3 className="font-[Manrope] text-lg font-bold">Answer</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
            {answer}
          </p>

          {sources.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h4 className="text-sm font-semibold text-slate-800">Sources</h4>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {sources.map((source, index) => (
                  <li key={(source.source_filename || source.source || "source") + index}>
                    {source.source_filename || source.source || "CampusGigs knowledge base"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default AiAssistant;
