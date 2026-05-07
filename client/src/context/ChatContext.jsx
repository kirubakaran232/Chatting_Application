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
  const activeChatRef = useRef(null);
  const [autoLocked, setAutoLocked] = useState(false);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  useEffect(() => {
    if (!user) return undefined;
    const token = localStorage.getItem("chat_token");
    const nextSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", { auth: { token } });
    setSocket(nextSocket);
    nextSocket.on("chat:new", (chat) => {
      nextSocket.emit("chat:join", { chatId: chat._id });
      setChats((items) => (items.some((item) => item._id === chat._id) ? items : [chat, ...items]));
      toast.success(`New ${chat.type === "group" ? "group" : "chat"} available`);
    });
    nextSocket.on("chat:updated", ({ chatId, lastMessage }) => {
      setChats((items) =>
        items
          .map((chat) => (chat._id === chatId ? { ...chat, lastMessage } : chat))
          .sort((a, b) => new Date(b.updatedAt || b.lastMessage?.createdAt || 0) - new Date(a.updatedAt || a.lastMessage?.createdAt || 0))
      );
    });
    nextSocket.on("message:new", (message) => {
      setMessages((items) => {
        if (message.chat !== activeChatRef.current?._id || items.some((item) => item._id === message._id)) return items;
        return [...items, message];
      });
      setChats((items) => items.map((chat) => (chat._id === message.chat ? { ...chat, lastMessage: message } : chat)));
      if (message.sender?._id !== user._id) new Audio("/notify.mp3").play().catch(() => {});
    });
    nextSocket.on("message:reaction", ({ messageId, reactions }) => {
      setMessages((items) => items.map((message) => (message._id === messageId ? { ...message, reactions } : message)));
    });
    nextSocket.on("message:deleted", ({ messageId }) => {
      setMessages((items) =>
        items.map((message) =>
          message._id === messageId ? { ...message, text: "", attachments: [], deletedForEveryone: true } : message
        )
      );
    });
    nextSocket.on("typing:start", ({ chatId, user: typer }) => setTypingUsers((x) => ({ ...x, [chatId]: typer })));
    nextSocket.on("typing:stop", ({ chatId }) => setTypingUsers((x) => ({ ...x, [chatId]: null })));
    nextSocket.on("presence:update", ({ userId, status, lastSeen }) => setPresence((x) => ({ ...x, [userId]: { status, lastSeen } })));
    nextSocket.on("call:offer", () => toast("Incoming call"));
    nextSocket.on("message:seen", ({ chatId, userId }) => {
      // Mark my outgoing messages as seen when another member reports seen for this chat.
      setMessages((items) =>
        items.map((message) => {
          if (message.chat !== chatId) return message;
          if (message.sender?._id !== user._id) return message;
          const seenBy = message.seenBy || [];
          if (seenBy.some((x) => String(x.user?._id || x.user) === String(userId))) return message;
          return { ...message, seenBy: [...seenBy, { user: userId, at: new Date().toISOString() }] };
        })
      );
    });
    return () => nextSocket.disconnect();
  }, [user]);

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

  async function updateChat(chatId, updater) {
    const nextChat = typeof updater === "function" ? updater(chats.find((chat) => chat._id === chatId)) : updater;
    setChats((items) => items.map((chat) => (chat._id === chatId ? { ...chat, ...nextChat } : chat)));
    setActiveChat((chat) => (chat?._id === chatId ? { ...chat, ...nextChat } : chat));
  }

  async function chatAction(action) {
    if (!activeChat) return;
    const { data } = await api.patch(`/chats/${activeChat._id}/action`, { action });
    updateChat(activeChat._id, data.chat);
    return data.chat;
  }

  async function deleteMessageForMe(messageId) {
    await api.delete(`/messages/${messageId}/me`);
    setMessages((items) => items.filter((message) => message._id !== messageId));
  }

  async function deleteMessageForEveryone(messageId) {
    await api.delete(`/messages/${messageId}/everyone`);
    setMessages((items) =>
      items.map((message) =>
        message._id === messageId ? { ...message, text: "", attachments: [], deletedForEveryone: true } : message
      )
    );
  }

  async function reactToMessage(messageId, emoji) {
    await api.patch(`/messages/${messageId}/reaction`, { emoji });
    setMessages((items) =>
      items.map((message) =>
        message._id === messageId
          ? {
              ...message,
              reactions: [
                ...(message.reactions || []).filter((reaction) => String(reaction.user?._id || reaction.user) !== String(user._id)),
                { emoji, user: user._id }
              ]
            }
          : message
      )
    );
  }

  async function uploadFile(file) {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post("/messages/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
    return data.attachment;
  }

  const value = useMemo(
    () => ({ socket, chats, setChats, activeChat, messages, typingUsers, presence, autoLocked, openChat, sendMessage, uploadFile, chatAction, updateChat, deleteMessageForMe, deleteMessageForEveryone, reactToMessage }),
    [socket, chats, activeChat, messages, typingUsers, presence, autoLocked]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}
