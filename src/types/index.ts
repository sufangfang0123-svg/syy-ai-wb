// ============================================================
// Type Definitions for Cotton AI Workbench
// ============================================================

export type Platform = "xiaohongshu" | "douyin" | "jd" | "taobao" | "weibo" | "zhihu";

export type Sentiment = "positive" | "neutral" | "negative";

export type DataType = "public" | "interview" | "ai_simulated";

export interface FeedbackItem {
  feedback_id: string;
  platform: Platform;
  product_name: string;
  category: string;
  raw_text: string;
  publish_date: string;
  likes: number;
  reply_count: number;
  source_url: string;
  data_type: DataType;
  sentiment: Sentiment;
  scenarios: string[];
  pain_points: string[];
  expected_experience: string;
  confidence: number; // 0-1
  cluster_id?: string;
}

export interface Cluster {
  cluster_id: string;
  cluster_name: string;
  feedback_count: number;
  keywords: string[];
  main_persona: string;
  main_scenario: string;
  core_pain_point: string;
  evidence_strength: "high" | "medium" | "low";
  confidence: number; // 0-100 percentage
  feedback_ids: string[];
}

export interface Opportunity {
  opportunity_id: string;
  title: string;
  target_persona: string;
  core_scenario: string;
  user_task: string;
  main_pain_point: string;
  expected_experience: string;
  evidence_count: number;
  evidence_level: string;
  current_hypothesis: string;
  pending_questions: string[];
  confidence: number; // 0-100 percentage
  related_cluster_ids: string[];
}

export interface AIAnalysisStep {
  id: string;
  label: string;
}

// --- Radar System Types ---

export type ScanFrequency = "hourly" | "daily" | "weekly" | "manual";

export type TaskStatus = "running" | "paused" | "draft" | "error";

export type SourceStatus = "active" | "scanning" | "limited" | "pending";

export interface MonitorTask {
  task_id: string;
  name: string;
  theme: string;
  keywords: string[];
  exclude_keywords: string[];
  sources: string[];
  frequency: ScanFrequency;
  time_range_days: number;
  monitoring_targets: string[];
  alert_on_anomaly: boolean;
  status: TaskStatus;
  last_scan_at: string | null;
  next_scan_at: string | null;
  signals_today: number;
  total_signals: number;
  created_at: string;
}

export interface SourceConnector {
  connector_id: string;
  name: string;
  type: "search" | "ecommerce" | "news" | "brand" | "social" | "user_authorized";
  description: string;
  status: SourceStatus;
  last_scan_at: string | null;
  signals_today: number;
  total_signals: number;
  config_required: boolean;
}

export interface RawSignal {
  signal_id: string;
  source_id: string;
  platform: string;
  source_type: string;
  title: string;
  content: string;
  published_at: string;
  collected_at: string;
  source_url: string;
  engagement: {
    likes: number;
    replies: number;
  };
  query_id: string;
  product_category: string;
  scenario: string;
  pain_point: string;
  sentiment: Sentiment;
  confidence: number;
  is_clustered: boolean;
}

export interface TrendTopic {
  topic_id: string;
  name: string;
  change_7d: number; // percentage
  signal_count: number;
  trend: "rising" | "stable" | "falling" | "new_conflict";
  platforms: string[];
  description: string;
}

export interface AnomalyAlert {
  alert_id: string;
  title: string;
  description: string;
  platforms: string[];
  related_signals: number;
  growth_rate: number;
  detected_at: string;
  status: "new" | "viewed" | "resolved";
}

// JSON wrapper types
export interface JsonDataWrapper<T> {
  _disclaimer: string;
  _generated_at: string;
  items: T[];
}
