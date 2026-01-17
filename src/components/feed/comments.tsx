"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  MessageCircle,
  MoreHorizontal,
  Flag,
  Trash2,
  Heart,
  Loader2,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

export interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  athlete: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  likeCount: number;
  isLikedByUser: boolean;
  isOwnComment: boolean;
  depth: number;
  replies: CommentData[];
}

interface CommentsProps {
  submissionId: string;
  initialComments?: CommentData[];
  totalCount?: number;
  maxDepth?: number;
  currentAthleteId?: string;
}

interface CommentItemProps {
  comment: CommentData;
  submissionId: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReport: (commentId: string) => Promise<void>;
  onLikeToggle: (commentId: string, isLiked: boolean) => Promise<void>;
  maxDepth: number;
  isLoading: boolean;
}

// ============================================
// COMMENT ITEM COMPONENT
// ============================================

function CommentItem({
  comment,
  submissionId,
  onReply,
  onDelete,
  onReport,
  onLikeToggle,
  maxDepth,
  isLoading,
}: CommentItemProps) {
  const [showReplies, setShowReplies] = useState(comment.replies.length <= 2);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(comment.likeCount);
  const [localIsLiked, setLocalIsLiked] = useState(comment.isLikedByUser);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canReply = comment.depth < maxDepth;

  // Focus textarea when replying
  useEffect(() => {
    if (isReplying && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isReplying]);

  // Get initials for avatar
  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    await onReply(comment.id, replyContent.trim());
    setReplyContent("");
    setIsReplying(false);
  };

  const handleLikeToggle = async () => {
    // Optimistic update
    setLocalIsLiked(!localIsLiked);
    setLocalLikeCount((prev) => prev + (localIsLiked ? -1 : 1));
    
    try {
      await onLikeToggle(comment.id, localIsLiked);
    } catch {
      // Revert on error
      setLocalIsLiked(localIsLiked);
      setLocalLikeCount(comment.likeCount);
    }
  };

  return (
    <div className={cn("py-3", comment.depth > 0 && "ml-8 border-l-2 border-muted pl-4")}>
      <div className="flex gap-3">
        <Link href={`/athletes/${comment.athlete.username}`}>
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.athlete.avatarUrl || undefined} alt={comment.athlete.displayName} />
            <AvatarFallback>{getInitials(comment.athlete.displayName)}</AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/athletes/${comment.athlete.username}`}
              className="font-medium text-sm hover:text-primary transition-colors"
            >
              @{comment.athlete.username}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
            </span>
          </div>

          {/* Content */}
          <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            {/* Like */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeToggle}
              className={cn(
                "h-7 px-2 gap-1 text-muted-foreground",
                localIsLiked && "text-red-500"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", localIsLiked && "fill-current")} />
              {localLikeCount > 0 && <span className="text-xs">{localLikeCount}</span>}
            </Button>

            {/* Reply */}
            {canReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsReplying(!isReplying)}
                className="h-7 px-2 gap-1 text-muted-foreground"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="text-xs">Reply</span>
              </Button>
            )}

            {/* More options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {comment.isOwnComment ? (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => onReport(comment.id)}>
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3 flex gap-2">
              <Textarea
                ref={textareaRef}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                className="min-h-[60px] text-sm resize-none"
                maxLength={2000}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.length > 2 && !showReplies && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplies(true)}
              className="text-xs text-muted-foreground ml-8"
            >
              <ChevronDown className="w-3 h-3 mr-1" />
              Show {comment.replies.length} replies
            </Button>
          )}

          {showReplies && (
            <>
              {comment.replies.length > 2 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReplies(false)}
                  className="text-xs text-muted-foreground ml-8 mb-2"
                >
                  <ChevronUp className="w-3 h-3 mr-1" />
                  Hide replies
                </Button>
              )}
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  submissionId={submissionId}
                  onReply={onReply}
                  onDelete={onDelete}
                  onReport={onReport}
                  onLikeToggle={onLikeToggle}
                  maxDepth={maxDepth}
                  isLoading={isLoading}
                />
              ))}
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your comment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(comment.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================
// MAIN COMMENTS COMPONENT
// ============================================

export function Comments({
  submissionId,
  initialComments = [],
  totalCount = 0,
  maxDepth = 3,
}: CommentsProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [isPending, startTransition] = useTransition();
  const [reportedCommentId, setReportedCommentId] = useState<string | null>(null);
  const [showReportSuccess, setShowReportSuccess] = useState(false);

  // Add new top-level comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/api/submissions/${submissionId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: newComment.trim() }),
        });

        if (!res.ok) throw new Error("Failed to post comment");

        const data = await res.json();
        setComments((prev) => [data.comment, ...prev]);
        setNewComment("");
      } catch (error) {
        console.error("Failed to add comment:", error);
      }
    });
  };

  // Add reply to existing comment
  const handleReply = async (parentId: string, content: string) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, parentId }),
      });

      if (!res.ok) throw new Error("Failed to post reply");

      const data = await res.json();

      // Add reply to the correct parent
      setComments((prev) => addReplyToComment(prev, parentId, data.comment));
    } catch (error) {
      console.error("Failed to add reply:", error);
    }
  };

  // Recursively add reply to correct parent
  const addReplyToComment = (
    comments: CommentData[],
    parentId: string,
    reply: CommentData
  ): CommentData[] => {
    return comments.map((comment) => {
      if (comment.id === parentId) {
        return { ...comment, replies: [...comment.replies, reply] };
      }
      if (comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, parentId, reply),
        };
      }
      return comment;
    });
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    try {
      const res = await fetch(
        `/api/submissions/${submissionId}/comments/${commentId}`,
        { method: "DELETE", credentials: "include" }
      );

      if (!res.ok) throw new Error("Failed to delete comment");

      // Remove comment from state
      setComments((prev) => removeComment(prev, commentId));
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  // Recursively remove comment
  const removeComment = (comments: CommentData[], commentId: string): CommentData[] => {
    return comments
      .filter((c) => c.id !== commentId)
      .map((c) => ({
        ...c,
        replies: removeComment(c.replies, commentId),
      }));
  };

  // Report comment
  const handleReport = async (commentId: string) => {
    setReportedCommentId(commentId);
  };

  const submitReport = async () => {
    if (!reportedCommentId) return;

    try {
      const res = await fetch(
        `/api/submissions/${submissionId}/comments/${reportedCommentId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ action: "report" }),
        }
      );

      if (!res.ok) throw new Error("Failed to report comment");

      setShowReportSuccess(true);
      setTimeout(() => setShowReportSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to report comment:", error);
    } finally {
      setReportedCommentId(null);
    }
  };

  // Toggle like on comment (using 🔥 as the default "like" emoji)
  const handleLikeToggle = async (commentId: string, currentlyLiked: boolean) => {
    const emoji = "🔥";
    
    if (currentlyLiked) {
      // DELETE requires emoji as query param
      const res = await fetch(
        `/api/submissions/${submissionId}/comments/${commentId}/reactions?emoji=${encodeURIComponent(emoji)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to remove like");
    } else {
      // POST requires emoji in body
      const res = await fetch(
        `/api/submissions/${submissionId}/comments/${commentId}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ emoji }),
        }
      );
      if (!res.ok) throw new Error("Failed to add like");
    }
  };

  return (
    <div className="space-y-4">
      {/* New Comment Form */}
      <div className="flex gap-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          className="min-h-[80px] resize-none"
          maxLength={2000}
        />
        <Button
          onClick={handleAddComment}
          disabled={!newComment.trim() || isPending}
          className="self-end"
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Character count */}
      {newComment.length > 1800 && (
        <p className="text-xs text-muted-foreground text-right">
          {newComment.length}/2000
        </p>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="divide-y">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              submissionId={submissionId}
              onReply={handleReply}
              onDelete={handleDelete}
              onReport={handleReport}
              onLikeToggle={handleLikeToggle}
              maxDepth={maxDepth}
              isLoading={isPending}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground py-8">
          No comments yet. Be the first to comment!
        </p>
      )}

      {/* Report Dialog */}
      <AlertDialog
        open={!!reportedCommentId}
        onOpenChange={(open) => !open && setReportedCommentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              If this comment violates our community guidelines, we&apos;ll review it
              and take appropriate action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitReport}>Report</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Success Toast */}
      {showReportSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in fade-in slide-in-from-bottom-2">
          Comment reported. Thank you!
        </div>
      )}
    </div>
  );
}
