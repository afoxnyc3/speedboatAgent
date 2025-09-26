/**
 * Privacy Compliance Unit Tests
 * TDD approach for privacy and data retention testing
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  PrivacyComplianceManager,
  ConsentManager,
  privacyManager,
  consentManager,
} from '../privacy-compliance';
import type { MemoryItem, MemoryCategory, UserId } from '../../../types/memory';

describe('PrivacyComplianceManager', () => {
  let privacyMgr: PrivacyComplianceManager;

  beforeEach(() => {
    privacyMgr = new PrivacyComplianceManager();
  });

  describe('PII Detection', () => {
    it('should detect email addresses', () => {
      const content = 'Contact me at john@example.com for more info';
      const result = privacyMgr.detectPII(content);

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('email');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect phone numbers', () => {
      const content = 'Call me at (555) 123-4567 or 555-987-6543';
      const result = privacyMgr.detectPII(content);

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('phone');
    });

    it('should detect sensitive keywords', () => {
      const content = 'My password is secret123';
      const result = privacyMgr.detectPII(content);

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('sensitive_keyword');
    });

    it('should sanitize content when enabled', () => {
      const privacyMgrWithSanitization = new PrivacyComplianceManager({
        enableAutoSanitization: true,
      });

      const content = 'Email me at test@example.com';
      const result = privacyMgrWithSanitization.detectPII(content);

      expect(result.sanitizedContent).toBe('Email me at [EMAIL_REDACTED]');
    });

    it('should handle multiple PII types', () => {
      const content = 'Contact john@example.com or call 555-1234';
      const result = privacyMgr.detectPII(content);

      expect(result.hasPII).toBe(true);
      expect(result.detectedTypes).toContain('email');
      expect(result.detectedTypes).toContain('phone');
      expect(result.confidence).toBeGreaterThan(1.0);
    });

    it('should return false for clean content', () => {
      const content = 'This is just a normal conversation about TypeScript';
      const result = privacyMgr.detectPII(content);

      expect(result.hasPII).toBe(false);
      expect(result.detectedTypes).toHaveLength(0);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Retention Policies', () => {
    const createMockMemory = (category: MemoryCategory, daysOld: number): MemoryItem => ({
      id: 'mem_test' as any,
      content: 'Test memory',
      scope: 'session',
      category,
      createdAt: new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
      metadata: {},
    });

    it('should retain context memories within 7 days', () => {
      const memory = createMockMemory('context', 3);
      const shouldRetain = privacyMgr.shouldRetainMemory(memory);

      expect(shouldRetain).toBe(true);
    });

    it('should not retain old context memories', () => {
      const memory = createMockMemory('context', 10);
      const shouldRetain = privacyMgr.shouldRetainMemory(memory);

      expect(shouldRetain).toBe(false);
    });

    it('should require consent for preference memories', () => {
      const memory = createMockMemory('preference', 5);

      const shouldRetainWithoutConsent = privacyMgr.shouldRetainMemory(memory, false);
      const shouldRetainWithConsent = privacyMgr.shouldRetainMemory(memory, true);

      expect(shouldRetainWithoutConsent).toBe(false);
      expect(shouldRetainWithConsent).toBe(true);
    });

    it('should calculate correct expiration dates', () => {
      const createdAt = new Date('2024-01-01');
      const expirationDate = privacyMgr.getExpirationDate('context', createdAt);

      const expectedExpiration = new Date('2024-01-08'); // 7 days later
      expect(expirationDate.toDateString()).toBe(expectedExpiration.toDateString());
    });

    it('should handle different retention periods per category', () => {
      const contextMemory = createMockMemory('context', 10);
      const entityMemory = createMockMemory('entity', 20);
      const factMemory = createMockMemory('fact', 60);

      expect(privacyMgr.shouldRetainMemory(contextMemory)).toBe(false); // > 7 days
      expect(privacyMgr.shouldRetainMemory(entityMemory)).toBe(true);   // < 30 days
      expect(privacyMgr.shouldRetainMemory(factMemory)).toBe(true);     // < 90 days
    });
  });

  describe('Content Validation', () => {
    it('should validate normal content', () => {
      const result = privacyMgr.validateMemoryContent(
        'User prefers React over Vue',
        'preference'
      );

      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('User prefers React over Vue');
    });

    it('should reject content that is too long', () => {
      const longContent = 'x'.repeat(10001);
      const result = privacyMgr.validateMemoryContent(longContent, 'context');

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('exceeds maximum length');
    });

    it('should reject content with PII when sanitization is disabled', () => {
      const privacyMgrNoSanitization = new PrivacyComplianceManager({
        enableAutoSanitization: false,
      });

      const piiContent = 'My email is test@example.com';
      const result = privacyMgrNoSanitization.validateMemoryContent(piiContent, 'context');

      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('PII detected');
    });

    it('should sanitize and accept PII when sanitization is enabled', () => {
      const privacyMgrWithSanitization = new PrivacyComplianceManager({
        enableAutoSanitization: true,
      });

      const piiContent = 'Contact me at test@example.com';
      const result = privacyMgrWithSanitization.validateMemoryContent(piiContent, 'context');

      expect(result.isValid).toBe(true);
      expect(result.sanitizedContent).toBe('Contact me at [EMAIL_REDACTED]');
    });
  });

  describe('Privacy Notice Generation', () => {
    it('should generate comprehensive privacy notice', () => {
      const notice = privacyMgr.generatePrivacyNotice();

      expect(notice).toContain('Privacy Notice');
      expect(notice).toContain('legitimate_interest');
      expect(notice).toContain('Consent Required: Yes');
      expect(notice).toContain('context: 7 days');
      expect(notice).toContain('preference: 365 days');
      expect(notice).toContain('Request data export: Available');
      expect(notice).toContain('Request data deletion: Available');
    });

    it('should reflect custom configuration in notice', () => {
      const customPrivacyMgr = new PrivacyComplianceManager({
        dataProcessingBasis: 'consent',
        consentRequired: false,
        allowDataExport: false,
      });

      const notice = customPrivacyMgr.generatePrivacyNotice();

      expect(notice).toContain('Data Processing Basis: consent');
      expect(notice).toContain('Consent Required: No');
      expect(notice).toContain('Request data export: Not available');
    });
  });

  describe('Memory Cleanup', () => {
    it('should simulate cleanup of expired memories', async () => {
      const mockMemoryClient = {
        cleanup: jest.fn().mockResolvedValue({ deletedCount: 15 }),
      };

      const deletedCount = await privacyMgr.cleanupExpiredMemories(
        mockMemoryClient,
        'user_123' as UserId
      );

      expect(deletedCount).toBe(15); // 15 from one cleanup call
      expect(mockMemoryClient.cleanup).toHaveBeenCalledWith({
        userId: 'user_123',
        sessionId: undefined,
        olderThan: expect.any(Date),
        categories: ['context'],
      });
    });
  });
});

describe('ConsentManager', () => {
  let consentMgr: ConsentManager;

  beforeEach(() => {
    consentMgr = new ConsentManager();
  });

  describe('Consent Recording', () => {
    it('should record user consent', () => {
      const userId = 'user_consent_test' as UserId;
      const consent = {
        consentGiven: true,
        consentDate: new Date(),
        consentVersion: '1.0',
        dataProcessingConsent: true,
        personalizedResponsesConsent: true,
        retentionConsent: false,
      };

      consentMgr.recordConsent(userId, consent);
      const recordedConsent = consentMgr.getConsent(userId);

      expect(recordedConsent).toEqual({ userId, ...consent });
    });

    it('should validate current consent', () => {
      const userId = 'user_valid' as UserId;
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 6); // 6 months ago

      consentMgr.recordConsent(userId, {
        consentGiven: true,
        consentDate: recentDate,
        consentVersion: '1.0',
        dataProcessingConsent: true,
        personalizedResponsesConsent: true,
        retentionConsent: true,
      });

      expect(consentMgr.hasValidConsent(userId)).toBe(true);
    });

    it('should invalidate old consent', () => {
      const userId = 'user_old_consent' as UserId;
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago

      consentMgr.recordConsent(userId, {
        consentGiven: true,
        consentDate: oldDate,
        consentVersion: '1.0',
        dataProcessingConsent: true,
        personalizedResponsesConsent: true,
        retentionConsent: true,
      });

      expect(consentMgr.hasValidConsent(userId)).toBe(false);
    });

    it('should handle revoked consent', () => {
      const userId = 'user_revoke' as UserId;

      // Initial consent
      consentMgr.recordConsent(userId, {
        consentGiven: true,
        consentDate: new Date(),
        consentVersion: '1.0',
        dataProcessingConsent: true,
        personalizedResponsesConsent: true,
        retentionConsent: true,
      });

      expect(consentMgr.hasValidConsent(userId)).toBe(true);

      // Revoke consent
      consentMgr.revokeConsent(userId);

      expect(consentMgr.hasValidConsent(userId)).toBe(false);

      const revokedConsent = consentMgr.getConsent(userId);
      expect(revokedConsent?.consentGiven).toBe(false);
    });

    it('should return null for unknown users', () => {
      const unknownUserId = 'unknown_user' as UserId;
      const consent = consentMgr.getConsent(unknownUserId);

      expect(consent).toBeNull();
      expect(consentMgr.hasValidConsent(unknownUserId)).toBe(false);
    });
  });
});

describe('Singleton Instances', () => {
  it('should provide global privacy manager instance', () => {
    expect(privacyManager).toBeInstanceOf(PrivacyComplianceManager);
  });

  it('should provide global consent manager instance', () => {
    expect(consentManager).toBeInstanceOf(ConsentManager);
  });

  it('should detect PII using global instance', () => {
    const result = privacyManager.detectPII('Email: test@example.com');
    expect(result.hasPII).toBe(true);
  });
});