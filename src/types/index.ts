export type Level = 1 | 2 | 3 | 4;
export type UserRole = "user" | "verifier" | "admin";
export type GuideStatus = "draft" | "pending_review" | "in_review" | "approved" | "rejected" | "appealed" | "spinoff";
export type VoteDecision = "approve" | "reject";
export type DisputeStatus = "open" | "resolved" | "dismissed";
export type NotificationType =
  | "submission_received" | "verification_assigned" | "vote_cast"
  | "guide_approved" | "guide_rejected" | "appeal_opened" | "appeal_resolved"
  | "dispute_opened" | "dispute_resolved" | "standing_warning" | "verifier_qualified";

export interface User {
  id: string; email: string; username: string;
  role: UserRole; standing: number; strikes: number;
  created_at: string; avatar_url?: string;
}

export interface Method {
  id: string; guide_id: string; title: string;
  description: string; steps: string[]; sort_order: number;
}

export interface Material {
  id: string; guide_id: string; name: string;
  description: string; optional: boolean;
  affiliate_url?: string; rating?: number; sort_order: number;
}

export interface Guide {
  id: string; title: string; description: string;
  niche: string; level: Level; status: GuideStatus;
  author_id: string; author?: User;
  content: string; tags: string[];
  upvotes: number; verifier_count: number;
  created_at: string; updated_at: string;
  approved_at?: string; parent_id?: string;
  methods?: Method[]; materials?: Material[];
  requires?: string[];
}

export interface Vote {
  id: string; session_id: string; verifier_id: string;
  verifier?: User; decision: VoteDecision;
  reasoning: string; niche_note?: string;
  level_note?: Level; created_at: string;
}

export interface VerificationSession {
  id: string; guide_id: string; guide?: Guide;
  verifier_ids: string[]; votes: Vote[];
  outcome?: VoteDecision; resolved_at?: string;
  created_at: string; deadline: string;
}

export interface Notification {
  id: string; user_id: string; type: NotificationType;
  title: string; body: string; read: boolean;
  link?: string; meta?: Record<string, unknown>;
  created_at: string;
}

export interface Dispute {
  id: string; guide_id: string; opener_id: string;
  reason: string; status: DisputeStatus;
  resolution?: string; created_at: string; resolved_at?: string;
}

export interface FilterState {
  niche: string; level: Level | null;
  search: string; status: GuideStatus | "all";
}

export interface GuideFormData {
  title: string; description: string; niche: string;
  level: Level; content: string;
  methods: Omit<Method, "id" | "guide_id">[];
  materials: Omit<Material, "id" | "guide_id">[];
  tags: string[]; requires: string[];
}

export interface VoteFormData {
  decision: VoteDecision; reasoning: string;
  niche_placement?: string; level_placement?: Level;
}
