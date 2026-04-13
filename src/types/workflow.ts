export type JobIngestionInput = {
  url?: string;
  text?: string;
  /** When ingesting from GitHub README + apply link */
  company?: string;
  title?: string;
  location?: string;
};

export type GitHubInternshipRow = {
  id: string;
  company: string;
  companyUrl?: string;
  role: string;
  location: string;
  applyUrl?: string;
  age: string;
};

export type JobIngestionOutput = {
  url?: string;
  rawText: string;
  title?: string;
  company?: string;
  location?: string;
  source?: string;
};

export type JDAnalysis = {
  title: string;
  level: "intern" | "new_grad" | "other";
  location: string;
  requiredLanguages: string[];
  requiredFrameworks: string[];
  requiredDatabases: string[];
  systemsTopics: string[];
  niceToHaves: string[];
  responsibilities: string[];
  rawSummary: string;
};

export type Profile = {
  summary: string;
  skills: string[];
  coursework: string[];
  experiences: {
    company: string;
    role: string;
    startDate: string;
    endDate: string | "Present";
    bullets: string[];
  }[];
  projects: {
    name: string;
    timeframe: string;
    techStack: string[];
    bullets: string[];
  }[];
  graduationDate: string;
  locations: string[];
};

export type FitScore = {
  score: number;
  strengths: string[];
  gaps: string[];
  recommendation: "apply" | "maybe" | "skip";
};

export type SectionChange = {
  section: "summary" | "skills" | "experience" | "projects" | "coursework";
  label?: string;
  before: string;
  after: string;
  rationale: string;
};

export type TailoringSuggestions = SectionChange[];

export type TailoredProfile = Profile & {
  versionId: string;
  appliedChanges: SectionChange[];
};

export type ApplicationLogRow = {
  timestamp: string;
  company: string;
  title: string;
  location: string;
  jdUrl?: string;
  fitScore: number;
  recommendation: "apply" | "maybe" | "skip";
  resumeVersionId: string;
  status: "ready_to_apply" | "applied_manual";
};

export type NodeStatus = "idle" | "running" | "success" | "error";

export type WorkflowStatus =
  | "idle"
  | "running"
  | "review"
  | "reviewed"
  | "logging"
  | "complete"
  | "error";
