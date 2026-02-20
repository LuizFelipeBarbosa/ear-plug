"use client";

import { useState } from "react";
import { Heart, MessageCircle, Play, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";

interface BandPostGridItem {
  _id: Id<"bandPosts">;
  mediaType: "image" | "video";
  mediaUrl: string | null;
  likeCount: number;
  commentCount: number;
  canDelete: boolean;
}

interface BandPostGridProps {
  posts: BandPostGridItem[];
  onSelect: (postId: Id<"bandPosts">) => void;
  onDelete: (postId: Id<"bandPosts">) => Promise<void>;
}

export function BandPostGrid({ posts, onSelect, onDelete }: BandPostGridProps) {
  const [deletingPostId, setDeletingPostId] = useState<Id<"bandPosts"> | null>(
    null
  );

  const handleDelete = async (postId: Id<"bandPosts">) => {
    setDeletingPostId(postId);
    try {
      await onDelete(postId);
    } finally {
      setDeletingPostId(null);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="h-52 border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-500 text-sm">
        No posts yet
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {posts.map((post) => (
        <div
          key={post._id}
          className="relative aspect-square bg-night-tertiary border border-zinc-800 overflow-hidden group"
        >
          <button
            type="button"
            onClick={() => onSelect(post._id)}
            className="w-full h-full"
          >
            {post.mediaUrl ? (
              post.mediaType === "image" ? (
                <img
                  src={post.mediaUrl}
                  alt="Band post"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={post.mediaUrl}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
              )
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs uppercase tracking-wider">
                Media unavailable
              </div>
            )}
          </button>

          <div className="absolute inset-x-0 bottom-0 bg-black/65 px-2 py-1 flex items-center justify-between text-[10px] text-white">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {post.likeCount}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {post.commentCount}
            </span>
          </div>

          {post.canDelete ? (
            <button
              type="button"
              onClick={() => handleDelete(post._id)}
              disabled={deletingPostId === post._id}
              className={cn(
                "absolute top-1.5 right-1.5 p-1.5 bg-black/70 border border-zinc-700 transition-opacity",
                "opacity-0 group-hover:opacity-100 text-zinc-200 hover:text-red-400 hover:border-red-500/40",
                deletingPostId === post._id && "opacity-100"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
