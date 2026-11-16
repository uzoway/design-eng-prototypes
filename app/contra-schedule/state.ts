import { addDays, atTime } from "./schedule.ts";

export type Tag =
  | { kind: "tool"; label: string; icon: string }
  | { kind: "topic"; label: string }
  | { kind: "hashtag"; label: string };

export type PostImage = { src: string; width: number; height: number; alt: string };

export type Post = {
  id: string;
  text: string;
  tags: Tag[];
  image?: PostImage;
  /**
   * "scheduled" posts carry the time they go out. Nothing flips them to
   * "posted" when that time passes: what's live is worked out from the clock
   * (see isLive), so the feed and the queue can never disagree.
   */
  status: "posted" | "scheduled";
  /** When it was, or will be, posted. */
  at: number;
  likes: number;
  liked: boolean;
  replies: number;
  views: number;
};

export type State = { posts: Post[] };

export type Action =
  | { type: "add"; post: Post }
  | { type: "reschedule"; id: string; at: number }
  | { type: "post-now"; id: string; now: number }
  | { type: "delete"; id: string }
  | { type: "like"; id: string };

export function isLive(post: Post, now: number): boolean {
  return post.status === "posted" || post.at <= now;
}

/** For you: everything that's out, newest first. */
export function feedPosts(posts: Post[], now: number): Post[] {
  return posts.filter((post) => isLive(post, now)).sort((a, b) => b.at - a.at || (a.id < b.id ? 1 : -1));
}

/** The queue: everything still waiting, soonest first. */
export function queuedPosts(posts: Post[], now: number): Post[] {
  return posts.filter((post) => !isLive(post, now)).sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "add":
      // Undo puts a deleted post back; adding one that's still there changes nothing.
      return state.posts.some((post) => post.id === action.post.id)
        ? state
        : { posts: [...state.posts, action.post] };

    case "reschedule":
      return {
        posts: state.posts.map((post) =>
          post.id === action.id && post.status === "scheduled" ? { ...post, at: action.at } : post,
        ),
      };

    case "post-now":
      return {
        posts: state.posts.map((post) =>
          post.id === action.id && post.status === "scheduled" ? { ...post, status: "posted", at: action.now } : post,
        ),
      };

    case "delete":
      return { posts: state.posts.filter((post) => post.id !== action.id) };

    case "like":
      return {
        posts: state.posts.map((post) =>
          post.id === action.id
            ? { ...post, liked: !post.liked, likes: Math.max(0, post.likes + (post.liked ? -1 : 1)) }
            : post,
        ),
      };
  }
}

const ASSETS = "/contra-schedule";

/**
 * The owner's own posts. Times are relative to the moment the page opens, so
 * the queue always has something tomorrow morning.
 */
export function seed(now: number): State {
  return {
    posts: [
      {
        id: "seed-time-away",
        text: "The light mode of the GitHub Time away concept I prototyped a while back.\n\nYou can try it out here, in light or dark: https://uzookafor.com/time-away/",
        tags: [
          { kind: "tool", label: "GitHub", icon: `${ASSETS}/github.avif` },
          { kind: "topic", label: "Design Engineering" },
          { kind: "hashtag", label: "designengineer" },
        ],
        image: {
          src: `${ASSETS}/time-away.webp`,
          width: 1080,
          height: 1080,
          alt: "GitHub's contribution graph in light mode, with a run of weeks marked as time away.",
        },
        status: "posted",
        // Posted Nov 12, 2026. Before that date (a test clock, say) it's simply four days old.
        at: Math.min(new Date(2026, 10, 12, 10, 0).getTime(), now - 4 * 24 * 60 * 60 * 1000),
        likes: 2,
        liked: true,
        replies: 1,
        views: 93,
      },
      {
        id: "seed-bell",
        text: "The notification bell is my favourite from the LinkedIn nav icons I animated.\nBuilt with SVG and Motion.",
        tags: [
          { kind: "topic", label: "React" },
          { kind: "topic", label: "TypeScript" },
          { kind: "topic", label: "Design Engineering" },
        ],
        image: {
          src: `${ASSETS}/bell.webp`,
          width: 1080,
          height: 1350,
          alt: "LinkedIn's notification bell with a red badge showing 1, above the word Notifications.",
        },
        status: "scheduled",
        at: atTime(addDays(now, 1), 9).getTime(),
        likes: 0,
        liked: false,
        replies: 0,
        views: 0,
      },
      {
        id: "seed-batch",
        text: "Wrote all of this week's posts in one sitting on Sunday. Now they just go out on their own.",
        tags: [],
        status: "scheduled",
        at: atTime(addDays(now, 3), 12, 30).getTime(),
        likes: 0,
        liked: false,
        replies: 0,
        views: 0,
      },
    ],
  };
}

let serial = 0;

/** A post written in the composer. */
export function compose(text: string, at: number, status: Post["status"], image?: PostImage): Post {
  serial += 1;

  return {
    id: `post-${at}-${serial}`,
    text: text.trim(),
    tags: [],
    image,
    status,
    at,
    likes: 0,
    liked: false,
    replies: 0,
    views: 0,
  };
}
