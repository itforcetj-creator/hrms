import { UserProfile } from "./auth";

// Paginated API response wrapper
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface LeaveRequestPayload {
  type: "VACATION" | "SICK" | "UNPAID" | "MATERNITY";
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface LeaveRequest {
  id: number;
  user_id: number;
  user?: UserProfile;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  workflow_instance_id?: number;
  approved_by?: number;
  created_at: string;
  updated_at?: string;
}

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE";

export interface Attendance {
  id: number;
  user_id: number;
  user?: UserProfile;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  total_hours: number;
  location: string;
  status: AttendanceStatus;
}

export type PayslipStatus = "PAID" | "PENDING" | "CANCELLED";

export interface Payslip {
  id: number;
  user_id: number;
  month: number;
  year: number;
  bonus_amount: number;
  penalty_amount: number;
  net_amount: number;
  status: PayslipStatus;
  generated_at: string;
}

export type BonusPenaltyType = "BONUS" | "PENALTY";

export interface BonusPenalty {
  id: number;
  user_id: number;
  user?: UserProfile;
  type: BonusPenaltyType;
  amount: number;
  reason: string;
  date: string;
  month: number;
  year: number;
  created_at: string;
}

export interface SalaryConfiguration {
  user_id: number;
  base_salary: number;
  currency: string;
  payment_frequency: string;
}

// Enterprise Integrity & Audit Log
export interface AuditLog {
  id: number;
  user_id: number;
  action: string;
  table: string;
  record_id: number;
  old_values: string;
  new_values: string;
  ip_address: string;
  message: string;
  created_at: string;
}

// Performance & OKR Tracking
export interface ReviewCycle {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: "ACTIVE" | "CLOSED";
}

export interface PerformanceReview {
  id: number;
  review_cycle_id: number;
  employee_id: number;
  manager_id: number;
  employee_notes: string;
  manager_notes: string;
  rating: number;
  status: "DRAFT" | "SUBMITTED" | "FINALIZED";
}

export interface Goal {
  id: number;
  user_id: number;
  title: string;
  description: string;
  status: "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  progress: number;
  target_date: string;
  key_results: KeyResult[];
}

export interface KeyResult {
  id: number;
  goal_id: number;
  title: string;
  target_value: number;
  current_value: number;
}

// Analytics Stats
export interface HeadcountStat {
  department: string;
  count: number;
}

export interface TurnoverStat {
  total_count: number;
  departed_count: number;
  turnover_rate: number;
}

export interface AttendanceStat {
  latecomers: number;
}

export interface PayrollExpenseStat {
  month: string;
  total: number;
}

// Notifications
export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: 'SYSTEM' | 'EMAIL' | 'SMS';
  is_read: boolean;
  link: string;
  created_at: string;
}

// Announcements
export type AnnouncementPriority = 'INFO' | 'WARNING' | 'URGENT';
export type AnnouncementTarget = 'ALL' | 'DEPARTMENT';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  target: AnnouncementTarget;
  department_id?: number;
  author_id: number;
  author?: { id: number; full_name: string; role: string };
  created_at: string;
  updated_at: string;
}

// Assets
export type AssetStatus = 'STOCK' | 'ASSIGNED' | 'REPAIR' | 'RETIRED';

export interface Asset {
  id: number;
  name: string;
  category: string;
  serial_number: string;
  status: AssetStatus;
  assigned_to_user_id?: number | null;
  assigned_to?: { id: number; full_name: string; email: string; role: string } | null;
  created_at: string;
  updated_at: string;
}

// Onboarding
export interface OnboardingTask {
  id: number;
  user_id: number;
  title: string;
  description: string;
  due_date: string;
  is_completed: boolean;
  verified_by?: number;
}

export interface HRDocument {
  id: number;
  user_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by_role?: string;
  is_contract?: boolean;
  user?: Pick<UserProfile, "id" | "full_name" | "email" | "role">;
  expiry_date?: string | null;
  created_at: string;
}

// Recruitment
export type JobOpeningStatus = "OPEN" | "CLOSED" | "ON_HOLD";

export interface DepartmentSummary {
  id: number;
  name: string;
  manager_id?: number;
  manager?: UserProfile;
}

export interface CreateDepartmentPayload {
  name: string;
  manager_id?: number;
}

export interface UpdateDepartmentPayload {
  name?: string;
  manager_id?: number | null;
}

export interface RecruitmentJob {
  id: number;
  title: string;
  description: string;
  experience_level?: string;
  salary_range?: string;
  department_id: number;
  department?: DepartmentSummary;
  status: JobOpeningStatus;
  created_at: string;
  applications_count?: number;
  candidates?: RecruitmentCandidate[];
}

export interface CreateRecruitmentJobPayload {
  title: string;
  description: string;
  department_id: number;
  status?: JobOpeningStatus;
}

export type CandidateStatus = "APPLIED" | "INTERVIEW" | "OFFER" | "HIRED" | "REJECTED";

export interface RecruitmentCandidate {
  id: number;
  full_name: string;
  email: string;
  resume_path: string;
  status: CandidateStatus;
  job_opening_id: number;
  applied_at: string;
}

// Global aliases for cleaner recruitment components
export type Job = RecruitmentJob;
export type Candidate = RecruitmentCandidate;

export interface RecruitmentJobDetailsResponse {
  job: RecruitmentJob;
  candidates: RecruitmentCandidate[];
}

export interface InterviewNote {
  id: number;
  candidate_id: number;
  interviewer_id: number;
  interviewer?: Pick<UserProfile, "id" | "full_name" | "email" | "role">;
  score: number;
  comments: string;
  created_at: string;
}

export interface Department {
  id: number;
  name: string;
  manager_id?: number;
  manager?: UserProfile;
}

export interface Position {
  id: number;
  title: string;
  department_id: number;
  department?: Department;
}
