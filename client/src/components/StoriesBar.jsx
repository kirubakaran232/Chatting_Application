import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function StoriesBar() {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);

  useEffect(() => {
    api.get("/stories").then(({ data }) => setStories(data.stories));
  }, []);

  async function deleteStory(storyId) {
    await api.delete(`/stories/${storyId}`);
    setStories((items) => items.filter((story) => story._id !== storyId));
    toast.success("Story deleted");
  }

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-black/5 px-3 py-2 dark:border-white/10 sm:gap-3 sm:px-4 sm:py-3">
      {stories.map((story) => (
        <div key={story._id} className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border-2 border-pink-400 sm:h-16 sm:w-16">
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
    </div>
  );
}
