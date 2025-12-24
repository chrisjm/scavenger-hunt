// ABOUTME: Shared submission shapes for feed components, including reaction summaries.
// ABOUTME: Keeps frontend reaction typing consistent across pages and components.

export interface ReactorSample {
  userId: string;
  displayName: string;
  reactedAt: string | number | Date | null;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  viewerHasReacted: boolean;
  sampleReactors: ReactorSample[];
}

export interface ReactionDetailEntry {
  emoji: string;
  count: number;
  viewerHasReacted: boolean;
  reactors: ReactorSample[];
}

export interface SubmissionListItem {
  id: string;
  userId?: string;
  userName: string;
  taskDescription: string;
  imagePath: string;
  valid: boolean;
  aiReasoning: string;
  aiConfidence: number;
  submittedAt: string;
  taskId: number;
  groupId?: string;
  photoId?: string;
  reactions: ReactionSummary[];
  viewerReactionEmojis: string[];
  availableReactionEmojis: string[];
}

export interface ReactionDetailSubmission {
  id: string;
  userId?: string;
  userName: string;
  taskDescription: string;
  imagePath: string;
  valid: boolean;
  submittedAt: string;
  groupId?: string;
}

export interface SubmissionReactionDetailPayload {
  submission: ReactionDetailSubmission;
  reactions: ReactionDetailEntry[];
  viewerReactions: string[];
  availableEmojis: string[];
}
