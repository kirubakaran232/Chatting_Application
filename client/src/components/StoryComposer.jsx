import { ImagePlus, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useChat } from "../context/ChatContext";

export function StoryComposer({ open, onClose, onCreated, defaults }) {
  const { uploadFile } = useChat();
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [uploading, setUploading] = useState(false);

  if (!open) return null;

  async function onFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      return toast.error("Stories support photos and videos");
    }
    setUploading(true);
    try {
      const attachment = await uploadFile(file);
      setMedia(attachment);
    } catch (error) {
      toast.error(error.response?.data?.message || "Story upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function createStory(e) {
    e.preventDefault();
    if (!text.trim() && !media) return toast.error("Add text, photo, or video");
    const type = media?.type === "video" ? "video" : media ? "image" : "text";
    const { data } = await api.post("/stories", {
      type,
      text,
      media: media ? { url: media.url, publicId: media.publicId, format: media.format } : undefined,
      background: "#ff5258",
      visibility: defaults?.visibility,
      allowedUsers: defaults?.allowedUsers
    });
    onCreated?.(data.story);
    setText("");
    setMedia(null);
    onClose?.();
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
      <form onSubmit={createStory} className="glass w-full max-w-md rounded-2xl p-5 shadow-glow">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create story</h2>
            <p className="mt-1 text-sm text-slate-500">Add text, a photo, or a video. It expires after 24 hours.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
        </div>
        <label className="mt-5 grid min-h-44 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-white/20 bg-white/70 text-center dark:bg-white/10">
          {media?.type === "video" ? (
            <video src={media.url} className="max-h-64 w-full object-cover" controls />
          ) : media ? (
            <img src={media.url} className="max-h-64 w-full object-cover" alt="" />
          ) : (
            <span className="flex flex-col items-center gap-2 text-sm text-slate-500"><ImagePlus size={28} /> {uploading ? "Uploading..." : "Choose photo or video"}</span>
          )}
          <input type="file" accept="image/*,video/*" hidden onChange={(event) => onFile(event.target.files?.[0])} />
        </label>
        {media && <button type="button" onClick={() => setMedia(null)} className="mt-2 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"><X size={15} /> Remove media</button>}
        <textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-3 min-h-24 w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" placeholder="Description or text story" />
        <button disabled={uploading} className="mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white disabled:opacity-60">Post story</button>
      </form>
    </div>
  );
}
