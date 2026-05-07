import EmojiPicker from "emoji-picker-react";
import { Archive, ArrowLeft, Ban, Bot, CheckCheck, Flag, Image, Languages, Lock, Mic, MoreVertical, Paperclip, Phone, Pin, ScreenShare, Send, Smile, Sparkles, Square, Trash2, Unlock, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
// Stories live in Sidebar list now.

export function ChatWindow({ onBack, className = "" }) {
  const { user } = useAuth();
  const { activeChat, messages, sendMessage, uploadFile, socket, typingUsers, autoLocked, chatAction, updateChat, deleteMessageForMe, deleteMessageForEveryone, reactToMessage } = useChat();
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [reactingTo, setReactingTo] = useState(null);
  const [reactPickerOpen, setReactPickerOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [lockPin, setLockPin] = useState("");
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [removeLockModalOpen, setRemoveLockModalOpen] = useState(false);
  const [removeLockPin, setRemoveLockPin] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [aiPanel, setAiPanel] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [callOpen, setCallOpen] = useState(false);
  const [callStatus, setCallStatus] = useState("idle"); // idle | calling | incoming | in-call
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [muted, setMuted] = useState(false);
  const [callKind, setCallKind] = useState("audio"); // audio | video | screen
  const bottom = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const other = activeChat?.members?.find((member) => member._id !== user._id) || activeChat?.members?.[0];
  const title = activeChat?.type === "group" ? activeChat?.name : other?.displayName;
  const locked = activeChat?.lockedBy?.some((item) => item.user === user._id || item.user?._id === user._id);
  const archived = activeChat?.archivedBy?.some((id) => id === user._id || id?._id === user._id);
  const pinned = activeChat?.pinnedBy?.some((id) => id === user._id || id?._id === user._id);
  const needsPin = activeChat && (locked || autoLocked) && !unlocked;

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  useEffect(() => {
    setUnlocked(false);
    setMenuOpen(false);
    setLockModalOpen(false);
    setRemoveLockModalOpen(false);
    setPin("");
    setLockPin("");
    setRemoveLockPin("");
    setReactingTo(null);
    setReactPickerOpen(false);
    setEmojiOpen(false);
  }, [activeChat?._id]);

  useEffect(() => {
    if (!recording) return undefined;
    setRecordSeconds(0);
    const id = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  function formatSecs(total) {
    const mm = String(Math.floor(total / 60)).padStart(2, "0");
    const ss = String(total % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function cleanupCall() {
    try {
      pcRef.current?.close?.();
    } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setCallStatus("idle");
    setIncomingOffer(null);
    setMuted(false);
    setCallOpen(false);
    setCallKind("audio");
  }

  function ensurePeerConnection() {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pc.onicecandidate = (event) => {
      if (event.candidate) socket?.emit("call:ice", { chatId: activeChat._id, candidate: event.candidate });
    };
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      remoteStreamRef.current = stream;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        cleanupCall();
      }
    };
    pcRef.current = pc;
    return pc;
  }

  async function startOutgoingCall(kind = "audio") {
    if (!socket || !activeChat) return;
    try {
      setCallOpen(true);
      setCallStatus("calling");
      setCallKind(kind);
      let stream = null;
      if (kind === "video") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } else if (kind === "screen") {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        let mic = null;
        try {
          mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
          mic = null;
        }
        const tracks = [...display.getTracks(), ...(mic ? mic.getTracks() : [])];
        stream = new MediaStream(tracks);
        display.getVideoTracks()[0]?.addEventListener?.("ended", () => endCall());
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      localStreamRef.current = stream;
      if (localVideoRef.current && kind !== "audio") localVideoRef.current.srcObject = stream;
      const pc = ensurePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call:offer", { chatId: activeChat._id, sdp: offer, kind });
    } catch {
      toast.error("Microphone permission was blocked");
      cleanupCall();
    }
  }

  async function acceptIncomingCall() {
    if (!socket || !incomingOffer || !activeChat) return;
    try {
      setCallOpen(true);
      setCallKind(incomingOffer.kind || "audio");
      let stream = null;
      if (incomingOffer.kind === "video") {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } else if (incomingOffer.kind === "screen") {
        const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        let mic = null;
        try {
          mic = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch {
          mic = null;
        }
        const tracks = [...display.getTracks(), ...(mic ? mic.getTracks() : [])];
        stream = new MediaStream(tracks);
        display.getVideoTracks()[0]?.addEventListener?.("ended", () => endCall());
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }
      localStreamRef.current = stream;
      if (localVideoRef.current && (incomingOffer.kind || "audio") !== "audio") localVideoRef.current.srcObject = stream;
      const pc = ensurePeerConnection();
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await pc.setRemoteDescription(incomingOffer.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("call:answer", { chatId: activeChat._id, sdp: answer });
      setCallStatus("in-call");
      setIncomingOffer(null);
    } catch {
      toast.error("Could not answer call");
      cleanupCall();
    }
  }

  function endCall() {
    socket?.emit("call:end", { chatId: activeChat?._id });
    cleanupCall();
  }

  function toggleMute() {
    setMuted((v) => {
      const next = !v;
      localStreamRef.current?.getAudioTracks?.().forEach((t) => {
        t.enabled = !next;
      });
      return next;
    });
  }

  useEffect(() => {
    if (!socket || !activeChat) return undefined;
    const onOffer = (payload) => {
      if (payload.chatId !== activeChat._id) return;
      setIncomingOffer(payload);
      setCallStatus("incoming");
      setCallOpen(true);
    };
    const onAnswer = async (payload) => {
      if (payload.chatId !== activeChat._id) return;
      try {
        await pcRef.current?.setRemoteDescription?.(payload.sdp);
        setCallStatus("in-call");
      } catch {}
    };
    const onIce = async (payload) => {
      if (payload.chatId !== activeChat._id) return;
      try {
        await pcRef.current?.addIceCandidate?.(payload.candidate);
      } catch {}
    };
    const onEnd = (payload) => {
      if (payload.chatId !== activeChat._id) return;
      cleanupCall();
    };
    socket.on("call:offer", onOffer);
    socket.on("call:answer", onAnswer);
    socket.on("call:ice", onIce);
    socket.on("call:end", onEnd);
    return () => {
      socket.off("call:offer", onOffer);
      socket.off("call:answer", onAnswer);
      socket.off("call:ice", onIce);
      socket.off("call:end", onEnd);
    };
  }, [socket, activeChat?._id]);

  function isImageAttachment(file) {
    const value = `${file.type || ""} ${file.format || ""} ${file.name || ""} ${file.url || ""}`.toLowerCase();
    return file.type === "image" || /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(value) || ["jpg", "jpeg", "png", "webp", "gif", "avif"].some((format) => value.includes(format));
  }

  function isAudioAttachment(file) {
    const value = `${file.type || ""} ${file.format || ""} ${file.name || ""} ${file.url || ""}`.toLowerCase();
    return file.type === "audio" || /\.(webm|mp3|wav|m4a|ogg)(\?|$)/i.test(value);
  }

  function isVideoAttachment(file) {
    const value = `${file.type || ""} ${file.format || ""} ${file.name || ""} ${file.url || ""}`.toLowerCase();
    return file.type === "video" || /\.(mp4|mov|webm|mkv)(\?|$)/i.test(value);
  }

  async function submit(e) {
    e.preventDefault();
    if (sending) return;
    if (!text.trim() && attachments.length === 0) return;
    try {
      setSending(true);
      await sendMessage({ text, attachments, replyTo: replyTo?._id });
      setText("");
      setAttachments([]);
      setReplyTo(null);
      socket?.emit("typing:stop", { chatId: activeChat._id });
    } catch (error) {
      toast.error(error.response?.data?.message || "Message could not be sent");
    } finally {
      setSending(false);
    }
  }

  async function onFiles(files) {
    try {
      const uploaded = [];
      for (const file of files) uploaded.push(await uploadFile(file));
      setAttachments((items) => [...items, ...uploaded]);
      toast.success("File ready to send");
    } catch (error) {
      toast.error(error.response?.data?.message || "Upload failed. Check Cloudinary settings.");
    }
  }

  async function unlock() {
    try {
      await api.post(`/chats/${activeChat._id}/unlock`, { pin });
      setUnlocked(true);
      setPin("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid PIN");
    }
  }

  async function lockChat(e) {
    e.preventDefault();
    if (lockPin.length < 4) return toast.error("PIN must be at least 4 digits");
    try {
      const { data } = await api.post(`/chats/${activeChat._id}/lock`, { pin: lockPin });
      updateChat(activeChat._id, data.chat);
      setUnlocked(false);
      setLockPin("");
      setLockModalOpen(false);
      toast.success("Chat locked");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not lock chat");
    }
  }

  async function removeLock(e) {
    e.preventDefault();
    if (!removeLockPin) return toast.error("Enter the PIN");
    try {
      const { data } = await api.delete(`/chats/${activeChat._id}/lock`, { data: { pin: removeLockPin } });
      updateChat(activeChat._id, data.chat);
      setUnlocked(true);
      setRemoveLockPin("");
      setRemoveLockModalOpen(false);
      toast.success("Chat unlocked permanently");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid PIN");
    }
  }

  async function aiAction(action, payload = {}) {
    const { data } = await api.post("/messages/ai", { action, chatId: activeChat?._id, text, ...payload });
    setAiPanel(data.result);
  }

  async function runMenuAction(action) {
    try {
      if (action === "block") {
        await api.patch(`/users/${other.username}/block`);
        toast.success("User block setting updated");
      } else {
        await chatAction(action);
        toast.success(`${action[0].toUpperCase()}${action.slice(1)} updated`);
      }
      setMenuOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed");
    }
  }

  async function toggleVoiceRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error("Voice recording is not supported in this browser");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : undefined });
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        try {
          const attachment = await uploadFile(file);
          await sendMessage({ text: "", attachments: [attachment] });
          toast.success("Voice message sent");
        } catch (error) {
          toast.error(error.response?.data?.message || "Voice message failed");
        }
      };
      recorder.start();
      setRecording(true);
    } catch {
      toast.error("Microphone permission was blocked");
    }
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
      <main className={`${className} grid flex-1 place-items-center p-4 sm:p-6`}>
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
    <main className={`${className} relative min-w-0 flex-1 flex-col`}>
      {/* Sticky header stays visible on real mobile browsers without being hidden/clipped. */}
      <div className="glass sticky top-0 z-30 flex min-h-16 w-full min-w-0 items-center gap-2 overflow-visible border-b border-black/5 px-2 py-2 dark:border-white/10 sm:gap-3 sm:px-4 sm:py-3 max-[380px]:px-2 max-[380px]:py-2">
        <button onClick={onBack} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 md:hidden" title="Back to chats">
          <ArrowLeft size={20} />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden sm:gap-3 max-[380px]:gap-1.5">
          <img className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-11 sm:w-11 max-[380px]:h-9 max-[380px]:w-9" src={activeChat.avatar || other?.avatar || `https://api.dicebear.com/8.x/initials/svg?seed=${title}`} alt="" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-[15px] font-semibold text-slate-900 dark:text-white sm:text-base">{title || "Chat"}</p>
            <p className="truncate text-xs text-slate-500 sm:text-sm">{typingUsers[activeChat._id] ? `${typingUsers[activeChat._id].displayName} is typing...` : activeChat.type}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => startOutgoingCall("audio")} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10" title="Voice call"><Phone size={19} /></button>
          <button onClick={() => startOutgoingCall("video")} className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 sm:grid" title="Video call"><Video size={19} /></button>
          <button onClick={() => startOutgoingCall("screen")} className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 sm:grid" title="Screen share"><ScreenShare size={19} /></button>
          <button onClick={() => setLockModalOpen(true)} className="hidden h-10 w-10 shrink-0 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 sm:grid" title="Lock chat"><Lock size={19} /></button>
        </div>
        <div className="relative shrink-0">
          <button onClick={() => setMenuOpen((open) => !open)} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10" title="More"><MoreVertical size={19} /></button>
          {menuOpen && (
            <>
              <button type="button" className="absolute inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
              <div className="glass absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl p-1 text-sm shadow-xl">
                <div className="mb-1 flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wide text-slate-500">
                  <span>Options</span>
                  <button onClick={() => setMenuOpen(false)} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"><X size={14} /></button>
                </div>
                <button onClick={() => runMenuAction("pin")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"><Pin size={16} /> {pinned ? "Unpin chat" : "Pin chat"}</button>
                <button onClick={() => runMenuAction("archive")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"><Archive size={16} /> {archived ? "Unarchive chat" : "Archive chat"}</button>
                <button onClick={() => { setLockModalOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"><Lock size={16} /> Lock chat</button>
                <button onClick={() => startOutgoingCall("video")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 sm:hidden"><Video size={16} /> Video call</button>
                <button onClick={() => startOutgoingCall("screen")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10 sm:hidden"><ScreenShare size={16} /> Share screen</button>
                {locked && <button onClick={() => { setRemoveLockModalOpen(true); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"><Unlock size={16} /> Remove lock</button>}
                <button onClick={() => aiAction("summarize")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"><Bot size={16} /> AI summary</button>
                <button onClick={() => runMenuAction("report")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"><Flag size={16} /> Report chat</button>
                {activeChat.type === "direct" && <button onClick={() => runMenuAction("block")} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"><Ban size={16} /> Block user</button>}
              </div>
            </>
          )}
        </div>
      </div>

      {lockModalOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/55 p-4">
          <form onSubmit={lockChat} className="glass w-full max-w-sm rounded-2xl p-5 shadow-glow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lock this chat</h2>
                <p className="mt-1 text-sm text-slate-500">Create a PIN to hide this chat preview and messages.</p>
              </div>
              <button type="button" onClick={() => setLockModalOpen(false)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
            </div>
            <input value={lockPin} onChange={(e) => setLockPin(e.target.value)} type="password" inputMode="numeric" className="mt-5 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-center outline-none dark:border-white/10 dark:bg-white/10" placeholder="Enter at least 4 digits" />
            <button className="mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white">Save PIN</button>
          </form>
        </div>
      )}

      {removeLockModalOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/55 p-4">
          <form onSubmit={removeLock} className="glass w-full max-w-sm rounded-2xl p-5 shadow-glow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Remove chat lock</h2>
                <p className="mt-1 text-sm text-slate-500">Enter your PIN once to permanently unlock this chat.</p>
              </div>
              <button type="button" onClick={() => setRemoveLockModalOpen(false)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
            </div>
            <input value={removeLockPin} onChange={(e) => setRemoveLockPin(e.target.value)} type="password" inputMode="numeric" className="mt-5 w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-center outline-none dark:border-white/10 dark:bg-white/10" placeholder="PIN" />
            <button className="mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white">Remove lock</button>
          </form>
        </div>
      )}

      {callOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
          <div className="glass w-full max-w-sm rounded-2xl p-5 shadow-glow">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Voice call</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {callStatus === "calling" && "Calling..."}
                  {callStatus === "incoming" && "Incoming call"}
                  {callStatus === "in-call" && "In call"}
                  {callStatus === "idle" && "Ready"}
                </p>
              </div>
              <button onClick={endCall} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Close"><X size={18} /></button>
            </div>
            <audio ref={remoteAudioRef} autoPlay />
            <div className="mt-3 grid grid-cols-1 gap-2">
              {callKind !== "audio" && (
                <div className="grid grid-cols-2 gap-2">
                  <video ref={localVideoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-black/30 object-cover" />
                  <video ref={remoteVideoRef} autoPlay playsInline className="aspect-video w-full rounded-xl bg-black/30 object-cover" />
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              {callStatus === "incoming" && (
                <>
                  <button onClick={acceptIncomingCall} className="flex-1 rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white">Accept</button>
                  <button onClick={endCall} className="flex-1 rounded-xl bg-white/20 px-4 py-3 font-semibold">Decline</button>
                </>
              )}
              {callStatus === "calling" && <button onClick={endCall} className="w-full rounded-xl bg-white/20 px-4 py-3 font-semibold">Cancel</button>}
              {callStatus === "in-call" && (
                <>
                  <button onClick={toggleMute} className={`flex-1 rounded-xl px-4 py-3 font-semibold ${muted ? "bg-teal-500 text-white" : "bg-white/20"}`}>{muted ? "Unmute" : "Mute"}</button>
                  <button onClick={endCall} className="flex-1 rounded-xl bg-white/20 px-4 py-3 font-semibold">Hang up</button>
                </>
              )}
              {callStatus === "idle" && <button onClick={() => setCallOpen(false)} className="w-full rounded-xl bg-white/20 px-4 py-3 font-semibold">Close</button>}
            </div>
            <p className="mt-3 text-xs text-slate-500">Note: works best on Wi‑Fi; some networks need TURN for reliability.</p>
          </div>
        </div>
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
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
                <div className={`max-w-[86%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[78%] sm:px-4 ${mine ? "rounded-br-sm bg-teal-500 text-white" : "rounded-bl-sm bg-white/80 text-slate-900 dark:bg-white/10 dark:text-white"}`}>
                  {message.replyTo && <div className="mb-2 rounded-lg bg-black/10 px-3 py-2 text-xs opacity-80">Replying to: {message.replyTo.text}</div>}
                  {message.deletedForEveryone ? <em>This message was deleted</em> : <p className="whitespace-pre-wrap break-words">{message.text}</p>}
                  {message.attachments?.map((file) => (
                    <a key={file.url} href={file.url} target="_blank" className="mt-2 block overflow-hidden rounded-xl border border-white/20" rel="noreferrer">
                      {isImageAttachment(file) ? (
                        <img src={file.url} alt={file.name} className="max-h-72 w-full object-cover" />
                      ) : isAudioAttachment(file) ? (
                        <audio src={file.url} controls className="w-64 max-w-full p-2" />
                      ) : isVideoAttachment(file) ? (
                        <video src={file.url} controls className="max-h-72 w-full object-cover" />
                      ) : (
                        <span className="flex items-center gap-2 p-3"><Paperclip size={16} /> {file.name}</span>
                      )}
                    </a>
                  ))}
                  <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-[11px] opacity-70">
                    <button onClick={() => setReplyTo(message)}>Reply</button>
                    <button
                      onClick={() => {
                        setReactingTo((current) => (current === message._id ? null : message._id));
                        setReactPickerOpen(false);
                      }}
                    >
                      React
                    </button>
                    <button onClick={() => deleteMessageForMe(message._id)} title="Delete for me">Delete me</button>
                    {mine && <button onClick={() => deleteMessageForEveryone(message._id)} className="inline-flex items-center gap-1" title="Delete for everyone"><Trash2 size={12} /> All</button>}
                    <span>{format(new Date(message.createdAt), "HH:mm")}</span>
                    {mine && (
                      <CheckCheck
                        size={13}
                        style={{ color: (message.seenBy && message.seenBy.length > 0) ? "#4da3ff" : "rgba(255,255,255,0.65)" }}
                      />
                    )}
                  </div>
                  {reactingTo === message._id && (
                    <div className="mt-2 flex items-center gap-1">
                      {["\u2764\ufe0f", "\ud83d\ude02", "\ud83d\ude2e", "\ud83d\ude2d", "\ud83d\udd25"].map((emo) => (
                        <button
                          key={emo}
                          onClick={() => {
                            reactToMessage(message._id, emo);
                            setReactingTo(null);
                          }}
                          className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm dark:bg-white/10"
                          title="React"
                        >
                          {emo}
                        </button>
                      ))}
                      <button
                        onClick={() => setReactPickerOpen((v) => !v)}
                        className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm dark:bg-white/10"
                        title="More reactions"
                      >
                        +
                      </button>
                      {reactPickerOpen && (
                        <div className="relative">
                          <div className="absolute bottom-10 right-0 z-20 overflow-hidden rounded-xl">
                            <button type="button" onClick={() => setReactPickerOpen(false)} className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"><X size={15} /></button>
                            <EmojiPicker width={320} onEmojiClick={(e) => { reactToMessage(message._id, e.emoji); setReactPickerOpen(false); setReactingTo(null); }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {message.reactions?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.reactions.map((reaction, index) => (
                        <span key={`${reaction.emoji}-${index}`} className="rounded-full bg-black/10 px-2 py-0.5 text-xs dark:bg-white/10">{reaction.emoji}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottom} />
      </div>

      {aiPanel && <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-teal-400/30 bg-teal-50 p-3 text-sm text-slate-700 dark:bg-teal-950/50 dark:text-teal-50"><span className="flex-1">{aiPanel}</span><button onClick={() => setAiPanel("")} className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10"><X size={15} /></button></div>}
      {replyTo && <div className="mx-4 mb-2 rounded-xl bg-white/70 px-4 py-2 text-sm dark:bg-white/10">Replying to {replyTo.sender?.displayName}: {replyTo.text}<button className="ml-3 text-teal-500" onClick={() => setReplyTo(null)}>cancel</button></div>}
      {attachments.length > 0 && (
        <div className="mx-4 mb-2 flex gap-2 overflow-x-auto">
          {attachments.map((file, index) =>
            isImageAttachment(file) ? (
              <div key={file.url} className="relative shrink-0">
                <img src={file.url} alt={file.name} className="h-20 w-20 rounded-xl object-cover" />
                <button onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"><X size={12} /></button>
              </div>
            ) : (
              <span key={file.url} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-white/10"><Image size={15} />{file.name}<button onClick={() => setAttachments((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={13} /></button></span>
            )
          )}
        </div>
      )}

      <form onSubmit={submit} className="glass m-2 shrink-0 flex flex-wrap items-center gap-2 rounded-2xl p-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] sm:m-3 sm:flex-nowrap sm:p-3">
        {recording && (
          <div className="flex w-full items-center justify-between rounded-xl bg-black/10 px-3 py-2 text-xs dark:bg-white/10 sm:hidden">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Recording {formatSecs(recordSeconds)}
            </span>
            <button type="button" onClick={toggleVoiceRecording} className="rounded-lg bg-teal-500 px-2 py-1 text-white">
              Stop
            </button>
          </div>
        )}
        <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10" title="Attach">
          <Paperclip size={20} />
          <input type="file" multiple hidden onChange={(e) => onFiles([...e.target.files])} />
        </label>
        <button type="button" onClick={toggleVoiceRecording} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 ${recording ? "bg-teal-500 text-white" : ""}`} title={recording ? "Stop recording" : "Voice"}>
          {recording ? <Square size={18} /> : <Mic size={20} />}
        </button>
        {recording && (
          <div className="hidden items-center gap-2 rounded-xl bg-black/10 px-3 py-2 text-xs dark:bg-white/10 sm:flex">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <span>Recording {formatSecs(recordSeconds)}</span>
          </div>
        )}
        <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10" title="Emoji" onClick={() => setEmojiOpen(!emojiOpen)}><Smile size={20} /></button>
        <div className="relative order-first w-full sm:order-none sm:flex-1">
          {emojiOpen && (
            <div className="absolute bottom-12 left-0 z-10 max-w-[92vw] overflow-hidden rounded-xl">
              <button type="button" onClick={() => setEmojiOpen(false)} className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white"><X size={15} /></button>
              <EmojiPicker width={320} onEmojiClick={(e) => setText((x) => x + e.emoji)} />
            </div>
          )}
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
        <button type="button" onClick={() => aiAction("suggest")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-pink-500 hover:bg-black/5 dark:hover:bg-white/10" title="AI replies"><Sparkles size={20} /></button>
        <button type="button" onClick={() => aiAction("summarize")} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-teal-500 hover:bg-black/5 dark:hover:bg-white/10" title="AI summary"><Bot size={20} /></button>
        <button type="button" onClick={() => aiAction("translate", { language: "English" })} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10" title="Translate"><Languages size={20} /></button>
        <button disabled={sending} className="ml-auto grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-500 text-white disabled:cursor-not-allowed disabled:opacity-60 sm:ml-0 sm:h-11 sm:w-11" title="Send">
          <Send size={20} />
        </button>
      </form>
    </main>
  );
}
