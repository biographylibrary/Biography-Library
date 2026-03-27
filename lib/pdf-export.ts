import jsPDF from 'jspdf';
import { BIOGRAPHY_SECTIONS } from './editor-constants';

interface BiographyData {
  title: string;
  author_name: string;
  content: Record<string, { text: string }>;
  content_freeflow?: string;
  biography_mode?: 'sections' | 'freeflow';
  created_at: string;
}

export function generateBiographyPDF(biography: BiographyData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  const addPageNumber = () => {
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  };

  doc.setFont('times', 'normal');

  yPosition = 80;
  doc.setFontSize(32);
  doc.setTextColor(20, 184, 166);
  const titleLines = doc.splitTextToSize(biography.title, maxWidth);
  titleLines.forEach((line: string) => {
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;
  });

  yPosition += 20;
  doc.setFontSize(16);
  doc.setTextColor(100, 100, 100);
  doc.text(`By ${biography.author_name}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 30;
  doc.setFontSize(12);
  const date = new Date(biography.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  doc.text(date, pageWidth / 2, yPosition, { align: 'center' });

  addPageNumber();

  if (biography.biography_mode === 'freeflow') {
    doc.addPage();
    yPosition = margin;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont('times', 'normal');

    const freeflowText = biography.content_freeflow || '';
    const paragraphs = freeflowText.split('\n\n');
    paragraphs.forEach((paragraph) => {
      if (!paragraph.trim()) return;
      const lines = doc.splitTextToSize(paragraph.trim(), maxWidth);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - margin - 10) {
          addPageNumber();
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 7;
      });
      yPosition += 5;
    });

    addPageNumber();
  } else {
    doc.addPage();
    yPosition = margin;

    doc.setFontSize(24);
    doc.setTextColor(20, 184, 166);
    doc.text('Table of Contents', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);

    const tocEntries: { title: string; page: number }[] = [];
    let currentPage = 3;

    BIOGRAPHY_SECTIONS.forEach((section) => {
      const sectionData = biography.content[section.key];
      if (sectionData && sectionData.text.trim()) {
        tocEntries.push({ title: section.title, page: currentPage });
        const textLines = doc.splitTextToSize(sectionData.text, maxWidth);
        const estimatedPages = Math.ceil((textLines.length * 5 + 30) / (pageHeight - 2 * margin));
        currentPage += estimatedPages;
      }
    });

    tocEntries.forEach((entry) => {
      if (yPosition > pageHeight - margin) {
        addPageNumber();
        doc.addPage();
        yPosition = margin;
      }
      doc.setFont('times', 'normal');
      doc.text(entry.title, margin, yPosition);
      doc.setFont('times', 'normal');
      const dots = '.'.repeat(Math.floor((maxWidth - doc.getTextWidth(entry.title) - doc.getTextWidth(entry.page.toString())) / doc.getTextWidth('.')));
      doc.text(dots, margin + doc.getTextWidth(entry.title) + 2, yPosition);
      doc.text(entry.page.toString(), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 8;
    });

    addPageNumber();

    BIOGRAPHY_SECTIONS.forEach((section) => {
      const sectionData = biography.content[section.key];
      if (!sectionData || !sectionData.text.trim()) {
        return;
      }

      doc.addPage();
      yPosition = margin;

      doc.setFontSize(20);
      doc.setTextColor(20, 184, 166);
      doc.text(section.title, margin, yPosition);
      yPosition += 15;

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('times', 'normal');

      const paragraphs = sectionData.text.split('\n\n');
      paragraphs.forEach((paragraph) => {
        if (!paragraph.trim()) return;

        const lines = doc.splitTextToSize(paragraph.trim(), maxWidth);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - margin - 10) {
            addPageNumber();
            doc.addPage();
            yPosition = margin;
          }
          doc.text(line, margin, yPosition);
          yPosition += 7;
        });
        yPosition += 5;
      });

      addPageNumber();
    });
  }

  const fileName = `${biography.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
