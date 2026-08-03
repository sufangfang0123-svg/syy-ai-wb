// ============================================================
// Source Connector Interface
// Defines the contract for all data source connectors in the
// Cotton AI Radar system.
// ============================================================

import { RawSignal } from "@/types";

/**
 * Base interface for all data source connectors.
 * Every connector must implement these methods.
 */
export interface SourceConnector {
  /** Unique identifier for this connector */
  connector_id: string;

  /** Human-readable name */
  name: string;

  /** Connector type */
  type: "search" | "ecommerce" | "news" | "brand" | "social" | "user_authorized";

  /** Description of what this connector does */
  description: string;

  /** Validate the connector configuration */
  validateConfig(): boolean;

  /**
   * Fetch raw data from the source.
   * @param query - Search keywords or filter criteria
   * @param since - Only fetch data published after this timestamp
   * @param limit - Maximum number of items to fetch
   */
  fetch(query: string[], since: string, limit: number): Promise<unknown[]>;

  /**
   * Normalize raw data into the standard RawSignal format.
   * @param rawItem - Raw data from the source
   */
  normalize(rawItem: unknown): RawSignal;

  /** Get metadata about this source */
  getSourceMetadata(): {
    connector_id: string;
    name: string;
    type: string;
    description: string;
    supports_pagination: boolean;
    rate_limit_per_minute: number;
  };
}

/**
 * Connector registry - maps connector types to implementations.
 * In a real system, this would dynamically load connector implementations.
 */
export class ConnectorRegistry {
  private connectors: Map<string, SourceConnector> = new Map();

  register(connector: SourceConnector): void {
    this.connectors.set(connector.connector_id, connector);
  }

  get(id: string): SourceConnector | undefined {
    return this.connectors.get(id);
  }

  list(): SourceConnector[] {
    return Array.from(this.connectors.values());
  }

  listByType(type: SourceConnector["type"]): SourceConnector[] {
    return this.list().filter((c) => c.type === type);
  }
}

/** Singleton registry instance */
export const connectorRegistry = new ConnectorRegistry();

// ============================================================
// Mock Connector Implementations (for demonstration)
// These are stub implementations showing the interface contract.
// Real connectors would implement actual data fetching logic.
// ============================================================

export class SearchWebConnector implements SourceConnector {
  connector_id = "CONN-001";
  name = "搜索与公开网页";
  type = "search" as const;
  description = "通过公开搜索引擎获取行业趋势、竞品动态和场景关键词";

  validateConfig(): boolean {
    return true;
  }

  async fetch(query: string[], since: string, limit: number): Promise<unknown[]> {
    console.log(`[Mock] SearchWebConnector.fetch: query=${query.join(",")}, since=${since}, limit=${limit}`);
    return [];
  }

  normalize(rawItem: unknown): RawSignal {
    return rawItem as RawSignal;
  }

  getSourceMetadata() {
    return {
      connector_id: this.connector_id,
      name: this.name,
      type: this.type,
      description: this.description,
      supports_pagination: true,
      rate_limit_per_minute: 60,
    };
  }
}

export class EcommerceReviewConnector implements SourceConnector {
  connector_id = "CONN-002";
  name = "电商评论";
  type = "ecommerce" as const;
  description = "采集电商平台公开商品评价，获取产品问题和用户反馈";

  validateConfig(): boolean {
    return true;
  }

  async fetch(query: string[], since: string, limit: number): Promise<unknown[]> {
    console.log(`[Mock] EcommerceReviewConnector.fetch: query=${query.join(",")}, since=${since}, limit=${limit}`);
    return [];
  }

  normalize(rawItem: unknown): RawSignal {
    return rawItem as RawSignal;
  }

  getSourceMetadata() {
    return {
      connector_id: this.connector_id,
      name: this.name,
      type: this.type,
      description: this.description,
      supports_pagination: true,
      rate_limit_per_minute: 30,
    };
  }
}

export class SocialPublicConnector implements SourceConnector {
  connector_id = "CONN-005";
  name = "社交公开内容";
  type = "social" as const;
  description = "获取社交平台上用户公开发布的内容和讨论";

  validateConfig(): boolean {
    return true;
  }

  async fetch(query: string[], since: string, limit: number): Promise<unknown[]> {
    console.log(`[Mock] SocialPublicConnector.fetch: query=${query.join(",")}, since=${since}, limit=${limit}`);
    return [];
  }

  normalize(rawItem: unknown): RawSignal {
    return rawItem as RawSignal;
  }

  getSourceMetadata() {
    return {
      connector_id: this.connector_id,
      name: this.name,
      type: this.type,
      description: this.description,
      supports_pagination: true,
      rate_limit_per_minute: 45,
    };
  }
}
