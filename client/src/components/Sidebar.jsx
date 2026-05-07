import { Archive, Lock, LogOut, Moon, Pin, Plus, Search, Sun, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

export function Sidebar({ dark, setDark, lockedOnly, setLockedOnly, onOpenChat, className = "" }) {
  const { user, logout } = useAuth();
  const { chats, openChat, activeChat, presence, autoLocked } = useChat();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [archivedOnly, setArchivedOnly] = useState(false);

  async function search(value) {
    setQ(value);
    if (value.length < 2) return setResults([]);
    const { data } = await api.get(`/users/search?q=${value}`);
    setResults(data.users);
  }

  async function start(username) {
    const { data } = await api.post("/chats/direct", { username });
    await openChat(data.chat);
    onOpenChat?.();
    setResults([]);
    setQ("");
  }

  const isLockedByMe = (chat) => chat.lockedBy?.some((x) => x.user === user._id || x.user?._id === user._id);
  const isArchivedByMe = (chat) => chat.archivedBy?.some((id) => id === user._id || id?._id === user._id);
  const visibleChats = chats.filter((chat) => {
    if (lockedOnly && !isLockedByMe(chat)) return false;
    if (archivedOnly) return isArchivedByMe(chat);
    return !isArchivedByMe(chat);
  });

  return (
    <aside className={`glass h-full w-full flex-col overflow-hidden rounded-none border-r border-white/40 md:w-96 md:rounded-l-2xl ${className}`}>
      <div className="flex items-center gap-3 border-b border-black/5 p-4 dark:border-white/10">
        <img className="h-11 w-11 rounded-full object-cover" src={user.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${user.displayName}`} alt="" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{user.displayName}</p>
          <p className="truncate text-sm text-slate-500">@{user.username}</p>
        </div>
        <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setLockedOnly(!lockedOnly)} title="Hidden chats">
          <Lock size={18} className={lockedOnly ? "text-teal-500" : ""} />
        </button>
        <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setDark(!dark)} title="Theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={logout} title="Sign out">
          <LogOut size={18} />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 dark:bg-white/10">
          <Search size={17} className="text-slate-400" />
          <input value={q} onChange={(e) => search(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Search by username" />
        </div>
        {results.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-xl border border-black/5 bg-white shadow-lg dark:border-white/10 dark:bg-slate-900">
            {results.map((item) => (
              <button key={item._id} onClick={() => start(item.username)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-teal-50 dark:hover:bg-white/10">
                <img className="h-8 w-8 rounded-full" src={item.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${item.displayName}`} alt="" />
                <span className="text-sm">@{item.username}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 px-4 pb-3 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1"><Pin size={13} /> pinned</span>
        <button onClick={() => setArchivedOnly((value) => !value)} className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${archivedOnly ? "bg-teal-500 text-white" : ""}`}><Archive size={13} /> archived</button>
        <span className="inline-flex items-center gap-1"><Users size={13} /> groups</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {visibleChats.map((chat) => {
          const other = chat.members?.find((member) => member._id !== user._id) || chat.members?.[0];
          const title = chat.type === "group" ? chat.name : other?.displayName;
          const locked = chat.lockedBy?.some((x) => x.user === user._id || x.user?._id === user._id);
          const online = presence[other?._id]?.status === "online" || other?.status === "online";
          return (
            <motion.button
              layout
              key={chat._id}
              onClick={async () => {
                await openChat(chat);
                onOpenChat?.();
              }}
              className={`mb-2 flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${activeChat?._id === chat._id ? "bg-teal-500 text-white shadow-glow" : "hover:bg-white/70 dark:hover:bg-white/10"}`}
            >
              <div className="relative">
                <img className="h-12 w-12 rounded-full object-cover" src={chat.avatar || other?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${title}`} alt="" />
                {online && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />}
              </div>
              <div className={`min-w-0 flex-1 ${locked || autoLocked ? "blur-[2px]" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{title}</p>
                  {locked && <Lock size={14} />}
                </div>
                <p className="truncate text-sm opacity-70">{chat.lastMessage?.text || "No messages yet"}</p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <button className="absolute bottom-5 left-80 hidden rounded-full bg-pink-500 p-4 text-white shadow-xl md:block" title="New group">
        <Plus size={22} />
      </button>
    </aside>
  );
}
