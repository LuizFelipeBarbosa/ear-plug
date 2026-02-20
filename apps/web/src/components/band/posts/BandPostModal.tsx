"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle, Send, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "../../../../../../convex/_generated/dataModel";

interface PostAuthor {
  _id: Id<"users">;
  name: string;
  avatar?: string;
}

interface PostCommentAuthor {
  _id: Id<"users">;
  name: string;
  avatar?: string;
}

interface PostCommentItem {
  _id: Id<"bandPostComments">;
  userId: Id<"users">;
  content: string;
  createdAt: number;
  author: PostCommentAuthor | null;
  canDelete: boolean;
}

interface BandPostModalPost {
  _id: Id<"bandPosts">;
  mediaType: "image" | "video";
  mediaUrl: string | null;
  caption?: string;
  createdAt: number;
  likeCount: number;
  commentCount: number;
  isLikedByCurrentUser: boolean;
  canDelete: boolean;
  author: PostAuthor | null;
}

interface BandPostModalProps {
  post: BandPostModalPost;
  comments: PostCommentItem[];
  commentsLoading: boolean;
  commentsLoadingMore: boolean;
  commentsDone: boolean;
  allowFanInteractions: boolean;
  onClose: () => void;
  onToggleLike: (postId: Id<"bandPosts">) => Promise<void>;
  onAddComment: (postId: Id<"bandPosts">, content: string) => Promise<void>;
  onDeleteComment: (commentId: Id<"bandPostComments">) => Promise<void>;
  onDeletePost: (postId: Id<"bandPosts">) => Promise<void>;
  onLoadMoreComments: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString();
}

export function BandPostModal({
  post,
  comments,
  commentsLoading,
  commentsLoadingMore,
  commentsDone,
  allowFanInteractions,
  onClose,
  onToggleLike,
  onAddComment,
  onDeleteComment,
  onDeletePost,
  onLoadMoreComments,
}: BandPostModalProps) {
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] =
    useState<Id<"bandPostComments"> | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleAddComment = async () => {
    const content = commentInput.trim();
    if (!content || isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);
    setError(null);
    try {
      await onAddComment(post._id, content);
      setCommentInput("");
    } catch (commentError) {
      const message =
        commentError instanceof Error ? commentError.message : "Failed to add comment";
      setError(message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: Id<"bandPostComments">) => {
    setDeletingCommentId(commentId);
    setError(null);
    try {
      await onDeleteComment(commentId);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Failed to delete comment";
      setError(message);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleDeletePost = async () => {
    setIsDeletingPost(true);
    setError(null);
    try {
      await onDeletePost(post._id);
      onClose();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Failed to delete post";
      setError(message);
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleToggleLike = async () => {
    if (!allowFanInteractions) {
      return;
    }
    setError(null);
    try {
      await onToggleLike(post._id);
    } catch (toggleError) {
      const message =
        toggleError instanceof Error ? toggleError.message : "Failed to update like";
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-6xl h-[92vh] bg-night-secondary border-2 border-zinc-800 overflow-hidden flex flex-col md:flex-row">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 z-20 p-2 bg-black/70 border border-zinc-700 text-zinc-300 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="md:flex-[3] bg-black flex items-center justify-center min-h-[38vh] md:min-h-full">
          {post.mediaUrl ? (
            post.mediaType === "image" ? (
              <img
                src={post.mediaUrl}
                alt="Band post media"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <video
                src={post.mediaUrl}
                controls
                autoPlay
                className="max-h-full max-w-full"
              />
            )
          ) : (
            <div className="text-zinc-500 text-sm uppercase tracking-wider">
              Media unavailable
            </div>
          )}
        </div>

        <div className="md:flex-[2] border-t-2 md:border-t-0 md:border-l-2 border-zinc-800 flex flex-col min-h-0">
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {post.author?.name || "Band member"}
              </p>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
            {post.canDelete ? (
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleDeletePost}
                className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1">
                  <Trash2 className="w-3 h-3" />
                  Delete
                </span>
              </button>
            ) : null}
          </div>

          <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-3">
            <button
              type="button"
              disabled={!allowFanInteractions}
              onClick={handleToggleLike}
              className={cn(
                "inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors",
                allowFanInteractions
                  ? post.isLikedByCurrentUser
                    ? "text-lime"
                    : "text-zinc-300 hover:text-lime"
                  : "text-zinc-500 cursor-not-allowed"
              )}
            >
              <Heart
                className={cn(
                  "w-4 h-4",
                  post.isLikedByCurrentUser && "fill-lime text-lime"
                )}
              />
              {post.likeCount}
            </button>
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <MessageCircle className="w-4 h-4" />
              {post.commentCount}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
            {post.caption ? (
              <div className="border border-zinc-800 bg-night-tertiary p-2.5">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap">
                  {post.caption}
                </p>
              </div>
            ) : null}

            {commentsLoading ? (
              <p className="text-sm text-zinc-500">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-sm text-zinc-500">No comments yet.</p>
            ) : (
              <>
                {comments.map((comment) => (
                  <div
                    key={comment._id}
                    className="border border-zinc-800 bg-night-tertiary p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400 truncate">
                        {comment.author?.name || "Listener"}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                          {formatRelativeTime(comment.createdAt)}
                        </span>
                        {comment.canDelete ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment._id)}
                            disabled={deletingCommentId === comment._id}
                            className="text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-200 whitespace-pre-wrap mt-1">
                      {comment.content}
                    </p>
                  </div>
                ))}
                {!commentsDone ? (
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={onLoadMoreComments}
                      disabled={commentsLoadingMore}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-700 text-zinc-300 hover:border-lime/50 hover:text-lime disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                    >
                      {commentsLoadingMore ? "Loading..." : "Load More Comments"}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div className="border-t border-zinc-800 p-3 space-y-2">
            {allowFanInteractions ? (
              <div className="flex items-center gap-2">
                <input
                  value={commentInput}
                  onChange={(event) => setCommentInput(event.target.value.slice(0, 500))}
                  placeholder="Write a comment..."
                  className="flex-1 bg-night-tertiary border border-zinc-800 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-lime/50"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={isSubmittingComment || commentInput.trim().length === 0}
                  className={cn(
                    "px-3 py-2 border-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1",
                    isSubmittingComment || commentInput.trim().length === 0
                      ? "border-zinc-700 text-zinc-500"
                      : "border-lime bg-lime text-night hover:bg-transparent hover:text-lime transition-colors"
                  )}
                >
                  <Send className="w-3.5 h-3.5" />
                  Post
                </button>
              </div>
            ) : (
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Interactions are disabled in this view.
              </p>
            )}
            {error ? <p className="text-xs text-red-400">{error}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
