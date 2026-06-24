export type DbsStatus = "not_uploaded" | "pending" | "verified" | "rejected" | "expired";
/** LSEG World-Check screening status (DB column: lseg_status) */
export type LsegStatus = "pending" | "clear" | "possible_match" | "high_risk";
/** @deprecated Use LsegStatus */
export type RefinitivStatus = LsegStatus;
export type ComplianceStatus = "pending" | "approved" | "rejected";
export type EventStatus = "draft" | "published" | "active" | "completed" | "cancelled";
export type ApplicationStatus = "applied" | "confirmed" | "waitlisted" | "declined" | "no_show" | "cancelled";
export type StationType = "entry" | "setup" | "packaging" | "social_media" | "cleanup" | "general";
export type PointsType = "early_bird" | "attendance" | "setup" | "packaging" | "social_media" | "cleanup" | "manual_bonus" | "deduction";
export type RewardTier = "certificate" | "silver_badge" | "gold_badge";
export type AdminRole = "super_admin" | "admin" | "coordinator";

export interface Volunteer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  nationality: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  dietary_requirements?: string;
  medical_info?: string;
  age_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolunteerCompliance {
  id: string;
  volunteer_id: string;
  dbs_document_url?: string;
  dbs_uploaded_at?: string;
  dbs_status: DbsStatus;
  dbs_expiry_date?: string;
  dbs_reviewed_by?: string;
  dbs_reviewed_at?: string;
  lseg_case_id?: string;
  lseg_status: LsegStatus;
  lseg_screened_at?: string;
  lseg_override_by?: string;
  lseg_override_at?: string;
  overall_status: ComplianceStatus;
  approved_at?: string;
  approved_by?: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string;
  venue_name?: string;
  venue_address?: string;
  event_start: string;
  event_end: string;
  volunteer_start?: string;
  volunteer_end?: string;
  status: EventStatus;
  early_bird_cutoff_days: number;
  created_by: string;
  published_at?: string;
}

export interface EventRole {
  id: string;
  event_id: string;
  role_name: string;
  capacity: number;
  station_type: StationType;
  station_window_start?: string;
  station_window_end?: string;
}

export interface PointsTransaction {
  id: string;
  volunteer_id: string;
  event_id?: string;
  check_in_id?: string;
  type: PointsType;
  amount: number;
  earned_at: string;
  description?: string;
  awarded_by?: string;
}
