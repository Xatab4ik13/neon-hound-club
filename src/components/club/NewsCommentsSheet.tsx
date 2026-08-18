// Комментарии под новостью. Использует тот же шит, что и лента Hellhound:
// стикеры, фото, ответы, реакции, лайки — один в один.

import { useMemo } from "react";
import {
  CommentsSheet,
  type CommentsStore,
} from "@/components/club/CommentsSheet";
import { initialsOf, makeSlug, type FeedComment, type FeedPost } from "@/data/feed-store";
import { useViewer } from "@/hooks/use-viewer";
import {
  useAddNewsComment,
  useDeleteNewsComment,
  useEditNewsComment,
  useNewsComments,
  useToggleNewsCommentLike,
  type NewsComment,
} from "@/lib/news-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  postId: string;
  commentsCount?: number;
};

const STICKER_PREFIX = "::sticker::";

function toFeedComment(c: NewsComment): FeedComment {
  const slug = makeSlug(c.nick) || c.authorId;
  const isBlogger = c.role === "blogger";
  const stickerUrl = c.text.startsWith(STICKER_PREFIX) ? c.text.slice(STICKER_PREFIX.length) : null;
  return {
    id: c.id,
    author: {
      id: c.authorId,
      slug,
      nick: c.nick,
      initials: initialsOf(c.nick),
      avatarUrl: c.avatarUrl ?? undefined,
      rankId: c.rankId,
      role: (c.role as "user" | "admin" | "blogger") ?? "user",
      isBlogger,
    },
    time: "",
    createdAt: c.createdAt,
    editedAt: c.editedAt ?? undefined,
    text: stickerUrl ? "" : c.text,
    kind: stickerUrl ? "sticker" : c.imageUrl ? "image" : "text",
    stickerId: stickerUrl ?? undefined,
    imageUrl: c.imageUrl ?? undefined,
    parentId: c.parentId ?? undefined,
    likes: c.likes,
    liked: c.liked,
    authorId: c.authorId,
    authorSlug: slug,
    isBlogger,
  };
}

export function NewsCommentsSheet({ open, onOpenChange, postId, commentsCount = 0 }: Props) {
  const viewer = useViewer();
  const isAdmin = viewer.user?.role === "admin";

  const listQ = useNewsComments(postId, open);
  const add = useAddNewsComment(postId);
  const edit = useEditNewsComment(postId);
  const del = useDeleteNewsComment(postId);
  const like = useToggleNewsCommentLike(postId);

  const comments = useMemo(() => (listQ.data ?? []).map(toFeedComment), [listQ.data]);

  const post = useMemo<FeedPost>(
    () => ({
      id: postId,
      author: {
        id: "news",
        slug: "hellhound",
        nick: "HELLHOUND",
        initials: "HH",
        rankId: "rookie",
        role: "admin",
        isBlogger: true,
      },
      time: "",
      text: "",
      likes: 0,
      liked: false,
      authorId: "news",
      authorSlug: "hellhound",
      isBlogger: true,
      comments,
      commentsCount: listQ.data ? comments.length : commentsCount,
      commentsFull: !!listQ.data,
    }),
    [postId, comments, commentsCount, listQ.data],
  );

  const store = useMemo<CommentsStore>(
    () => ({
      addComment: async (_postId, input) => {
        const text = input.stickerId
          ? `${STICKER_PREFIX}${input.stickerId}`
          : input.text?.trim() || (input.imageUrl ? "📷" : "");
        if (!text) return;
        await add.mutateAsync({
          text,
          parentId: input.parentId,
          imageUrl: input.imageUrl,
        });
      },
      editComment: async (_postId, commentId, text) => {
        await edit.mutateAsync({ commentId, text });
      },
      removeComment: async (_postId, commentId) => {
        await del.mutateAsync(commentId);
      },
      toggleCommentLike: (commentId, next) => {
        like.mutate({ commentId, next });
      },
    }),
    [add, edit, del, like],
  );

  return (
    <CommentsSheet
      open={open}
      onOpenChange={onOpenChange}
      post={post}
      moderate={isAdmin}
      store={store}
    />
  );
}
