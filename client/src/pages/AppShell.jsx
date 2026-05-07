import { useEffect, useState } from "react";
import { ChatProvider } from "../context/ChatContext";
import { Sidebar } from "../components/Sidebar";
import { ChatWindow } from "../components/ChatWindow";

function ResponsiveChatLayout({ dark, setDark, lockedOnly, setLockedOnly }) {
  const [mobileView, setMobileView] = useState("sidebar");

  return (
    <div className="mx-auto flex h-full max-w-7xl overflow-hidden rounded-none border border-white/40 shadow-2xl md:rounded-2xl">
      <Sidebar
        dark={dark}
        setDark={setDark}
        lockedOnly={lockedOnly}
        setLockedOnly={setLockedOnly}
        onOpenChat={() => setMobileView("chat")}
        className={mobileView === "chat" ? "hidden md:flex" : "flex"}
      />
      <ChatWindow
        onBack={() => setMobileView("sidebar")}
        className={mobileView === "chat" ? "flex" : "hidden md:flex"}
      />
    </div>
  );
}

export function AppShell() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  const [lockedOnly, setLockedOnly] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <ChatProvider>
      <div className="h-[100dvh] p-0 text-slate-800 dark:text-slate-100 md:p-4">
        <ResponsiveChatLayout dark={dark} setDark={setDark} lockedOnly={lockedOnly} setLockedOnly={setLockedOnly} />
      </div>
    </ChatProvider>
  );
}
