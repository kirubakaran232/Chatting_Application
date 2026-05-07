import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function StoriesBar({ onNewStory }) {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);
  const [active, setActive] = useState(null);

  useEffect(() => {
    api.get("/stories").then(({ data }) => setStories(data.stories));
  }, []);

  async function deleteStory(storyId) {
    await api.delete(`/stories/${storyId}`);
    setStories((items) => items.filter((story) => story._id !== storyId));
    toast.success("Story deleted");
  }

  return (
    <div className="px-2 pb-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">Recent updates</div>
        <button
          type="button"
          onClick={() => onNewStory?.()}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-black/5 dark:text-slate-200 dark:hover:bg-white/10"
          title="New story"
        >
          <Plus size={14} /> Add story
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {stories.map((story) => (
          <button
            key={story._id}
            onClick={() => setActive(story)}
            className="glass flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/10"
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-pink-400">
              {story.type === "video" ? (
                <video src={story.media?.url} className="h-full w-full object-cover" muted />
              ) : story.type === "image" ? (
                <img src={story.media?.url} className="h-full w-full object-cover" alt="" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-teal-500 text-white">{(story.author?.displayName || "S")[0]}</div>
              )}
              {story.author?._id === user._id && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteStory(story._id); }}
                  className="absolute right-0 top-0 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                  title="Delete story"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-slate-900 dark:text-white">{story.author?.displayName || "Story"}</div>
              <div className="truncate text-xs text-slate-500">{story.text || (story.type === "text" ? "Text status" : "Media status")}</div>
            </div>
          </button>
        ))}
        {stories.length === 0 && <div className="text-sm text-slate-500">No stories yet.</div>}
      </div>

      {active && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 p-4" onClick={() => setActive(null)}>
          <div className="glass w-full max-w-md overflow-hidden rounded-2xl shadow-glow" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-black/5 p-3 dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900 dark:text-white">{active.author?.displayName || "Story"}</p>
                <p className="truncate text-xs text-slate-500">@{active.author?.username}</p>
              </div>
              <button className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/10" onClick={() => setActive(null)}>Close</button>
            </div>
            {active.type === "text" ? (
              <div className="grid min-h-80 place-items-center p-6 text-center" style={{ background: active.background || "#ff5258" }}>
                <p className="text-lg font-semibold text-white">{active.text}</p>
              </div>
            ) : active.type === "video" ? (
              <video src={active.media?.url} className="max-h-[70vh] w-full bg-black object-contain" controls autoPlay />
            ) : (
              <img src={active.media?.url} className="max-h-[70vh] w-full bg-black object-contain" alt="" />
            )}
            {active.text && active.type !== "text" && <div className="p-3 text-sm text-slate-700 dark:text-slate-200">{active.text}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
