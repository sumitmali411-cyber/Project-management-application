import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MermaidService {
  private initialized = false;
  private mermaid: any = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const m = await import('mermaid');
    this.mermaid = m.default;
    this.mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#4F46E5',
        primaryTextColor: '#f1f5f9',
        primaryBorderColor: '#334155',
        lineColor: '#94a3b8',
        background: '#1e293b',
        mainBkg: '#1e293b',
        nodeBorder: '#334155',
        clusterBkg: '#0f172a',
        titleColor: '#f1f5f9',
        edgeLabelBackground: '#1e293b',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px'
      }
    });
    this.initialized = true;
  }

  async renderAll(container: HTMLElement): Promise<void> {
    await this.initialize();
    const blocks = container.querySelectorAll<HTMLElement>('.mermaid-block');
    let i = 0;
    for (const block of Array.from(blocks)) {
      const code = block.dataset['mermaid'];
      if (!code) continue;
      const id = `mermaid-diagram-${Date.now()}-${i++}`;
      try {
        const { svg } = await this.mermaid.render(id, decodeURIComponent(code));
        block.innerHTML = svg;
      } catch (e) {
        block.innerHTML = `<pre style="color:var(--priority-critical);font-size:0.8rem">Mermaid error: ${e}</pre>`;
      }
    }
  }
}
