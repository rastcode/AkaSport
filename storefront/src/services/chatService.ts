/**
 * Chat REST service layer.
 *
 * Uses the authenticated axios client. Covers message history and the admin
 * room queues (backend Part 4 endpoints under `/api/chat/`).
 */

import api from "@/lib/api";
import type { ChatMessageRecord, ChatRoom } from "@/types/chat";

interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function unwrap<T>(data: Paginated<T> | T[]): T[] {
  return Array.isArray(data) ? data : data.results;
}

/** Rooms visible to the current user (own for customers, all for admins). */
export async function fetchRooms(
  status?: "active" | "closed",
): Promise<ChatRoom[]> {
  const query = status ? `?status=${status}` : "";
  const { data } = await api.get<Paginated<ChatRoom> | ChatRoom[]>(
    `/chat/rooms/${query}`,
  );
  return unwrap(data);
}

/** Admin-only queue of open rooms (optionally only unassigned ones). */
export async function fetchOpenRooms(
  unassigned = true,
): Promise<ChatRoom[]> {
  const { data } = await api.get<Paginated<ChatRoom> | ChatRoom[]>(
    `/chat/rooms/open/?unassigned=${unassigned ? "true" : "false"}`,
  );
  return unwrap(data);
}

/** Paginated message history for a room (returns the first page, ascending). */
export async function fetchRoomHistory(
  roomId: number,
): Promise<ChatMessageRecord[]> {
  const { data } = await api.get<Paginated<ChatMessageRecord> | ChatMessageRecord[]>(
    `/chat/rooms/${roomId}/messages/`,
  );
  return unwrap(data);
}
