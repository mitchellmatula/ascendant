import { db } from "./db";
import { NotificationType } from "../../prisma/generated/prisma/client";

// ============================================
// NOTIFICATION CREATION HELPERS
// ============================================

interface CreateNotificationParams {
  athleteId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  actorId?: string;
  actorUsername?: string;
  actorAvatar?: string;
  submissionId?: string;
  commentId?: string;
}

/**
 * Create a notification for an athlete
 */
export async function createNotification(params: CreateNotificationParams) {
  return db.notification.create({
    data: {
      athleteId: params.athleteId,
      type: params.type,
      title: params.title,
      body: params.body,
      linkUrl: params.linkUrl,
      actorId: params.actorId,
      actorUsername: params.actorUsername,
      actorAvatar: params.actorAvatar,
      submissionId: params.submissionId,
      commentId: params.commentId,
    },
  });
}

/**
 * Create multiple notifications at once (e.g., notifying all followers)
 */
export async function createNotifications(
  notifications: CreateNotificationParams[]
) {
  return db.notification.createMany({
    data: notifications.map((n) => ({
      athleteId: n.athleteId,
      type: n.type,
      title: n.title,
      body: n.body,
      linkUrl: n.linkUrl,
      actorId: n.actorId,
      actorUsername: n.actorUsername,
      actorAvatar: n.actorAvatar,
      submissionId: n.submissionId,
      commentId: n.commentId,
    })),
  });
}

// ============================================
// SPECIFIC NOTIFICATION TYPES
// ============================================

interface ActorInfo {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

/**
 * Notify someone that they have a new follower
 */
export async function notifyNewFollower(
  targetAthleteId: string,
  actor: ActorInfo
) {
  return createNotification({
    athleteId: targetAthleteId,
    type: "FOLLOW",
    title: "New follower!",
    body: `@${actor.username} started following you`,
    linkUrl: `/athletes/${actor.username}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorAvatar: actor.avatarUrl ?? undefined,
  });
}

/**
 * Notify submission owner of a new reaction
 */
export async function notifyReaction(
  submissionOwnerId: string,
  actor: ActorInfo,
  emoji: string,
  submissionId: string,
  challengeSlug: string
) {
  // Don't notify if reacting to own submission
  if (submissionOwnerId === actor.id) return;

  return createNotification({
    athleteId: submissionOwnerId,
    type: "REACTION",
    title: `${emoji} New reaction!`,
    body: `@${actor.username} reacted to your submission`,
    linkUrl: `/challenges/${challengeSlug}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorAvatar: actor.avatarUrl ?? undefined,
    submissionId,
  });
}

/**
 * Notify submission owner of a new comment
 */
export async function notifyComment(
  submissionOwnerId: string,
  actor: ActorInfo,
  submissionId: string,
  challengeSlug: string,
  commentPreview: string
) {
  // Don't notify if commenting on own submission
  if (submissionOwnerId === actor.id) return;

  return createNotification({
    athleteId: submissionOwnerId,
    type: "COMMENT",
    title: "New comment!",
    body: `@${actor.username}: ${commentPreview.slice(0, 100)}${commentPreview.length > 100 ? "..." : ""}`,
    linkUrl: `/challenges/${challengeSlug}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorAvatar: actor.avatarUrl ?? undefined,
    submissionId,
  });
}

/**
 * Notify comment author of a reply
 */
export async function notifyCommentReply(
  commentOwnerId: string,
  actor: ActorInfo,
  submissionId: string,
  commentId: string,
  challengeSlug: string,
  replyPreview: string
) {
  // Don't notify if replying to own comment
  if (commentOwnerId === actor.id) return;

  return createNotification({
    athleteId: commentOwnerId,
    type: "COMMENT_REPLY",
    title: "New reply!",
    body: `@${actor.username}: ${replyPreview.slice(0, 100)}${replyPreview.length > 100 ? "..." : ""}`,
    linkUrl: `/challenges/${challengeSlug}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorAvatar: actor.avatarUrl ?? undefined,
    submissionId,
    commentId,
  });
}

/**
 * Notify comment author of a like on their comment
 */
export async function notifyCommentLike(
  commentOwnerId: string,
  actor: ActorInfo,
  commentId: string,
  challengeSlug: string
) {
  // Don't notify if liking own comment
  if (commentOwnerId === actor.id) return;

  return createNotification({
    athleteId: commentOwnerId,
    type: "COMMENT_LIKE",
    title: "Someone liked your comment!",
    body: `@${actor.username} liked your comment`,
    linkUrl: `/challenges/${challengeSlug}`,
    actorId: actor.id,
    actorUsername: actor.username,
    actorAvatar: actor.avatarUrl ?? undefined,
    commentId,
  });
}

/**
 * Notify athlete of a level up
 */
export async function notifyLevelUp(
  athleteId: string,
  domainName: string,
  newLetter: string,
  newSublevel: number,
  xpGained: number
) {
  return createNotification({
    athleteId,
    type: "LEVEL_UP",
    title: `🎉 Level up in ${domainName}!`,
    body: `You reached ${newLetter}${newSublevel}! (+${xpGained} XP)`,
    linkUrl: `/dashboard`,
  });
}

/**
 * Notify athlete of a training activity sync
 */
export async function notifyTrainingSync(
  athleteId: string,
  activityType: string,
  xpGained: number,
  domainName: string
) {
  return createNotification({
    athleteId,
    type: "TRAINING_SYNC",
    title: `🏃 ${activityType} synced!`,
    body: `+${xpGained} XP to ${domainName}`,
    linkUrl: `/dashboard`,
  });
}

/**
 * Notify athlete that their submission was approved
 */
export async function notifySubmissionApproved(
  athleteId: string,
  challengeName: string,
  challengeSlug: string,
  submissionId: string,
  xpAwarded: number
) {
  return createNotification({
    athleteId,
    type: "SUBMISSION_APPROVED",
    title: "✅ Submission approved!",
    body: `Your ${challengeName} submission was approved! +${xpAwarded} XP`,
    linkUrl: `/challenges/${challengeSlug}`,
    submissionId,
  });
}

/**
 * Notify athlete that their submission was rejected
 */
export async function notifySubmissionRejected(
  athleteId: string,
  challengeName: string,
  challengeSlug: string,
  submissionId: string,
  reason?: string
) {
  return createNotification({
    athleteId,
    type: "SUBMISSION_REJECTED",
    title: "❌ Submission needs revision",
    body: reason
      ? `Your ${challengeName} submission: ${reason.slice(0, 100)}`
      : `Your ${challengeName} submission needs revision`,
    linkUrl: `/challenges/${challengeSlug}`,
    submissionId,
  });
}

// ============================================
// NOTIFICATION QUERIES
// ============================================

/**
 * Get notifications for an athlete with pagination
 */
export async function getNotifications(
  athleteId: string,
  options?: {
    limit?: number;
    cursor?: string;
    unreadOnly?: boolean;
  }
) {
  const { limit = 20, cursor, unreadOnly = false } = options ?? {};

  const notifications = await db.notification.findMany({
    where: {
      athleteId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = notifications.length > limit;
  const items = hasMore ? notifications.slice(0, -1) : notifications;

  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
  };
}

/**
 * Get unread notification count for an athlete
 */
export async function getUnreadCount(athleteId: string) {
  return db.notification.count({
    where: {
      athleteId,
      isRead: false,
    },
  });
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, athleteId: string) {
  return db.notification.updateMany({
    where: {
      id: notificationId,
      athleteId, // Ensure user owns this notification
    },
    data: { isRead: true },
  });
}

/**
 * Mark all notifications as read for an athlete
 */
export async function markAllAsRead(athleteId: string) {
  return db.notification.updateMany({
    where: {
      athleteId,
      isRead: false,
    },
    data: { isRead: true },
  });
}

/**
 * Delete old notifications (cleanup job)
 */
export async function deleteOldNotifications(daysOld: number = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  return db.notification.deleteMany({
    where: {
      createdAt: { lt: cutoff },
      isRead: true, // Only delete read notifications
    },
  });
}
