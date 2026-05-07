import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [presence, setPresence] = useState({});
  const inactivityTimer = useRef(null);
  const [autoLocked, setAutoLocked] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    const token = localStorage.getItem("chat_token");
    const nextSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { auth: { token } });
    setSocket(nextSocket);
    nextSocket.on("message:new", (message) => {
      setMessages((items) => {
        if (message.chat !== activeChat?._id || items.some((item) => item._id === message._id)) return items;
        return [...items, message];
      });
      setChats((items) => items.map((chat) => (chat._id === message.chat ? { ...chat, lastMessage: message } : chat)));
      if (message.sender?._id !== user._id) new Audio("/notify.mp3").play().catch(() => {});
    });
    nextSocket.on("typing:start", ({ chatId, user: typer }) => setTypingUsers((x) => ({ ...x, [chatId]: typer })));
    nextSocket.on("typing:stop", ({ chatId }) => setTypingUsers((x) => ({ ...x, [chatId]: null })));
    nextSocket.on("presence:update", ({ userId, status, lastSeen }) => setPresence((x) => ({ ...x, [userId]: { status, lastSeen } })));
    nextSocket.on("call:offer", () => toast("Incoming call"));
    return () => nextSocket.disconnect();
  }, [user, activeChat?._id]);

  useEffect(() => {
    if (!user) return;
    api.get("/chats").then(({ data }) => setChats(data.chats));
  }, [user]);

  useEffect(() => {
    const refreshLock = () => {
      setAutoLocked(false);
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => setAutoLocked(true), 5 * 60 * 1000);
    };
    window.addEventListener("mousemove", refreshLock);
    window.addEventListener("keydown", refreshLock);
    refreshLock();
    return () => {
      window.removeEventListener("mousemove", refreshLock);
      window.removeEventListener("keydown", refreshLock);
      clearTimeout(inactivityTimer.current);
    };
  }, []);

  async function openChat(chat) {
    setActiveChat(chat);
    socket?.emit("chat:join", { chatId: chat._id });
    const { data } = await api.get(`/chats/${chat._id}/messages`);
    setMessages(data.messages);
    socket?.emit("message:seen", { chatId: chat._id });
  }

  async function sendMessage(payload) {
    if (!activeChat) return;
    const { data } = await api.post(`/chats/${activeChat._id}/messages`, payload);
    setMessages((items) => (items.some((item) => item._id === data.message._id) ? items : [...items, data.message]));
  }

  async function uploadFile(file) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/messages/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    return data.attachment;
  }

  const value = useMemo(
    () => ({ socket, chats, setChats, activeChat, messages, typingUsers, presence, autoLocked, openChat, sendMessage, uploadFile }),
    [socket, chats, activeChat, messages, typingUsers, presence, autoLocked]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}
