import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SystemSettings, Teacher, WeeklyLessonPlan } from '../types';

const LOGO_URL = '/logo.png';
const COHA_CONTACT = 'P.O. Box 3675, Ondangwa | +264 81 666 4074';
const COHA_EMAIL = 'circleofhopeacademy@yahoo.com';

type LessonPlanSection = {
  title: string;
  subjects: string[];
  data: Record<string, Record<string, string>>;
};

type PrintLessonPlanOptions = {
  plan: WeeklyLessonPlan;
  teacher: Teacher | null;
  settings: SystemSettings | null;
  sections: LessonPlanSection[];
  days: string[];
  competencyLabels?: Record<string, Record<string, string>>;
};

const fetchImageAsDataUrl = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to load logo for lesson plan PDF', error);
    return '';
  }
};

const formatDateTime = (value?: string) => {
  if (!value) return new Date().toLocaleString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const cleanFilePart = (value: string) => value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');

export const printLessonPlanPDF = async ({
  plan,
  teacher,
  settings,
  sections,
  days,
  competencyLabels,
}: PrintLessonPlanOptions) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logo = await fetchImageAsDataUrl(LOGO_URL);
  const schoolName = settings?.schoolName || 'Circle of Hope Academy';
  const generatedAt = new Date().toLocaleString();
  const createdAt = formatDateTime(plan.uploadedAt);

  doc.setFillColor(8, 18, 37);
  doc.rect(0, 0, pageWidth, 38, 'F');

  if (logo) {
    doc.addImage(logo, 'PNG', 14, 8, 20, 20);
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(schoolName.toUpperCase(), 40, 16);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Weekly Lesson Plan', 40, 23);
  doc.text(settings?.address || COHA_CONTACT, pageWidth - 14, 14, { align: 'right' });
  doc.text(COHA_EMAIL, pageWidth - 14, 20, { align: 'right' });

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LESSON PLAN', 14, 51);

  const tileY = 58;
  const tileGap = 4;
  const tileWidth = (pageWidth - 28 - tileGap * 4) / 5;
  const tiles = [
    ['Teacher', teacher?.name || 'Teacher'],
    ['Class / Level', plan.classLevel || plan.grade || '-'],
    ['Term', plan.termId?.replace('-', ' ').toUpperCase() || '-'],
    ['Week', String(plan.weekNumber || '-')],
    ['Dates', plan.dates || '-'],
  ];

  tiles.forEach(([label, value], index) => {
    const x = 14 + index * (tileWidth + tileGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, tileY, tileWidth, 18, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), x + 3, tileY + 6);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(doc.splitTextToSize(value, tileWidth - 6), x + 3, tileY + 13);
  });

  autoTable(doc, {
    startY: 82,
    theme: 'grid',
    head: [['Theme', 'Created', 'Generated', 'Teacher Subject']],
    body: [[plan.theme || '-', createdAt, generatedAt, teacher?.subject || '-']],
    headStyles: { fillColor: [0, 29, 100], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 110 },
      1: { cellWidth: 48 },
      2: { cellWidth: 48 },
      3: { cellWidth: 63 },
    },
    margin: { left: 14, right: 14 },
  });

  sections.forEach((section) => {
    const finalY = (doc as any).lastAutoTable?.finalY || 96;
    const startY = finalY + 10;

    if (startY > pageHeight - 42) {
      doc.addPage();
    }

    const tableStartY = ((doc as any).lastAutoTable?.finalY || 34) + 10 > pageHeight - 42 ? 24 : startY;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 29, 100);
    doc.text(section.title.toUpperCase(), 14, tableStartY - 4);

    autoTable(doc, {
      startY: tableStartY,
      theme: 'grid',
      head: [['Day', ...section.subjects]],
      body: days.map((day) => [
        day,
        ...section.subjects.map((subject) => {
          const value = section.data?.[day]?.[subject]?.trim() || '';
          const label = competencyLabels?.[day]?.[subject]?.trim() || '';
          if (!value) return 'No record';
          return label ? `${label}\n${value}` : value;
        }),
      ]),
      headStyles: { fillColor: [0, 29, 100], textColor: 255, fontStyle: 'bold', fontSize: 7, halign: 'center' },
      bodyStyles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2.2, valign: 'top' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 16, fontStyle: 'bold', halign: 'center', fillColor: [241, 245, 249] },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.cell.raw === 'No record') {
          data.cell.styles.textColor = [148, 163, 184];
          data.cell.styles.fontStyle = 'italic';
          data.cell.styles.halign = 'center';
        }
      },
    });
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated by ${teacher?.name || 'Teacher'} on ${generatedAt}`, 14, pageHeight - 7);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - 14, pageHeight - 7, { align: 'right' });
  }

  doc.save(`COHA_Lesson_Plan_${cleanFilePart(plan.classLevel || plan.grade || 'Class')}_Week_${plan.weekNumber || 'Plan'}.pdf`);
};
