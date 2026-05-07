import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function StoriesBar() {
  const { user } = useAuth();
  const [stories, setStories] = useState([]);

  useEffect(() => {
    api.get("/stories").then(({ data }) => setStories(data.stories));
  }, []);

  async function createTextStory() {
    const text = prompt("Story text");
    if (!text) return;
    const { data } = await api.post("/stories", { type: "text", text, background: "#14b8a6" });
    setStories((items) => [data.story, ...items]);
  }

  return (
    <div className="flex gap-3 overflow-x-auto border-b border-black/5 px-4 py-3 dark:border-white/10">
      <button onClick={createTextStory} className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-teal-500 text-white">
        <Plus size={22} />
      </button>
      {stories.map((story) => (
        <button key={story._id} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 border-pink-400">
          {story.type === "text" ? (
            <span className="grid h-full place-items-center bg-teal-500 px-1 text-xs font-semibold text-white">{story.text}</span>
          ) : (
            <img src={story.media?.url} className="h-full w-full object-cover" alt="" />
          )}
          {story.author?._id === user._id && <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-white" />}
        </button>
      ))}
    </div>
  );
}
