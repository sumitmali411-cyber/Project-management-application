import { Injectable } from '@angular/core';
import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';

@Injectable({ providedIn: 'root' })
export class MarkdownService {
  constructor() {
    const renderer = new Renderer();

    // In marked v9+, renderer.code receives a token object { text, lang, escaped }
    (renderer as any).code = (token: { text: string; lang?: string }) => {
      const { text, lang } = token;
      if (lang === 'mermaid') {
        const encoded = encodeURIComponent(text);
        return `<div class="mermaid-block" data-mermaid="${encoded}">
          <pre class="mermaid">${this.escapeHtml(text)}</pre>
        </div>`;
      }
      const langClass = lang ? ` class="language-${lang}"` : '';
      return `<pre><code${langClass}>${this.escapeHtml(text)}</code></pre>`;
    };

    marked.use({ renderer, breaks: true, gfm: true });
  }

  render(markdown: string): string {
    const raw = marked.parse(markdown) as string;
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['data-mermaid'] });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
