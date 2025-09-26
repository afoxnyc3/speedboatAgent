/**
 * Input Sanitization Tests
 * Test input validation and sanitization functionality
 */

import { describe, it, expect } from '@jest/globals';
import {
  InputSanitizer,
  SecuritySchemas,
  validateRequest,
  validateHeaders,
} from '../input-sanitization';

describe('InputSanitizer', () => {
  describe('sanitizeString', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = InputSanitizer.sanitizeString(input);

      expect(result).toBe('Hello  World');
    });

    it('should remove HTML tags', () => {
      const input = 'Hello <b>bold</b> and <i>italic</i> text';
      const result = InputSanitizer.sanitizeString(input);

      expect(result).toBe('Hello bold and italic text');
    });

    it('should remove javascript: protocol', () => {
      const input = 'javascript:alert("xss")';
      const result = InputSanitizer.sanitizeString(input);

      expect(result).toBe('alert("xss")');
    });

    it('should remove event handlers', () => {
      const input = 'text onclick=alert("xss") more text';
      const result = InputSanitizer.sanitizeString(input);

      expect(result).toBe('text  more text');
    });

    it('should trim whitespace', () => {
      const input = '  hello world  ';
      const result = InputSanitizer.sanitizeString(input);

      expect(result).toBe('hello world');
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid HTTPS URLs', () => {
      const input = 'https://example.com/path';
      const result = InputSanitizer.sanitizeUrl(input);

      expect(result).toBe('https://example.com/path');
    });

    it('should accept valid HTTP URLs', () => {
      const input = 'http://localhost:3000/api';
      const result = InputSanitizer.sanitizeUrl(input);

      expect(result).toBe('http://localhost:3000/api');
    });

    it('should reject javascript: protocol', () => {
      const input = 'javascript:alert("xss")';

      expect(() => InputSanitizer.sanitizeUrl(input)).toThrow('Invalid protocol');
    });

    it('should reject data: protocol', () => {
      const input = 'data:text/html,<script>alert("xss")</script>';

      expect(() => InputSanitizer.sanitizeUrl(input)).toThrow('Invalid protocol');
    });

    it('should reject malformed URLs', () => {
      const input = 'not-a-url';

      expect(() => InputSanitizer.sanitizeUrl(input)).toThrow('Invalid URL format');
    });
  });

  describe('sanitizeFilename', () => {
    it('should allow safe characters', () => {
      const input = 'file-name_123.txt';
      const result = InputSanitizer.sanitizeFilename(input);

      expect(result).toBe('file-name_123.txt');
    });

    it('should remove unsafe characters', () => {
      const input = 'file/with\\unsafe<chars>';
      const result = InputSanitizer.sanitizeFilename(input);

      expect(result).toBe('filewithunsafechars');
    });

    it('should remove path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const result = InputSanitizer.sanitizeFilename(input);

      expect(result).toBe('etcpasswd');
    });

    it('should limit length to 255 characters', () => {
      const input = 'a'.repeat(300);
      const result = InputSanitizer.sanitizeFilename(input);

      expect(result.length).toBe(255);
    });
  });
});

describe('SecuritySchemas', () => {
  describe('safeString', () => {
    it('should sanitize and validate strings', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = SecuritySchemas.safeString().parse(input);

      expect(result).toBe('Hello  World');
    });

    it('should reject empty strings after sanitization', () => {
      const input = '<script></script>';

      expect(() => SecuritySchemas.safeString().parse(input)).toThrow();
    });

    it('should respect length limits', () => {
      const input = 'a'.repeat(100);

      expect(() => SecuritySchemas.safeString(50).parse(input)).toThrow();
    });
  });

  describe('safeUrl', () => {
    it('should validate and sanitize URLs', () => {
      const input = 'https://example.com/path';
      const result = SecuritySchemas.safeUrl.parse(input);

      expect(result).toBe('https://example.com/path');
    });

    it('should reject invalid URLs', () => {
      const input = 'javascript:alert("xss")';

      expect(() => SecuritySchemas.safeUrl.parse(input)).toThrow();
    });
  });

  describe('apiQuery', () => {
    it('should sanitize API queries', () => {
      const input = 'How to <script>alert("xss")</script> implement authentication?';
      const result = SecuritySchemas.apiQuery.parse(input);

      expect(result).toBe('How to  implement authentication?');
    });

    it('should enforce length limits', () => {
      const input = 'a'.repeat(3000);

      expect(() => SecuritySchemas.apiQuery.parse(input)).toThrow();
    });
  });

  describe('ipAddress', () => {
    it('should validate IPv4 addresses', () => {
      const valid = ['192.168.1.1', '10.0.0.1', '127.0.0.1'];

      valid.forEach(ip => {
        expect(() => SecuritySchemas.ipAddress.parse(ip)).not.toThrow();
      });
    });

    it('should reject invalid IP addresses', () => {
      const invalid = ['300.300.300.300', 'not-an-ip', '192.168.1'];

      invalid.forEach(ip => {
        expect(() => SecuritySchemas.ipAddress.parse(ip)).toThrow();
      });
    });
  });

  describe('searchRequest', () => {
    it('should validate search requests', () => {
      const input = {
        query: 'test search',
        limit: 20,
        source: 'github',
      };

      const result = SecuritySchemas.searchRequest.parse(input);

      expect(result.query).toBe('test search');
      expect(result.limit).toBe(20);
      expect(result.source).toBe('github');
    });

    it('should apply defaults', () => {
      const input = { query: 'test' };
      const result = SecuritySchemas.searchRequest.parse(input);

      expect(result.limit).toBe(10);
      expect(result.source).toBe('all');
    });

    it('should sanitize query', () => {
      const input = { query: 'test <script>alert("xss")</script>' };
      const result = SecuritySchemas.searchRequest.parse(input);

      expect(result.query).toBe('test ');
    });
  });
});

describe('validateRequest', () => {
  it('should validate successful requests', async () => {
    const schema = SecuritySchemas.searchRequest;
    const input = { query: 'test query' };

    const result = await validateRequest(input, schema);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe('test query');
    }
  });

  it('should return errors for invalid requests', async () => {
    const schema = SecuritySchemas.searchRequest;
    const input = { query: '' }; // Empty query

    const result = await validateRequest(input, schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Validation failed');
    }
  });

  it('should handle non-object inputs', async () => {
    const schema = SecuritySchemas.searchRequest;
    const input = 'not an object';

    const result = await validateRequest(input, schema);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Validation failed');
    }
  });
});

describe('validateHeaders', () => {
  it('should validate valid headers', () => {
    const headers = new Headers({
      'content-type': 'application/json',
      'user-agent': 'Mozilla/5.0 (Test Browser)',
      host: 'example.com',
    });

    const result = validateHeaders(headers);

    expect(result.contentType).toBe('application/json');
    expect(result.userAgent).toBe('Mozilla/5.0 (Test Browser)');
    expect(result.errors).toHaveLength(0);
  });

  it('should reject unsupported content types', () => {
    const headers = new Headers({
      'content-type': 'application/xml',
    });

    const result = validateHeaders(headers);

    expect(result.errors).toContain('Unsupported content type');
  });

  it('should reject overly long user agents', () => {
    const headers = new Headers({
      'user-agent': 'a'.repeat(600),
    });

    const result = validateHeaders(headers);

    expect(result.errors).toContain('User-Agent header too long');
  });

  it('should reject invalid hostnames', () => {
    const headers = new Headers({
      host: 'invalid<>hostname',
    });

    const result = validateHeaders(headers);

    expect(result.errors).toContain('Invalid host header');
  });
});