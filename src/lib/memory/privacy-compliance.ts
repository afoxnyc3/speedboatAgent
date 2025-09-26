/**
 * Privacy Compliance & Data Retention
 * GDPR/CCPA compliant memory management with PII detection
 */

import type {
  MemoryItem,
  MemoryConfig,
  UserId,
  SessionId,
  MemoryCategory,
} from '../../types/memory';

// PII detection patterns
const PII_PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /\b(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  SSN: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  IP_ADDRESS: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
};

const SENSITIVE_KEYWORDS = [
  'password', 'token', 'key', 'secret', 'credential',
  'ssn', 'social security', 'credit card', 'bank account',
  'personal', 'private', 'confidential'
];

export interface PIIDetectionResult {
  readonly hasPII: boolean;
  readonly detectedTypes: readonly string[];
  readonly sanitizedContent: string;
  readonly confidence: number;
}

export interface RetentionPolicy {
  readonly category: MemoryCategory;
  readonly retentionPeriodDays: number;
  readonly autoDelete: boolean;
  readonly requiresConsent: boolean;
}

export interface PrivacyConfig {
  readonly enablePIIDetection: boolean;
  readonly enableAutoSanitization: boolean;
  readonly retentionPolicies: readonly RetentionPolicy[];
  readonly consentRequired: boolean;
  readonly dataProcessingBasis: 'consent' | 'legitimate_interest' | 'contract';
  readonly allowDataExport: boolean;
  readonly allowDataDeletion: boolean;
}

const DEFAULT_RETENTION_POLICIES: RetentionPolicy[] = [
  { category: 'context', retentionPeriodDays: 7, autoDelete: true, requiresConsent: false },
  { category: 'preference', retentionPeriodDays: 365, autoDelete: false, requiresConsent: true },
  { category: 'entity', retentionPeriodDays: 30, autoDelete: true, requiresConsent: false },
  { category: 'fact', retentionPeriodDays: 90, autoDelete: true, requiresConsent: false },
  { category: 'relationship', retentionPeriodDays: 180, autoDelete: true, requiresConsent: true },
];

export class PrivacyComplianceManager {
  private config: PrivacyConfig;

  constructor(config: Partial<PrivacyConfig> = {}) {
    this.config = {
      enablePIIDetection: true,
      enableAutoSanitization: false,
      retentionPolicies: DEFAULT_RETENTION_POLICIES,
      consentRequired: true,
      dataProcessingBasis: 'legitimate_interest',
      allowDataExport: true,
      allowDataDeletion: true,
      ...config,
    };
  }

  detectPII(content: string): PIIDetectionResult {
    if (!this.config.enablePIIDetection) {
      return {
        hasPII: false,
        detectedTypes: [],
        sanitizedContent: content,
        confidence: 0,
      };
    }

    const detectedTypes: string[] = [];
    let sanitizedContent = content;
    let confidence = 0;

    // Pattern-based detection
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.test(content)) {
        detectedTypes.push(type.toLowerCase());
        confidence += 0.8;

        if (this.config.enableAutoSanitization) {
          sanitizedContent = sanitizedContent.replace(pattern, `[${type}_REDACTED]`);
        }
      }
    }

    // Keyword-based detection
    const lowerContent = content.toLowerCase();
    for (const keyword of SENSITIVE_KEYWORDS) {
      if (lowerContent.includes(keyword)) {
        detectedTypes.push('sensitive_keyword');
        confidence += 0.3;
      }
    }

    return {
      hasPII: detectedTypes.length > 0,
      detectedTypes: [...new Set(detectedTypes)],
      sanitizedContent,
      confidence: Math.min(confidence, 1.0),
    };
  }

  shouldRetainMemory(memory: MemoryItem, consentGiven?: boolean): boolean {
    const policy = this.getRetentionPolicy(memory.category);

    if (policy.requiresConsent && !consentGiven) {
      return false;
    }

    const ageInDays = this.getMemoryAgeInDays(memory.createdAt);
    return ageInDays <= policy.retentionPeriodDays;
  }

  getExpirationDate(category: MemoryCategory, createdAt: Date): Date {
    const policy = this.getRetentionPolicy(category);
    const expiration = new Date(createdAt);
    expiration.setDate(expiration.getDate() + policy.retentionPeriodDays);
    return expiration;
  }

  async cleanupExpiredMemories(
    memoryClient: any,
    userId?: UserId,
    sessionId?: SessionId
  ): Promise<number> {
    const now = new Date();
    let deletedCount = 0;

    for (const policy of this.config.retentionPolicies) {
      if (!policy.autoDelete) continue;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

      const result = await memoryClient.cleanup({
        userId,
        sessionId,
        olderThan: cutoffDate,
        categories: [policy.category],
      });

      deletedCount += result.deletedCount;
    }

    return deletedCount;
  }

  generatePrivacyNotice(): string {
    return `
Privacy Notice for Conversation Memory:

We collect and process conversation data to improve your experience through:
- Contextual understanding of your questions
- Personalized responses based on preferences
- Entity and relationship tracking

Data Processing Basis: ${this.config.dataProcessingBasis}
Consent Required: ${this.config.consentRequired ? 'Yes' : 'No'}

Retention Periods:
${this.config.retentionPolicies.map(p =>
  `- ${p.category}: ${p.retentionPeriodDays} days${p.autoDelete ? ' (auto-delete)' : ''}`
).join('\n')}

Your Rights:
- Request data export: ${this.config.allowDataExport ? 'Available' : 'Not available'}
- Request data deletion: ${this.config.allowDataDeletion ? 'Available' : 'Not available'}
- Withdraw consent: Available at any time

Contact us for privacy-related requests.
    `.trim();
  }

  validateMemoryContent(content: string, category: MemoryCategory): {
    isValid: boolean;
    reason?: string;
    sanitizedContent?: string;
  } {
    // Length validation
    if (content.length > 10000) {
      return { isValid: false, reason: 'Content exceeds maximum length' };
    }

    // PII detection
    const piiResult = this.detectPII(content);
    if (piiResult.hasPII && !this.config.enableAutoSanitization) {
      return {
        isValid: false,
        reason: `PII detected: ${piiResult.detectedTypes.join(', ')}`
      };
    }

    return {
      isValid: true,
      sanitizedContent: piiResult.sanitizedContent,
    };
  }

  private getRetentionPolicy(category: MemoryCategory): RetentionPolicy {
    return this.config.retentionPolicies.find(p => p.category === category) ||
           { category, retentionPeriodDays: 30, autoDelete: true, requiresConsent: false };
  }

  private getMemoryAgeInDays(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

// Export singleton instance
export const privacyManager = new PrivacyComplianceManager();

// Consent management utilities
export interface ConsentRecord {
  readonly userId: UserId;
  readonly consentGiven: boolean;
  readonly consentDate: Date;
  readonly consentVersion: string;
  readonly dataProcessingConsent: boolean;
  readonly personalizedResponsesConsent: boolean;
  readonly retentionConsent: boolean;
}

export class ConsentManager {
  private consents = new Map<UserId, ConsentRecord>();

  recordConsent(userId: UserId, consent: Omit<ConsentRecord, 'userId'>): void {
    this.consents.set(userId, { userId, ...consent });
  }

  getConsent(userId: UserId): ConsentRecord | null {
    return this.consents.get(userId) || null;
  }

  hasValidConsent(userId: UserId): boolean {
    const consent = this.getConsent(userId);
    if (!consent) return false;

    // Check if consent is not older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return consent.consentGiven && consent.consentDate > oneYearAgo;
  }

  revokeConsent(userId: UserId): void {
    const consent = this.getConsent(userId);
    if (consent) {
      this.consents.set(userId, {
        ...consent,
        consentGiven: false,
        consentDate: new Date(),
      });
    }
  }
}

export const consentManager = new ConsentManager();