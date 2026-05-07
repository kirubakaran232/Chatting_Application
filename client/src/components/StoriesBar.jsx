import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";

export function StoriesBar() {
  const { user } = useAuth();
  const { uploadFile } = useChat();
  const [stories, setStories] = useState([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [media, setMedia] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get("/stories").then(({ data }) => setStories(data.stories));
  }, []);

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
      background: "#ff5258"
    });
    setStories((items) => [data.story, ...items]);
    setText("");
    setMedia(null);
    setOpen(false);
  }

  async function deleteStory(storyId) {
    await api.delete(`/stories/${storyId}`);
    setStories((items) => items.filter((story) => story._id !== storyId));
    toast.success("Story deleted");
  }

  return (
    <div className="flex gap-3 overflow-x-auto border-b border-black/5 px-3 py-3 dark:border-white/10 sm:px-4">
      <button onClick={() => setOpen(true)} className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-teal-500 text-white">
        <Plus size={22} />
      </button>
      {stories.map((story) => (
        <div key={story._id} className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-pink-400">
          {story.type === "text" ? (
            <span className="grid h-full place-items-center bg-teal-500 px-1 text-center text-xs font-semibold text-white">{story.text}</span>
          ) : story.type === "video" ? (
            <video src={story.media?.url} className="h-full w-full object-cover" muted />
          ) : (
            <img src={story.media?.url} className="h-full w-full object-cover" alt="" />
          )}
          {story.text && story.type !== "text" && <span className="absolute inset-x-1 bottom-1 truncate rounded bg-black/45 px-1 text-[10px] text-white">{story.text}</span>}
          {story.author?._id === user._id && (
            <button onClick={() => deleteStory(story._id)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100" title="Delete story">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}

      {open && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
          <form onSubmit={createStory} className="glass w-full max-w-md rounded-2xl p-5 shadow-glow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Create story</h2>
                <p className="mt-1 text-sm text-slate-500">Add text, a photo, or a video. It expires after 24 hours.</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10"><X size={18} /></button>
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
            <textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-3 min-h-24 w-full rounded-xl bg-white/70 px-4 py-3 outline-none dark:bg-white/10" placeholder="Description or text story" />
            <button disabled={uploading} className="mt-4 w-full rounded-xl bg-teal-500 px-4 py-3 font-semibold text-white disabled:opacity-60">Post story</button>
          </form>
        </div>
      )}
    </div>
  );
}
