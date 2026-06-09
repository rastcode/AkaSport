/**
 * Chat type definitions.
 *
 * Mirrors the Django Channels consumer (backend Part 4) frame contract and the
 * REST chat endpoints. The consumer broadcasts `message` and `system` frames;
 * clients send `{ message: string }`.
 */

import type { UserRole } from "@/types/auth";

/* ------------------------------ WS frames ---------------------------------- */

/** A live chat message frame broadcast by the consumer. */
export interface ChatMessageFrame {
  type: "message";
  message_id: number;
  room_id: number;
  sender_id: number;
  sender_role: UserRole | null;
  message: string;
  timestamp: string;
}

/** A system event frame (join / leave). */
export interface ChatSystemFrame {
  type: "system";
  event: "join" | "leave";
  room_id: number;
  user_id: number | null;
  role: UserRole | null;
  timestamp: string;
}

/** An error frame (validation issues surfaced by the consumer). */
export interface ChatErrorFrame {
  type: "error";
  detail: string;
}

/** Discriminated union of every frame the client may receive. */
export type ChatInboundFrame =
  | ChatMessageFrame
  | ChatSystemFrame
  | ChatErrorFrame;

/** The only outbound frame shape the client sends. */
export interface ChatOutboundFrame {
  message: string;
}

/* ------------------------------ REST shapes -------------------------------- */

/** A stored chat message from the REST history endpoint. */
export interface ChatMessageRecord {
  id: number;
  room: number;
  sender_id: number | null;
  sender_role: UserRole | null;
  message: string;
  timestamp: string;
}

/** A chat room summary from the REST rooms endpoints. */
export interface ChatRoom {
  id: number;
  customer_id: number;
  admin_id: number | null;
  is_active: boolean;
  is_assigned: boolean;
  message_count: number;
  last_message: {
    message: string;
    sender_id: number | null;
    timestamp: string;
  } | null;
  created_at: string;
  updated_at: string;
}

/* ----------------------------- UI view-model ------------------------------- */

/** A unified message used by the UI (from history OR live frames). */
export interface ChatDisplayMessage {
  key: string;
  messageId: number | null;
  senderId: number | null;
  senderRole: UserRole | null;
  text: string;
  timestamp: string;
  /** True if authored by the current user (for bubble alignment/colour). */
  mine: boolean;
}
