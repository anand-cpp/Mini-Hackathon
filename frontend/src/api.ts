import type {
  CyclesResponse,
  ExchangeRequest,
  MatchesResponse,
  RequestsResponse,
  Skill,
  Student,
  StudentSummary,
} from "./types";

const API = "http://127.0.0.1:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, init);
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    const msg =
      typeof detail.detail === "string"
        ? detail.detail
        : Array.isArray(detail.detail)
          ? detail.detail[0]?.msg ?? "Bad request"
          : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listStudents: () => request<StudentSummary[]>("/students"),
  getStudent: (id: number) => request<Student>(`/students/${id}`),
  matches: (id: number) =>
    request<MatchesResponse>(`/students/${id}/matches`, { method: "POST" }),
  cycles: (id: number) =>
    request<CyclesResponse>(`/students/${id}/cycles`, { method: "POST" }),
  requests: (id: number) => request<RequestsResponse>(`/requests/${id}`),
  sendRequest: (senderId: number, receiverId: number, teachSkillId: number, learnSkillId: number) =>
    request<ExchangeRequest>("/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sender_id: senderId,
        receiver_id: receiverId,
        teach_skill_id: teachSkillId,
        learn_skill_id: learnSkillId,
      }),
    }),
  decide: (id: number, action: "accept" | "reject" | "complete") =>
    request<ExchangeRequest>(`/requests/${id}/${action}`, { method: "POST" }),
  createStudent: (payload: {
    name: string;
    college: string;
    bio: string;
    skills: Array<{ name: string; category: string; direction: "teach" | "learn"; level: string }>;
  }) =>
    request<Student>("/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};

export type { Skill };