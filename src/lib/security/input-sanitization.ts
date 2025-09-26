/**
 * Input Sanitization and Validation
 * Enhanced Zod schemas with security-focused validation
 */

import { z } from 'zod';

/**
 * Sanitization utilities
 */
export class InputSanitizer {
  /**
   * Remove HTML tags and potentially dangerous characters
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/\bon\w+\s*=\s*[^>\s]*/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate and sanitize URL
   */
  static sanitizeUrl(input: string): string {
    try {
      const url = new URL(input);
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid protocol') {
        throw error; // Re-throw protocol errors
      }
      throw new Error('Invalid URL format');
    }
  }

  /**
   * Sanitize filename to prevent path traversal
   */
  static sanitizeFilename(input: string): string {
    return input
      .replace(/[^a-zA-Z0-9._-]/g, '') // Only allow safe characters
      .replace(/\.\./g, '') // Remove path traversal
      .slice(0, 255); // Limit length
  }
}

/**
 * Enhanced validation schemas
 */
export const SecuritySchemas = {
  /**
   * Safe string with length and content validation
   */
  safeString: (maxLength = 1000) => z
    .string()
    .max(maxLength)
    .transform(InputSanitizer.sanitizeString)
    .refine(val => val.length > 0, 'String cannot be empty after sanitization'),

  /**
   * Safe URL with protocol validation
   */
  safeUrl: z
    .string()
    .url()
    .transform(InputSanitizer.sanitizeUrl),

  /**
   * Safe filename
   */
  safeFilename: z
    .string()
    .min(1)
    .max(255)
    .transform(InputSanitizer.sanitizeFilename)
    .refine(val => val.length > 0, 'Filename invalid after sanitization'),

  /**
   * API query with sanitization
   */
  apiQuery: z
    .string()
    .min(1)
    .max(2000)
    .transform(InputSanitizer.sanitizeString),

  /**
   * IP address validation
   */
  ipAddress: z
    .string()
    .refine(ip => {
      const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
      return ipv4Regex.test(ip) || ipv6Regex.test(ip) || ip === '127.0.0.1';
    }, 'Invalid IP address format'),

  /**
   * API key validation
   */
  apiKey: z
    .string()
    .min(32)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid API key format'),

  /**
   * Safe pagination parameters
   */
  pagination: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /**
   * Search request with safety checks
   */
  searchRequest: z.object({
    query: z.string().min(1).max(2000).transform(InputSanitizer.sanitizeString),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    source: z.enum(['github', 'web', 'all']).default('all'),
  }),

  /**
   * Chat request with safety checks
   */
  chatRequest: z.object({
    message: z.string().min(1).max(4000).transform(InputSanitizer.sanitizeString),
    sessionId: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional(),
    stream: z.boolean().default(true),
  }),
};

/**
 * Request validation middleware helper
 */
export async function validateRequest<T>(
  requestBody: unknown,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = schema.parse(requestBody);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError && Array.isArray(error.errors)) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return { success: false, error: `Validation failed: ${errorMessage}` };
    }
    return { success: false, error: 'Validation failed: Invalid request format' };
  }
}

/**
 * Header validation
 */
export function validateHeaders(headers: Headers): {
  contentType?: string;
  userAgent?: string;
  errors: string[];
} {
  const errors: string[] = [];
  let contentType: string | undefined;
  let userAgent: string | undefined;

  // Check Content-Type for POST requests
  const ct = headers.get('content-type');
  if (ct) {
    if (!ct.includes('application/json') && !ct.includes('text/plain')) {
      errors.push('Unsupported content type');
    } else {
      contentType = ct;
    }
  }

  // Validate User-Agent
  const ua = headers.get('user-agent');
  if (ua) {
    if (ua.length > 500) {
      errors.push('User-Agent header too long');
    } else {
      userAgent = ua;
    }
  }

  // Check for suspicious headers
  const suspiciousHeaders = ['x-forwarded-host', 'host'];
  for (const header of suspiciousHeaders) {
    const value = headers.get(header);
    if (value && !isValidHostname(value)) {
      errors.push(`Invalid ${header} header`);
    }
  }

  return { contentType, userAgent, errors };
}

/**
 * Validate hostname to prevent header injection
 */
function isValidHostname(hostname: string): boolean {
  const hostnameRegex = /^[a-zA-Z0-9.-]+$/;
  return hostnameRegex.test(hostname) && hostname.length <= 253;
}