/**
 * @fileoverview Convex queries and mutations for band media posts.
 * Supports upload, listing, likes, comments, and asynchronous cleanup on delete.
 * @module convex/bandPosts
 */

import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import {
  getBandMembership,
  requireAuthenticatedUser,
  requireBandRole,
} from "./utils/permissions";

const mediaTypeValidator = v.union(v.literal("image"), v.literal("video"));

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_MIME_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 90;
const MAX_CAPTION_LENGTH = 2200;
const MAX_COMMENT_LENGTH = 500;

const DEFAULT_POST_PAGE_SIZE = 12;
const MAX_POST_PAGE_SIZE = 36;
const DEFAULT_COMMENT_PAGE_SIZE = 20;
const MAX_COMMENT_PAGE_SIZE = 100;

const COMMENT_RATE_LIMIT_WINDOW_MS = 5_000;
const CLEANUP_PAGE_SIZE = 200;

function normalizePostLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_POST_PAGE_SIZE;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_POST_PAGE_SIZE);
}

function normalizeCommentLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_COMMENT_PAGE_SIZE;
  return Math.min(Math.max(1, Math.floor(limit)), MAX_COMMENT_PAGE_SIZE);
}

function isPostActive(post: Doc<"bandPosts">): boolean {
  return post.lifecycleStatus !== "deletion_queued";
}

function isPostQueuedForDeletion(post: Doc<"bandPosts">): boolean {
  return post.lifecycleStatus === "deletion_queued";
}

async function getBandPostWithPresentation(
  ctx: QueryCtx,
  post: Doc<"bandPosts">,
  likedPostIds: Set<Id<"bandPosts">>,
  canManageBand: boolean
) {
  const [author, mediaUrl] = await Promise.all([
    ctx.db.get(post.authorUserId),
    ctx.storage.getUrl(post.mediaStorageId),
  ]);

  return {
    ...post,
    mediaUrl,
    isLikedByCurrentUser: likedPostIds.has(post._id),
    canDelete: canManageBand,
    canManageComments: canManageBand,
    author: author
      ? {
          _id: author._id,
          name: author.name,
          avatar: author.avatar,
        }
      : null,
  };
}

async function listVisiblePostsPage(
  ctx: QueryCtx,
  bandId: Id<"bands">,
  cursor: string | null,
  limit: number
): Promise<{
  posts: Doc<"bandPosts">[];
  nextCursor?: string;
  done: boolean;
}> {
  const posts: Doc<"bandPosts">[] = [];
  let nextCursor = cursor;
  let done = false;

  while (posts.length < limit && !done) {
    const remaining = limit - posts.length;
    const page = await ctx.db
      .query("bandPosts")
      .withIndex("by_band_created", (q) => q.eq("bandId", bandId))
      .order("desc")
      .paginate({
        cursor: nextCursor,
        numItems: remaining,
      });

    for (const post of page.page) {
      if (isPostActive(post)) {
        posts.push(post);
      }
    }

    done = page.isDone;
    nextCursor = page.continueCursor;
  }

  return {
    posts,
    nextCursor: done ? undefined : (nextCursor ?? undefined),
    done,
  };
}

/**
 * Generates a short-lived upload URL for a band post media file.
 * Only band owners/admins can request upload URLs.
 */
export const generateUploadUrl = mutation({
  args: {
    bandId: v.id("bands"),
  },
  handler: async (ctx, args) => {
    await requireBandRole(ctx, args.bandId, ["owner", "admin"]);
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return { uploadUrl };
  },
});

/**
 * Creates a band post from an already uploaded storage object.
 */
export const createPost = mutation({
  args: {
    bandId: v.id("bands"),
    storageId: v.id("_storage"),
    mediaType: mediaTypeValidator,
    caption: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireBandRole(ctx, args.bandId, ["owner", "admin"]);

    const caption = args.caption?.trim();
    if (caption && caption.length > MAX_CAPTION_LENGTH) {
      throw new Error(`Caption must be ${MAX_CAPTION_LENGTH} characters or fewer`);
    }

    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata) {
      throw new Error("Uploaded media file not found");
    }

    const mimeType = metadata.contentType ?? "";
    if (!mimeType) {
      throw new Error("Uploaded media is missing a content type");
    }

    if (args.mediaType === "image") {
      if (!IMAGE_MIME_TYPES.has(mimeType)) {
        throw new Error("Unsupported image format. Use JPEG, PNG, or WEBP.");
      }
      if (metadata.size > MAX_IMAGE_SIZE_BYTES) {
        throw new Error("Image file exceeds the 10 MB size limit.");
      }
    }

    if (args.mediaType === "video") {
      if (!VIDEO_MIME_TYPES.has(mimeType)) {
        throw new Error("Unsupported video format. Use MP4, WEBM, or MOV.");
      }
      if (metadata.size > MAX_VIDEO_SIZE_BYTES) {
        throw new Error("Video file exceeds the 150 MB size limit.");
      }
      if (
        args.durationSeconds === undefined ||
        args.durationSeconds <= 0 ||
        args.durationSeconds > MAX_VIDEO_DURATION_SECONDS
      ) {
        throw new Error("Video duration must be greater than 0 and at most 90 seconds.");
      }
    }

    const postId = await ctx.db.insert("bandPosts", {
      bandId: args.bandId,
      authorUserId: user._id,
      mediaStorageId: args.storageId,
      mediaType: args.mediaType,
      caption: caption && caption.length > 0 ? caption : undefined,
      mimeType,
      fileSizeBytes: metadata.size,
      durationSeconds: args.mediaType === "video" ? args.durationSeconds : undefined,
      likeCount: 0,
      commentCount: 0,
      lifecycleStatus: "active",
      createdAt: Date.now(),
    });

    return { postId };
  },
});

/**
 * Queues a post for deletion and schedules asynchronous cleanup.
 */
export const deletePost = mutation({
  args: {
    postId: v.id("bandPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const { user } = await requireBandRole(ctx, post.bandId, ["owner", "admin"]);

    if (isPostQueuedForDeletion(post)) {
      return { status: "queued" as const, postId: post._id };
    }

    await ctx.db.patch(post._id, {
      lifecycleStatus: "deletion_queued",
      deletedAt: Date.now(),
      deletedByUserId: user._id,
    });

    await ctx.scheduler.runAfter(0, internal.bandPosts.cleanupPostLikesPage, {
      postId: post._id,
    });

    return { status: "queued" as const, postId: post._id };
  },
});

/**
 * Lists posts for a band newest first with cursor pagination.
 */
export const listByBand = query({
  args: {
    bandId: v.id("bands"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const limit = normalizePostLimit(args.limit);

    const [page, membership] = await Promise.all([
      listVisiblePostsPage(ctx, args.bandId, args.cursor ?? null, limit),
      getBandMembership(ctx, args.bandId, user._id),
    ]);

    const likedPostIds = new Set<Id<"bandPosts">>();
    await Promise.all(
      page.posts.map(async (post) => {
        const like = await ctx.db
          .query("bandPostLikes")
          .withIndex("by_user_post", (q) =>
            q.eq("userId", user._id).eq("postId", post._id)
          )
          .unique();

        if (like) {
          likedPostIds.add(post._id);
        }
      })
    );

    const canManageBand =
      membership?.role === "owner" || membership?.role === "admin";

    const posts = await Promise.all(
      page.posts.map((post) =>
        getBandPostWithPresentation(ctx, post, likedPostIds, canManageBand)
      )
    );

    return {
      posts,
      nextCursor: page.nextCursor,
      done: page.done,
    };
  },
});

/**
 * Likes/unlikes a post for the current user.
 */
export const toggleLike = mutation({
  args: {
    postId: v.id("bandPosts"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const post = await ctx.db.get(args.postId);
    if (!post || !isPostActive(post)) {
      throw new Error("Post not found");
    }

    const existingLike = await ctx.db
      .query("bandPostLikes")
      .withIndex("by_user_post", (q) =>
        q.eq("userId", user._id).eq("postId", args.postId)
      )
      .unique();

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(post._id, {
        likeCount: Math.max(0, post.likeCount - 1),
      });
      return { action: "unliked" as const };
    }

    await ctx.db.insert("bandPostLikes", {
      postId: post._id,
      userId: user._id,
      createdAt: Date.now(),
    });

    await ctx.db.patch(post._id, {
      likeCount: post.likeCount + 1,
    });

    return { action: "liked" as const };
  },
});

/**
 * Lists comments for a post oldest first with cursor pagination.
 */
export const listComments = query({
  args: {
    postId: v.id("bandPosts"),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const limit = normalizeCommentLimit(args.limit);

    const post = await ctx.db.get(args.postId);
    if (!post || !isPostActive(post)) {
      throw new Error("Post not found");
    }

    const [page, membership] = await Promise.all([
      ctx.db
        .query("bandPostComments")
        .withIndex("by_post_created", (q) => q.eq("postId", args.postId))
        .order("asc")
        .paginate({
          cursor: args.cursor ?? null,
          numItems: limit,
        }),
      getBandMembership(ctx, post.bandId, user._id),
    ]);

    const canManageBandComments =
      membership?.role === "owner" || membership?.role === "admin";

    const comments = await Promise.all(
      page.page.map(async (comment) => {
        const author = await ctx.db.get(comment.userId);
        return {
          ...comment,
          author: author
            ? {
                _id: author._id,
                name: author.name,
                avatar: author.avatar,
              }
            : null,
          canDelete: canManageBandComments || comment.userId === user._id,
        };
      })
    );

    return {
      comments,
      nextCursor: page.isDone ? undefined : (page.continueCursor ?? undefined),
      done: page.isDone,
    };
  },
});

/**
 * Adds a comment to a post.
 */
export const addComment = mutation({
  args: {
    postId: v.id("bandPosts"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const content = args.content.trim();
    if (content.length < 1 || content.length > MAX_COMMENT_LENGTH) {
      throw new Error(`Comment must be between 1 and ${MAX_COMMENT_LENGTH} characters`);
    }

    const post = await ctx.db.get(args.postId);
    if (!post || !isPostActive(post)) {
      throw new Error("Post not found");
    }

    const now = Date.now();
    const latestCommentByUser = await ctx.db
      .query("bandPostComments")
      .withIndex("by_post_user_created", (q) =>
        q.eq("postId", args.postId).eq("userId", user._id)
      )
      .order("desc")
      .first();

    if (
      latestCommentByUser &&
      now - latestCommentByUser.createdAt < COMMENT_RATE_LIMIT_WINDOW_MS
    ) {
      throw new Error("You're commenting too quickly. Please wait a few seconds.");
    }

    const commentId = await ctx.db.insert("bandPostComments", {
      postId: post._id,
      userId: user._id,
      content,
      createdAt: now,
    });

    await ctx.db.patch(post._id, {
      commentCount: post.commentCount + 1,
    });

    return { commentId };
  },
});

/**
 * Deletes a comment if user owns it or can moderate the band's posts.
 */
export const deleteComment = mutation({
  args: {
    commentId: v.id("bandPostComments"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    const post = await ctx.db.get(comment.postId);
    const isAuthor = comment.userId === user._id;

    let canModerate = false;
    if (post) {
      const membership = await getBandMembership(ctx, post.bandId, user._id);
      canModerate = membership?.role === "owner" || membership?.role === "admin";
    }

    if (!isAuthor && !canModerate) {
      throw new Error("Not authorized to delete this comment");
    }

    await ctx.db.delete(comment._id);

    if (post && isPostActive(post)) {
      await ctx.db.patch(post._id, {
        commentCount: Math.max(0, post.commentCount - 1),
      });
    }

    return { deleted: true };
  },
});

/**
 * Internal cleanup: delete likes for a queued post in paginated batches.
 */
export const cleanupPostLikesPage = internalMutation({
  args: {
    postId: v.id("bandPosts"),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || !isPostQueuedForDeletion(post)) {
      return { done: true };
    }

    const page = await ctx.db
      .query("bandPostLikes")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: CLEANUP_PAGE_SIZE,
      });

    for (const like of page.page) {
      await ctx.db.delete(like._id);
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.bandPosts.cleanupPostLikesPage, {
        postId: args.postId,
        cursor: page.continueCursor ?? undefined,
      });
      return {
        done: false,
        nextCursor: page.continueCursor ?? undefined,
      };
    }

    await ctx.scheduler.runAfter(0, internal.bandPosts.cleanupPostCommentsPage, {
      postId: args.postId,
    });

    return { done: true };
  },
});

/**
 * Internal cleanup: delete comments for a queued post in paginated batches.
 */
export const cleanupPostCommentsPage = internalMutation({
  args: {
    postId: v.id("bandPosts"),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || !isPostQueuedForDeletion(post)) {
      return { done: true };
    }

    const page = await ctx.db
      .query("bandPostComments")
      .withIndex("by_post_created", (q) => q.eq("postId", args.postId))
      .order("asc")
      .paginate({
        cursor: args.cursor ?? null,
        numItems: CLEANUP_PAGE_SIZE,
      });

    for (const comment of page.page) {
      await ctx.db.delete(comment._id);
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.bandPosts.cleanupPostCommentsPage, {
        postId: args.postId,
        cursor: page.continueCursor ?? undefined,
      });
      return {
        done: false,
        nextCursor: page.continueCursor ?? undefined,
      };
    }

    await ctx.scheduler.runAfter(0, internal.bandPosts.finalizeDeletedPost, {
      postId: args.postId,
    });

    return { done: true };
  },
});

/**
 * Internal cleanup: delete storage object and post document after relations are cleared.
 */
export const finalizeDeletedPost = internalMutation({
  args: {
    postId: v.id("bandPosts"),
  },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) {
      return { deleted: true };
    }

    if (!isPostQueuedForDeletion(post)) {
      return { deleted: false };
    }

    const [remainingLike, remainingComment] = await Promise.all([
      ctx.db
        .query("bandPostLikes")
        .withIndex("by_post", (q) => q.eq("postId", args.postId))
        .first(),
      ctx.db
        .query("bandPostComments")
        .withIndex("by_post_created", (q) => q.eq("postId", args.postId))
        .first(),
    ]);

    if (remainingLike) {
      await ctx.scheduler.runAfter(0, internal.bandPosts.cleanupPostLikesPage, {
        postId: args.postId,
      });
      return { deleted: false, rescheduled: true };
    }

    if (remainingComment) {
      await ctx.scheduler.runAfter(0, internal.bandPosts.cleanupPostCommentsPage, {
        postId: args.postId,
      });
      return { deleted: false, rescheduled: true };
    }

    try {
      await ctx.storage.delete(post.mediaStorageId);
    } catch {
      // If storage object is already missing, continue finalization.
    }

    await ctx.db.delete(post._id);

    return { deleted: true };
  },
});
