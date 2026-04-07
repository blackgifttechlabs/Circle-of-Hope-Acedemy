import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, TermAssessmentRecord, PRE_PRIMARY_AREAS } from '../types';
import { CLASS_LIST_SKILLS } from './classListSkills';
import { getGradeDisplayValue } from './assessmentWorkflow';

const SCHOOL_LOGO_URL = 'https://i.ibb.co/rRHGVgVL/images.png';

const fetchImage = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to load image for PDF', error);
    return '';
  }
};

export const generateSummaryReportPDF = async (
  students: Student[],
  records: Record<string, TermAssessmentRecord>,
  termId: string,
  termName: string,
  teacherName: string,
  className: string = 'Grade 0',
  schoolName: string = 'Circle of Hope Academy'
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const validTermId = ['term-1', 'term-2', 'term-3'].includes(termId) ? termId : 'term-1';
  const termSkills = CLASS_LIST_SKILLS[validTermId] || {};
  const schoolLogo = await fetchImage(SCHOOL_LOGO_URL);

  let isFirstPage = true;

  PRE_PRIMARY_AREAS.forEach((area) => {
    const themes = termSkills[area.id] || [];
    if (themes.length === 0) return;

    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    if (schoolLogo) {
      doc.addImage(schoolLogo, 'PNG', 14, 10, 24, 24);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Registered with Ministry Of Education', 42, 18);
    doc.text('Reg. No 7826', 42, 23);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('P O Box 3675, Ondangwa', pageWidth - 80, 15);
    doc.text('+264 81 666 4074', pageWidth - 80, 20);
    doc.text('+264 85 266 4074', pageWidth - 80, 25);
    doc.text('circleofhopeacademy@yahoo.com', pageWidth - 80, 30);
    doc.text('www.coha-academy.com', pageWidth - 80, 35);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(schoolName.toUpperCase(), pageWidth / 2, 22, { align: 'center' });

    doc.setLineWidth(1);
    doc.line(14, 42, pageWidth - 14, 42);

    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(14, 45, pageWidth - 28, 10);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.text('Class List for Assessment', pageWidth / 2, 52, { align: 'center' });

    doc.rect(14, 55, pageWidth - 28, 8);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `${area.name}    ${termName}    ${getGradeDisplayValue(className)}    Teacher: ${teacherName}`,
      pageWidth / 2,
      61,
      { align: 'center' }
    );

    const head1: any[] = [{
      content: '3 = Fully Mastered\n2 = Almost Mastered\n1 = Not yet Mastered\n\nNames: ↓',
      rowSpan: 2,
      styles: { halign: 'left', valign: 'bottom', cellWidth: 45 },
    }];
    const head2: any[] = [];

    const componentsMap = new Map<string, string>();
    themes.forEach((theme) => {
      head1.push({ content: theme.theme, colSpan: theme.skills.length, styles: { halign: 'center', fillColor: [240, 240, 240] } });
      theme.skills.forEach((skill) => {
        head2.push(skill.name);
        const component = area.components.find((item) => item.id === skill.componentId);
        if (component) componentsMap.set(component.id, component.name);
      });
    });

    const components = Array.from(componentsMap.entries());
    if (components.length > 0) {
      head1.push({ content: 'TOTAL MARKS', colSpan: components.length, styles: { halign: 'center', fillColor: [220, 220, 220] } });
      components.forEach(([, name]) => {
        head2.push(`${name} average`);
      });
    }

    const body: any[] = [];
    students.forEach((student, index) => {
      const row: any[] = [`${index + 1}. ${student.name}`];
      const record = records[student.id];
      const rawScores = record?.rawScores || {};
      const ratings = record?.ratings || {};

      themes.forEach((theme) => {
        theme.skills.forEach((skill) => {
          const score = rawScores[skill.id];
          row.push(score ? score.toString() : '');
        });
      });

      components.forEach(([id]) => {
        row.push(ratings[id] || '');
      });

      body.push(row);
    });

    autoTable(doc, {
      startY: 63,
      margin: { left: 14, right: 14 },
      head: [head1, head2],
      body,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 1,
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        halign: 'center',
        valign: 'middle',
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: { 0: { cellWidth: 40, halign: 'left' } },
      didParseCell: (data) => {
        if (data.section === 'head' && data.row.index === 1 && data.column.index > 0) {
          data.cell.text = [''];
          data.cell.styles.minCellHeight = 28;
        }
      },
      didDrawCell: (data) => {
        if (data.section === 'head' && data.row.index === 1 && data.column.index > 0) {
          const label = head2[data.column.index - 1] || '';
          if (!label) return;
          doc.saveGraphicsState();
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(label, data.cell.x + data.cell.width / 2 + 1.2, data.cell.y + data.cell.height - 1.5, {
            angle: 90,
            align: 'left',
          });
          doc.restoreGraphicsState();
        }
      },
    });
  });

  doc.save(`Summary_Report_${termName}.pdf`);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
