import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class WikiExportService {
  exportToPdf(title: string): void {
    const originalTitle = document.title;
    document.title = title || 'Wiki Page';
    window.print();
    document.title = originalTitle;
  }
}
