import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProfileSetup() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({ username: user?.username || "", displayName: user?.displayName || "", bio: user?.bio || "", avatar: user?.avatar || "" });

  if (!user) return <Navigate to="/login" replace />;
  if (user.profileComplete) return <Navigate to="/" replace />;

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateProfile(form);
        }}
        className="glass w-full max-w-md rounded-2xl p-6 shadow-glow"
      >
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Finish your profile</h1>
        <div className="mt-5 space-y-3">
          <input className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" value={form.username} placeholder="Username" onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" value={form.displayName} placeholder="Display name" onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <input className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" value={form.avatar} placeholder="Avatar URL" onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
          <textarea className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" value={form.bio} placeholder="Bio" onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        </div>
        <button className="mt-5 w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white">Save profile</button>
      </form>
    </main>
  );
}
