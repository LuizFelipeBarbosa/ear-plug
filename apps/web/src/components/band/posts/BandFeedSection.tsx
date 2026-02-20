"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/hooks/useUser";
import { useBandPostComments, useBandPosts } from "@/hooks/useBandPosts";
import { BandPostComposer } from "./BandPostComposer";
import { BandPostGrid } from "./BandPostGrid";
import { BandPostModal } from "./BandPostModal";
import type { Id } from "../../../../../../convex/_generated/dataModel";

interface BandFeedSectionProps {
  bandId: Id<"bands">;
  canManagePosts: boolean;
  allowFanInteractions: boolean;
  title?: string;
  description?: string;
}

type FeedPost = {
  _id: Id<"bandPosts">;
  mediaType: "image" | "video";
  mediaUrl: string | null;
  caption?: string;
  createdAt: number;
  likeCount: number;
  commentCount: number;
  isLikedByCurrentUser: boolean;
  canDelete: boolean;
  canManageComments: boolean;
  author: {
    _id: Id<"users">;
    name: string;
    avatar?: string;
  } | null;
};

type FeedComment = {
  _id: Id<"bandPostComments">;
  userId: Id<"users">;
  postId?: Id<"bandPosts">;
  _creationTime?: number;
  content: string;
  createdAt: number;
  author: {
    _id: Id<"users">;
    name: string;
    avatar?: string;
  } | null;
  canDelete: boolean;
};

export function BandFeedSection({
  bandId,
  canManagePosts,
  allowFanInteractions,
  title = "Photos & Videos",
  description,
}: BandFeedSectionProps) {
  const { user } = useCurrentUser();
  const {
    posts,
    isLoading,
    isLoadingMore: isLoadingMorePosts,
    done: postsDone,
    loadMore: loadMorePosts,
    createPost,
    deletePost,
    toggleLike,
    addComment,
    deleteComment,
  } = useBandPosts(bandId);

  const [selectedPostId, setSelectedPostId] = useState<Id<"bandPosts"> | null>(
    null
  );
  const [optimisticPosts, setOptimisticPosts] = useState<FeedPost[] | null>(
    null
  );
  const [optimisticComments, setOptimisticComments] = useState<FeedComment[] | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const displayedPosts = useMemo(
    () => (optimisticPosts ?? (posts as unknown as FeedPost[])),
    [optimisticPosts, posts]
  );

  const {
    comments,
    isLoading: isCommentsLoading,
    isLoadingMore: isLoadingMoreComments,
    done: commentsDone,
    loadMore: loadMoreComments,
  } = useBandPostComments(selectedPostId ?? undefined);
  const displayedComments = (optimisticComments ??
    (comments as unknown as FeedComment[])) as FeedComment[];

  useEffect(() => {
    setOptimisticPosts(null);
  }, [posts]);

  useEffect(() => {
    setOptimisticComments(null);
  }, [comments]);

  useEffect(() => {
    if (!selectedPostId) {
      return;
    }
    const exists = displayedPosts.some((post) => post._id === selectedPostId);
    if (!exists) {
      setSelectedPostId(null);
    }
  }, [selectedPostId, displayedPosts]);

  useEffect(() => {
    setError(null);
  }, [selectedPostId]);

  const selectedPost =
    selectedPostId === null
      ? null
      : displayedPosts.find((post) => post._id === selectedPostId) ?? null;

  const applyPostPatch = (
    postId: Id<"bandPosts">,
    patch: (post: FeedPost) => FeedPost
  ) => {
    setOptimisticPosts((previous) => {
      const source = previous ?? (posts as unknown as FeedPost[]);
      return source.map((post) => (post._id === postId ? patch(post) : post));
    });
  };

  const handleCreatePost = async (input: {
    file: File;
    mediaType: "image" | "video";
    caption?: string;
    durationSeconds?: number;
  }) => {
    setError(null);
    try {
      await createPost(input);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Failed to publish post";
      setError(message);
      throw createError;
    }
  };

  const handleDeletePost = async (postId: Id<"bandPosts">) => {
    const snapshot = [...displayedPosts];
    setOptimisticPosts(displayedPosts.filter((post) => post._id !== postId));
    setError(null);
    try {
      await deletePost(postId);
      if (selectedPostId === postId) {
        setSelectedPostId(null);
      }
    } catch (deleteError) {
      setOptimisticPosts(snapshot);
      const message =
        deleteError instanceof Error ? deleteError.message : "Failed to delete post";
      setError(message);
      throw deleteError;
    }
  };

  const handleToggleLike = async (postId: Id<"bandPosts">) => {
    const snapshot = [...displayedPosts];
    applyPostPatch(postId, (post) => {
      const nextLiked = !post.isLikedByCurrentUser;
      return {
        ...post,
        isLikedByCurrentUser: nextLiked,
        likeCount: Math.max(0, post.likeCount + (nextLiked ? 1 : -1)),
      };
    });
    setError(null);
    try {
      await toggleLike(postId);
    } catch (toggleError) {
      setOptimisticPosts(snapshot);
      const message =
        toggleError instanceof Error ? toggleError.message : "Failed to update like";
      setError(message);
      throw toggleError;
    }
  };

  const handleAddComment = async (postId: Id<"bandPosts">, content: string) => {
    const snapshotPosts = [...displayedPosts];
    const snapshotComments = [...displayedComments];

    const tempComment: FeedComment = {
      _id: `temp-${Date.now()}` as Id<"bandPostComments">,
      userId: (user?._id ?? "temp-user") as Id<"users">,
      content,
      createdAt: Date.now(),
      author: user
        ? {
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
          }
        : null,
      canDelete: true,
    };

    applyPostPatch(postId, (post) => ({
      ...post,
      commentCount: post.commentCount + 1,
    }));
    setOptimisticComments([...displayedComments, tempComment]);

    setError(null);
    try {
      await addComment(postId, content);
    } catch (commentError) {
      setOptimisticPosts(snapshotPosts);
      setOptimisticComments(snapshotComments);
      const message =
        commentError instanceof Error ? commentError.message : "Failed to add comment";
      setError(message);
      throw commentError;
    }
  };

  const handleDeleteComment = async (commentId: Id<"bandPostComments">) => {
    if (!selectedPostId) {
      return;
    }

    const snapshotPosts = [...displayedPosts];
    const snapshotComments = [...displayedComments];

    applyPostPatch(selectedPostId, (post) => ({
      ...post,
      commentCount: Math.max(0, post.commentCount - 1),
    }));
    setOptimisticComments(
      displayedComments.filter((comment) => comment._id !== commentId)
    );

    setError(null);
    try {
      await deleteComment(commentId);
    } catch (deleteError) {
      setOptimisticPosts(snapshotPosts);
      setOptimisticComments(snapshotComments);
      const message =
        deleteError instanceof Error ? deleteError.message : "Failed to delete comment";
      setError(message);
      throw deleteError;
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
          {title}
        </h3>
        {description ? (
          <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
            {description}
          </p>
        ) : null}
      </div>

      {canManagePosts ? <BandPostComposer onSubmit={handleCreatePost} /> : null}

      {error ? (
        <p className="text-xs text-red-400 border border-red-500/30 bg-red-500/10 px-3 py-2">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-square bg-night-tertiary border border-zinc-800 animate-shimmer"
            />
          ))}
        </div>
      ) : (
        <BandPostGrid
          posts={displayedPosts}
          onSelect={setSelectedPostId}
          onDelete={handleDeletePost}
        />
      )}

      {!isLoading && !postsDone ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={loadMorePosts}
            disabled={isLoadingMorePosts}
            className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider border border-zinc-700 text-zinc-300 hover:border-lime/50 hover:text-lime disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingMorePosts ? "Loading..." : "Load More Posts"}
          </button>
        </div>
      ) : null}

      {selectedPost ? (
        <BandPostModal
          post={selectedPost}
          comments={displayedComments}
          commentsLoading={isCommentsLoading}
          commentsLoadingMore={isLoadingMoreComments}
          commentsDone={commentsDone}
          allowFanInteractions={allowFanInteractions}
          onClose={() => setSelectedPostId(null)}
          onToggleLike={handleToggleLike}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          onDeletePost={handleDeletePost}
          onLoadMoreComments={loadMoreComments}
        />
      ) : null}
    </section>
  );
}
