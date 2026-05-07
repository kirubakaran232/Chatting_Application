import { MessageCircle } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { user, emailAuth, googleLogin } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", displayName: "", email: "", identifier: "", password: "" });

  if (user) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    await emailAuth(mode, form);
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-2xl p-6 shadow-glow">
        <MessageCircle className="mb-4 text-teal-500" size={42} />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">PulseChat AI</h1>
        <p className="mt-1 text-slate-500">Real-time messaging with private spaces and useful AI.</p>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-white/60 p-1 dark:bg-white/10">
          {["login", "signup"].map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize ${mode === item ? "bg-teal-500 text-white" : ""}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="mt-5 space-y-3">
          {mode === "signup" && (
            <>
              <input className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
              <input className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" placeholder="Display name" onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
              <input className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" placeholder="Email" type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </>
          )}
          {mode === "login" && <input className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" placeholder="Username or email" onChange={(e) => setForm({ ...form, identifier: e.target.value })} />}
          <input className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" placeholder="Password" type="password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="mt-5 w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white">Continue</button>
        <button type="button" onClick={googleLogin} className="mt-3 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 font-semibold dark:border-white/10 dark:bg-white/10">
          Continue with Google
        </button>
      </form>
    </main>
  );
}
