/**
 * Content Normalization Pipeline
 * HTML to markdown conversion with metadata extraction and language detection
 */

import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import { z } from 'zod';

// Types and interfaces
export interface ContentMetadata {
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;
  qualityScore: number;
  wordCount: number;
  tags: string[];
}

export interface LanguageDetection {
  language: string;
  confidence: number;
}

export interface NormalizationResult {
  markdown: string;
  metadata: ContentMetadata;
  language: LanguageDetection;
}

// Configuration schemas
export const NormalizationConfigSchema = z.object({
  minContentLength: z.number().default(10),
  qualityThreshold: z.number().default(0.3),
  languageConfidenceThreshold: z.number().default(0.5),
  preserveCodeBlocks: z.boolean().default(true),
  stripElements: z.array(z.string()).default(['nav', 'footer', 'aside', 'script', 'style']),
}).strict();

export type NormalizationConfig = z.infer<typeof NormalizationConfigSchema>;

/**
 * Content normalization pipeline with HTML to markdown conversion
 */
export class ContentNormalizer {
  private readonly turndown: TurndownService;
  private readonly config: NormalizationConfig;

  constructor(config: Partial<NormalizationConfig> = {}) {
    this.config = { ...NormalizationConfigSchema.parse({}), ...config };
    this.turndown = this.initializeTurndown();
  }

  /**
   * Initialize Turndown service with custom rules
   */
  private initializeTurndown(): TurndownService {
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
    });

    // Remove unwanted elements
    this.config.stripElements.forEach(element => {
      turndown.remove(element as any);
    });

    // Preserve code blocks with language detection
    turndown.addRule('codeBlocks', {
      filter: ['pre'],
      replacement: (content, node) => {
        const codeElement = node.querySelector('code');
        if (!codeElement) return '```\n' + content + '\n```';

        const className = codeElement.className || '';
        const languageMatch = className.match(/language-(\w+)/);
        const language = languageMatch ? languageMatch[1] : '';

        return '```' + language + '\n' + codeElement.textContent + '\n```';
      },
    });

    return turndown;
  }

  /**
   * Convert HTML to markdown
   */
  htmlToMarkdown(html: string): string {
    if (!html || html.trim().length === 0) {
      return '';
    }

    try {
      return this.turndown.turndown(html).trim();
    } catch (error) {
      console.error('HTML to markdown conversion failed:', error);
      return html; // Fallback to original HTML
    }
  }

  /**
   * Extract metadata from HTML
   */
  extractMetadata(html: string): ContentMetadata {
    if (!html || html.trim().length === 0) {
      return {
        qualityScore: 0,
        wordCount: 0,
        tags: [],
      };
    }

    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract basic metadata
      const title = this.extractTitle(document);
      const description = this.extractDescription(document);
      const author = this.extractAuthor(document);
      const publishedDate = this.extractPublishedDate(document);

      // Calculate content metrics
      const textContent = document.body?.textContent || '';
      const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
      const qualityScore = this.calculateQualityScore(textContent, document);

      return {
        title,
        description,
        author,
        publishedDate,
        qualityScore,
        wordCount,
        tags: [], // TODO: Implement tag extraction
      };
    } catch (error) {
      console.error('Metadata extraction failed:', error);
      return {
        qualityScore: 0,
        wordCount: 0,
        tags: [],
      };
    }
  }

  /**
   * Extract title from document
   */
  private extractTitle(document: Document): string | undefined {
    // Try title tag first
    const titleElement = document.querySelector('title');
    if (titleElement?.textContent?.trim()) {
      return titleElement.textContent.trim();
    }

    // Fallback to first h1
    const h1Element = document.querySelector('h1');
    if (h1Element?.textContent?.trim()) {
      return h1Element.textContent.trim();
    }

    return undefined;
  }

  /**
   * Extract description from meta tags
   */
  private extractDescription(document: Document): string | undefined {
    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement;
    return metaDesc?.content?.trim() || undefined;
  }

  /**
   * Extract author from meta tags
   */
  private extractAuthor(document: Document): string | undefined {
    const metaAuthor = document.querySelector('meta[name="author"]') as HTMLMetaElement;
    return metaAuthor?.content?.trim() || undefined;
  }

  /**
   * Extract published date from meta tags
   */
  private extractPublishedDate(document: Document): string | undefined {
    const metaDate = document.querySelector('meta[property="article:published_time"]') as HTMLMetaElement;
    return metaDate?.content?.trim() || undefined;
  }

  /**
   * Calculate content quality score (0-1)
   */
  private calculateQualityScore(textContent: string, document: Document): number {
    if (!textContent || textContent.trim().length === 0) {
      return 0;
    }

    let score = 0;

    // Length scoring (longer content generally better, up to a point)
    const length = textContent.length;
    if (length > 100) score += 0.2;
    if (length > 500) score += 0.2;
    if (length > 1000) score += 0.1;

    // Structure scoring (headings, paragraphs)
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const paragraphs = document.querySelectorAll('p').length;

    if (headings > 0) score += 0.2;
    if (paragraphs > 2) score += 0.2;

    // Sentence structure scoring
    const sentences = textContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 3) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Detect content language using pattern-based detection
   */
  detectLanguage(content: string): LanguageDetection {
    if (!content || content.trim().length < this.config.minContentLength) {
      return {
        language: 'unknown',
        confidence: 0,
      };
    }

    try {
      // Simple pattern-based language detection
      const cleanContent = content.toLowerCase();
      let detectedLanguage = 'eng'; // Default to English
      let confidence = 0.3;

      // English patterns
      const englishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'has', 'let', 'put', 'say', 'she', 'too', 'use'];
      const englishMatches = englishWords.filter(word => cleanContent.includes(` ${word} `) || cleanContent.startsWith(`${word} `) || cleanContent.endsWith(` ${word}`)).length;

      // Spanish patterns
      const spanishWords = ['que', 'de', 'no', 'a', 'la', 'el', 'es', 'y', 'en', 'lo', 'un', 'por', 'qué', 'me', 'una', 'te', 'los', 'se', 'con', 'para', 'mi', 'está', 'si', 'bien', 'pero', 'yo', 'eso', 'las', 'sí', 'su', 'tu', 'aquí', 'del', 'al', 'como', 'le', 'más', 'esto', 'ya', 'todo', 'esta', 'vamos', 'muy', 'hay', 'ahora', 'algo', 'estoy', 'tengo', 'nos', 'tú', 'nada', 'cuando', 'ha', 'este', 'sé', 'estás', 'así', 'puedo', 'cómo', 'quiero', 'solo', 'soy', 'tiene', 'nos', 'ni', 'sin', 'sobre', 'también', 'hasta', 'sus', 'durante', 'contra', 'estar', 'tu', 'momento', 'donde', 'hecho', 'estaba', 'país', 'mientras', 'sistema', 'segundo', 'nuevo', 'ello', 'gobierno', 'cada', 'mundo', 'año', 'trabajo', 'día', 'tanto', 'tres', 'información', 'tan', 'ciudad', 'dos', 'agua', 'poco', 'nombre', 'cuatro'];
      const spanishMatches = spanishWords.filter(word => cleanContent.includes(` ${word} `) || cleanContent.startsWith(`${word} `) || cleanContent.endsWith(` ${word}`)).length;

      // Determine language based on matches
      if (englishMatches > spanishMatches && englishMatches > 2) {
        detectedLanguage = 'eng';
        confidence = Math.min(0.9, 0.5 + (englishMatches * 0.05));
      } else if (spanishMatches > englishMatches && spanishMatches > 2) {
        detectedLanguage = 'spa';
        confidence = Math.min(0.9, 0.5 + (spanishMatches * 0.05));
      } else if (content.length > 50) {
        // Default to English for longer content if no clear patterns
        detectedLanguage = 'eng';
        confidence = 0.6;
      }

      // Adjust confidence based on content length
      const lengthFactor = Math.min(content.length / 200, 1.0);
      confidence = confidence * lengthFactor;

      return {
        language: confidence > this.config.languageConfidenceThreshold ? detectedLanguage : 'unknown',
        confidence,
      };
    } catch (error) {
      console.error('Language detection failed:', error);
      return {
        language: 'unknown',
        confidence: 0,
      };
    }
  }

  /**
   * Full normalization pipeline
   */
  normalize(html: string): NormalizationResult {
    if (!html || html.trim().length === 0) {
      return {
        markdown: '',
        metadata: {
          qualityScore: 0,
          wordCount: 0,
          tags: [],
        },
        language: {
          language: 'unknown',
          confidence: 0,
        },
      };
    }

    const markdown = this.htmlToMarkdown(html);
    const metadata = this.extractMetadata(html);
    const language = this.detectLanguage(markdown);

    return {
      markdown,
      metadata,
      language,
    };
  }
}

/**
 * Convenience function for quick normalization
 */
export function normalizeContent(html: string, config?: Partial<NormalizationConfig>): NormalizationResult {
  const normalizer = new ContentNormalizer(config);
  return normalizer.normalize(html);
}