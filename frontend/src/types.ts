export interface Skill {
  id: number;
  name: string;
  category: string;
  direction: "teach" | "learn";
  level: "beginner" | "intermediate" | "expert";
}

export interface StudentSummary {
  id: number;
  name: string;
  college: string;
  bio: string;
  teach_count: number;
  learn_count: number;
}

export interface Student extends StudentSummary {
  skills: Skill[];
}

export interface MatchPeer {
  id: number;
  name: string;
  college: string;
  bio: string;
}

export interface ExchangeSkill {
  skill_id: number;
  name: string;
  category: string;
  level: string;
}

export interface RequestState {
  request_id: number;
  status: "pending" | "accepted";
}

export interface Match {
  type: "MUTUAL" | "RELEVANT";
  peer: MatchPeer;
  score: number;
  give: ExchangeSkill[];
  get: ExchangeSkill[];
  checks: string[];
  reasons: string[];
  connected: boolean;
  request: RequestState | null;
}

export interface MatchesResponse {
  student_id: number;
  matches: Match[];
  mutual_count: number;
}

export interface CycleExchange {
  from: string;
  to: string;
  skill: string;
}

export interface CycleParticipant {
  id: number;
  name: string;
}

export interface Cycle {
  exchange: CycleExchange[];
  participants: CycleParticipant[];
}

export interface CyclesResponse {
  student_id: number;
  cycles: Cycle[];
  cycle_count: number;
}

export interface ExchangeRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  status: "pending" | "accepted" | "rejected" | "completed";
  created_at: string;
  sender_name: string;
  receiver_name: string;
  teach_skill: string;
  teach_category: string;
  teach_level: string;
  learn_skill: string;
}

export interface RequestsResponse {
  requests: ExchangeRequest[];
}