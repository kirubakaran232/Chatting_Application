import { signInWithPopup } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { firebaseAuth, googleProvider } from "../lib/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then(({ data }) => setUser(data.user))
      .catch(() => localStorage.removeItem("chat_token"))
      .finally(() => setLoading(false));
  }, []);

  async function emailAuth(mode, payload) {
    const { data } = await api.post(`/auth/${mode}`, payload);
    localStorage.setItem("chat_token", data.token);
    setUser(data.user);
    toast.success(mode === "signup" ? "Welcome in" : "Signed in");
  }

  async function googleLogin() {
    const credential = await signInWithPopup(firebaseAuth, googleProvider);
    const idToken = await credential.user.getIdToken();
    const { data } = await api.post("/auth/firebase", { idToken });
    localStorage.setItem("chat_token", data.token);
    setUser(data.user);
  }

  async function updateProfile(payload) {
    const { data } = await api.patch("/auth/profile", payload);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem("chat_token");
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, emailAuth, googleLogin, updateProfile, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
