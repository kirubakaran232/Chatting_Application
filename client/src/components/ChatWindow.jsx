import EmojiPicker from "emoji-picker-react";
import { Bot, CheckCheck, Image, Languages, Lock, Mic, MoreVertical, Paperclip, Phone, ScreenShare, Send, Smile, Sparkles, Trash2, Video } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { StoriesBar } from "./StoriesBar";

export function ChatWindow() {
  const { user } = useAuth();
  const { activeChat, messages, sendMessage, uploadFile, socket, typingUsers, autoLocked } = useChat();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [aiPanel, setAiPanel] = useState("");
  const bottom = useRef(null);

  const other = activeChat?.members?.find((member) => member._id !== user._id) || activeChat?.members?.[0];
  const title = activeChat?.type === "group" ? activeChat?.name : other?.displayName;
  const locked = activeChat?.lockedBy?.some((item) => item.user === user._id || item.user?._id === user._id);
  const needsPin = activeChat && (locked || autoLocked) && !unlocked;

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  function submit(e) {
    e.preventDefault();
    if (!text.trim() && attachments.length === 0) return;
    sendMessage({ text, attachments, replyTo: replyTo?._id });
    setText("");
    setAttachments([]);
    setReplyTo(null);
    socket?.emit("typing:stop", { chatId: activeChat._id });
  }

  async function onFiles(files) {
    const uploaded = [];
    for (const file of files) uploaded.push(await uploadFile(file));
    setAttachments((items) => [...items, ...uploaded]);
  }

  async function unlock() {
    await api.post(`/chats/${activeChat._id}/unlock`, { pin });
    setUnlocked(true);
    setPin("");
  }

  async function lockChat() {
    const nextPin = prompt("Set a PIN for this chat");
    if (!nextPin) return;
    await api.post(`/chats/${activeChat._id}/lock`, { pin: nextPin });
    toast.success("Chat locked");
  }

  async function aiAction(action, payload = {}) {
    const { data } = await api.post("/messages/ai", { action, chatId: activeChat?._id, text, ...payload });
    setAiPanel(data.result);
  }

  if (!activeChat) {
    return (
      <main className="hidden flex-1 place-items-center md:grid">
        <div className="text-center text-slate-500 dark:text-slate-300">
          <Bot className="mx-auto mb-4 text-teal-500" size={48} />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">PulseChat AI</h1>
          <p className="mt-2">Select a chat or search a username to start talking.</p>
        </div>
      </main>
    );
  }

  if (needsPin) {
    return (
      <main className="grid flex-1 place-items-center p-6">
        <div className="glass w-full max-w-sm rounded-2xl p-6 text-center shadow-glow">
          <Lock className="mx-auto text-teal-500" size={42} />
          <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Hidden chat locked</h2>
          <p className="mt-2 text-sm text-slate-500">Enter your PIN to reveal messages and previews.</p>
          <input value={pin} onChange={(e) => setPin(e.target.value)} type="password" className="mt-5 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-center outline-none dark:border-white/10 dark:bg-white/10" placeholder="PIN" />
          <button onClick={unlock} className="mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white">Unlock</button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="glass flex items-center gap-3 border-b border-black/5 px-4 py-3 dark:border-white/10">
        <img className="h-11 w-11 rounded-full object-cover" src={activeChat.avatar || other?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${title}`} alt="" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900 dark:text-white">{title}</p>
          <p className="truncate text-sm text-slate-500">{typingUsers[activeChat._id] ? `${typingUsers[activeChat._id].displayName} is typing...` : activeChat.type}</p>
        </div>
        <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Voice call"><Phone size={19} /></button>
        <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Video call"><Video size={19} /></button>
        <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Screen share"><ScreenShare size={19} /></button>
        <button onClick={lockChat} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Lock chat"><Lock size={19} /></button>
        <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" title="More"><MoreVertical size={19} /></button>
      </div>

      <StoriesBar />

      <div
        className="flex-1 overflow-y-auto p-4"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFiles([...e.dataTransfer.files]);
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const mine = message.sender?._id === user._id;
            return (
              <motion.div key={message._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`mb-3 flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-2 shadow-sm ${mine ? "rounded-br-sm bg-teal-500 text-white" : "rounded-bl-sm bg-white/80 text-slate-900 dark:bg-white/10 dark:text-white"}`}>
                  {message.replyTo && <div className="mb-2 rounded-lg bg-black/10 px-3 py-2 text-xs opacity-80">Replying to: {message.replyTo.text}</div>}
                  {message.deletedForEveryone ? <em>This message was deleted</em> : <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                  {message.attachments?.map((file) => (
                    <a key={file.url} href={file.url} target="_blank" className="mt-2 block overflow-hidden rounded-xl border border-white/20" rel="noreferrer">
                      {file.type === "image" ? <img src={file.url} alt={file.name} className="max-h-72 w-full object-cover" /> : <span className="flex items-center gap-2 p-3"><Paperclip size={16} /> {file.name}</span>}
                    </a>
                  ))}
                  <div className="mt-1 flex items-center justify-end gap-2 text-[11px] opacity-70">
                    <button onClick={() => setReplyTo(message)}>Reply</button>
                    <button onClick={() => api.patch(`/messages/${message._id}/reaction`, { emoji: "❤️" })}>React</button>
                    {mine && <button onClick={() => api.delete(`/messages/${message._id}/everyone`)}><Trash2 size={12} /></button>}
                    <span>{format(new Date(message.createdAt), "HH:mm")}</span>
                    {mine && <CheckCheck size={13} />}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottom} />
      </div>

      {aiPanel && <div className="mx-4 mb-2 rounded-xl border border-teal-400/30 bg-teal-50 p-3 text-sm text-slate-700 dark:bg-teal-950/50 dark:text-teal-50">{aiPanel}</div>}
      {replyTo && <div className="mx-4 mb-2 rounded-xl bg-white/70 px-4 py-2 text-sm dark:bg-white/10">Replying to {replyTo.sender?.displayName}: {replyTo.text}<button className="ml-3 text-teal-500" onClick={() => setReplyTo(null)}>cancel</button></div>}
      {attachments.length > 0 && <div className="mx-4 mb-2 flex gap-2 overflow-x-auto">{attachments.map((file) => <span key={file.url} className="rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-white/10">{file.name}</span>)}</div>}

      <form onSubmit={submit} className="glass m-3 flex items-center gap-2 rounded-2xl p-3">
        <label className="cursor-pointer rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Attach">
          <Paperclip size={20} />
          <input type="file" multiple hidden onChange={(e) => onFiles([...e.target.files])} />
        </label>
        <button type="button" className="rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Voice"><Mic size={20} /></button>
        <button type="button" className="rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Emoji" onClick={() => setEmojiOpen(!emojiOpen)}><Smile size={20} /></button>
        <div className="relative flex-1">
          {emojiOpen && <div className="absolute bottom-12 left-0 z-10"><EmojiPicker onEmojiClick={(e) => setText((x) => x + e.emoji)} /></div>}
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              socket?.emit("typing:start", { chatId: activeChat._id });
            }}
            className="w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10"
            placeholder="Message, paste, or drop files"
          />
        </div>
        <button type="button" onClick={() => aiAction("suggest")} className="rounded-xl p-2 text-pink-500 hover:bg-black/5 dark:hover:bg-white/10" title="AI replies"><Sparkles size={20} /></button>
        <button type="button" onClick={() => aiAction("summarize")} className="rounded-xl p-2 text-teal-500 hover:bg-black/5 dark:hover:bg-white/10" title="AI summary"><Bot size={20} /></button>
        <button type="button" onClick={() => aiAction("translate", { language: "English" })} className="rounded-xl p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Translate"><Languages size={20} /></button>
        <button className="rounded-xl bg-teal-500 p-3 text-white" title="Send"><Send size={20} /></button>
      </form>
    </main>
  );
}
