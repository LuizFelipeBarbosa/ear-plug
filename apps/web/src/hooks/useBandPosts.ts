"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type {
  BandPostCommentFeedItem,
  BandPostFeedItem,
  BandPostMediaType,
} from "@ear-plug/shared/types";

interface CreateBandPostInput {
  file: File;
  mediaType: BandPostMediaType;
  caption?: string;
  durationSeconds?: number;
}

interface UploadResponseBody {
  storageId: string;
}

const POSTS_PAGE_SIZE = 12;
const COMMENTS_PAGE_SIZE = 20;

function mergePosts(
  existing: BandPostFeedItem[],
  incoming: BandPostFeedItem[]
): BandPostFeedItem[] {
  const byId = new Map<Id<"bandPosts">, BandPostFeedItem>();

  for (const post of existing) {
    byId.set(post._id as Id<"bandPosts">, post);
  }

  for (const post of incoming) {
    byId.set(post._id as Id<"bandPosts">, post);
  }

  return Array.from(byId.values()).sort((a, b) => b.createdAt - a.createdAt);
}

function mergeComments(
  existing: BandPostCommentFeedItem[],
  incoming: BandPostCommentFeedItem[]
): BandPostCommentFeedItem[] {
  const byId = new Map<Id<"bandPostComments">, BandPostCommentFeedItem>();

  for (const comment of existing) {
    byId.set(comment._id as Id<"bandPostComments">, comment);
  }

  for (const comment of incoming) {
    byId.set(comment._id as Id<"bandPostComments">, comment);
  }

  return Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function useBandPosts(bandId: Id<"bands"> | undefined) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [posts, setPosts] = useState<BandPostFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);

  const page = useQuery(
    api.bandPosts.listByBand,
    bandId
      ? {
          bandId,
          cursor,
          limit: POSTS_PAGE_SIZE,
        }
      : "skip"
  );

  const generateUploadUrl = useMutation(api.bandPosts.generateUploadUrl);
  const createPostMutation = useMutation(api.bandPosts.createPost);
  const deletePostMutation = useMutation(api.bandPosts.deletePost);
  const toggleLikeMutation = useMutation(api.bandPosts.toggleLike);
  const addCommentMutation = useMutation(api.bandPosts.addComment);
  const deleteCommentMutation = useMutation(api.bandPosts.deleteComment);

  useEffect(() => {
    setCursor(undefined);
    setPosts([]);
    setNextCursor(undefined);
    setDone(false);
  }, [bandId]);

  useEffect(() => {
    if (!page) {
      return;
    }

    setPosts((previous) =>
      cursor ? mergePosts(previous, page.posts as BandPostFeedItem[]) : (page.posts as BandPostFeedItem[])
    );
    setNextCursor(page.nextCursor);
    setDone(page.done);
  }, [page, cursor]);

  const refresh = useCallback(() => {
    setCursor(undefined);
    setPosts([]);
    setNextCursor(undefined);
    setDone(false);
  }, []);

  const createPost = useCallback(
    async (input: CreateBandPostInput) => {
      if (!bandId) {
        throw new Error("Band ID is required to create posts");
      }

      const { uploadUrl } = await generateUploadUrl({ bandId });
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: input.file.type ? { "Content-Type": input.file.type } : undefined,
        body: input.file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload media file");
      }

      const uploadData = (await uploadResponse.json()) as UploadResponseBody;
      if (!uploadData.storageId) {
        throw new Error("Upload did not return a valid storage ID");
      }

      const caption = input.caption?.trim();

      const result = await createPostMutation({
        bandId,
        storageId: uploadData.storageId as Id<"_storage">,
        mediaType: input.mediaType,
        caption: caption && caption.length > 0 ? caption : undefined,
        durationSeconds:
          input.mediaType === "video" ? input.durationSeconds : undefined,
      });

      refresh();
      return result;
    },
    [bandId, createPostMutation, generateUploadUrl, refresh]
  );

  const deletePost = useCallback(
    async (postId: Id<"bandPosts">) => {
      const result = await deletePostMutation({ postId });
      refresh();
      return result;
    },
    [deletePostMutation, refresh]
  );

  const isLoadingInitial = bandId !== undefined && page === undefined && posts.length === 0;
  const isLoadingMore = bandId !== undefined && cursor !== undefined && page === undefined;

  const loadMore = useCallback(() => {
    if (!nextCursor || done || isLoadingMore) {
      return;
    }
    setCursor(nextCursor);
  }, [nextCursor, done, isLoadingMore]);

  return {
    posts,
    isLoading: isLoadingInitial,
    isLoadingMore,
    nextCursor,
    done,
    loadMore,
    refresh,
    createPost,
    deletePost,
    toggleLike: (postId: Id<"bandPosts">) => toggleLikeMutation({ postId }),
    addComment: (postId: Id<"bandPosts">, content: string) =>
      addCommentMutation({ postId, content }),
    deleteComment: (commentId: Id<"bandPostComments">) =>
      deleteCommentMutation({ commentId }),
  };
}

export function useBandPostComments(postId: Id<"bandPosts"> | undefined) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [comments, setComments] = useState<BandPostCommentFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [done, setDone] = useState(false);

  const page = useQuery(
    api.bandPosts.listComments,
    postId
      ? {
          postId,
          cursor,
          limit: COMMENTS_PAGE_SIZE,
        }
      : "skip"
  );

  useEffect(() => {
    setCursor(undefined);
    setComments([]);
    setNextCursor(undefined);
    setDone(false);
  }, [postId]);

  useEffect(() => {
    if (!page) {
      return;
    }

    setComments((previous) =>
      cursor
        ? mergeComments(previous, page.comments as BandPostCommentFeedItem[])
        : (page.comments as BandPostCommentFeedItem[])
    );
    setNextCursor(page.nextCursor);
    setDone(page.done);
  }, [page, cursor]);

  const isLoadingInitial =
    postId !== undefined && page === undefined && comments.length === 0;
  const isLoadingMore = postId !== undefined && cursor !== undefined && page === undefined;

  const loadMore = useCallback(() => {
    if (!nextCursor || done || isLoadingMore) {
      return;
    }
    setCursor(nextCursor);
  }, [nextCursor, done, isLoadingMore]);

  const refresh = useCallback(() => {
    setCursor(undefined);
    setComments([]);
    setNextCursor(undefined);
    setDone(false);
  }, []);

  return useMemo(
    () => ({
      comments,
      isLoading: isLoadingInitial,
      isLoadingMore,
      nextCursor,
      done,
      loadMore,
      refresh,
    }),
    [comments, isLoadingInitial, isLoadingMore, nextCursor, done, loadMore, refresh]
  );
}
