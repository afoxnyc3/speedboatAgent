/**
 * Privacy Compliance Utilities
 * Basic PII detection and data retention for memory system
 */

// PII detection patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+?\d{1,4}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
};

/**
 * Detects PII in content
 */
export function detectPII(content: string): string[] {
  const detected: string[] = [];

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(content)) {
      detected.push(type);
    }
  }

  return detected;
}

/**
 * Sanitizes content by removing PII
 */
export function sanitizeContent(content: string): string {
  let sanitized = content;

  for (const pattern of Object.values(PII_PATTERNS)) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  return sanitized;
}

/**
 * Checks if content should be retained based on privacy policy
 */
export function shouldRetain(
  content: string,
  createdAt: Date,
  retentionDays: number
): boolean {
  const hasPII = detectPII(content).length > 0;
  if (hasPII) return false;

  const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageInDays <= retentionDays;
}