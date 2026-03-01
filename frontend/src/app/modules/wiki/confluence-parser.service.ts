import { Injectable } from '@angular/core';

/**
 * Converts a subset of Confluence storage format macros to Markdown.
 * 3-pass: panels → code blocks → tables
 */
@Injectable({ providedIn: 'root' })
export class ConfluenceParserService {
  parse(input: string): string {
    let md = input;
    // Pass 1: Confluence panels → blockquotes
    md = md.replace(
      /\{panel(?:[^}]*)?\}([\s\S]*?)\{panel\}/gi,
      (_, content) => content.trim().split('\n').map((l: string) => `> ${l}`).join('\n')
    );

    // Pass 2: Confluence code macros → fenced code blocks
    md = md.replace(
      /\{code(?::language=(\w+))?\}([\s\S]*?)\{code\}/gi,
      (_, lang, code) => `\`\`\`${lang || ''}\n${code.trim()}\n\`\`\``
    );

    // Pass 3: Confluence table markup (|| header ||) → Markdown tables
    const lines = md.split('\n');
    const result: string[] = [];
    let inTable = false;
    for (const line of lines) {
      if (line.trim().startsWith('||')) {
        const cells = line.trim().slice(2, -2).split('||').map(c => c.trim());
        result.push(`| ${cells.join(' | ')} |`);
        if (!inTable) {
          result.push(`| ${cells.map(() => '---').join(' | ')} |`);
          inTable = true;
        }
      } else if (line.trim().startsWith('|') && inTable) {
        result.push(line);
      } else {
        inTable = false;
        result.push(line);
      }
    }

    return result.join('\n');
  }
}
