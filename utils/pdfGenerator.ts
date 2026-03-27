import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, TermAssessmentRecord, PRE_PRIMARY_AREAS } from '../types';
import { CLASS_LIST_SKILLS } from './classListSkills';

export const generateSummaryReportPDF = (
  students: Student[],
  records: Record<string, TermAssessmentRecord>,
  termId: string,
  termName: string,
  teacherName: string,
  schoolName: string = 'Circle of Hope Academy'
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const validTermId = ['term-1', 'term-2', 'term-3'].includes(termId) ? termId : 'term-1';
  const termSkills = CLASS_LIST_SKILLS[validTermId] || {};

  let isFirstPage = true;

  PRE_PRIMARY_AREAS.forEach((area) => {
    const themes = termSkills[area.id] || [];
    if (themes.length === 0) return;

    if (!isFirstPage) {
      doc.addPage();
    }
    isFirstPage = false;

    // --- Header ---
    // Logo placeholder
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.circle(40, 20, 10);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('COHA', 40, 21, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Registered with Ministry Of Education', 40, 35, { align: 'center' });
    doc.text('Reg. No 7826', 40, 39, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('P O Box 3675, Ondangwa', pageWidth - 80, 15);
    doc.text('+264 81 666 4074', pageWidth - 80, 20);
    doc.text('+264 85 266 4074', pageWidth - 80, 25);
    doc.text('circleofhopeacademy@yahoo.com', pageWidth - 80, 30);
    doc.text('www.coha-academy.com', pageWidth - 80, 35);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CIRCLE OF HOPE', pageWidth / 2, 22, { align: 'center' });
    doc.text('ACADEMY', pageWidth / 2, 32, { align: 'center' });

    // Separator line
    doc.setLineWidth(1);
    doc.line(14, 42, pageWidth - 14, 42);
    
    // --- Title ---
    doc.setDrawColor(0);
    doc.setLineWidth(0.2);
    doc.rect(14, 45, pageWidth - 28, 10);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'italic');
    doc.text('Class List for Assessment', pageWidth / 2, 52, { align: 'center' });

    doc.rect(14, 55, pageWidth - 28, 8);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${area.name}    ${termName}    Pre-Primary    Teacher: ${teacherName}`, pageWidth / 2, 61, { align: 'center' });

    // --- Table Data ---
    const head1: any[] = [{ content: '3 = Fully Mastered\n2 = Almost Mastered\n1 = Not yet Mastered\n\nNames: ↓', rowSpan: 2, styles: { halign: 'left', valign: 'bottom', cellWidth: 45 } }];
    const head2: any[] = [];
    
    const componentsMap = new Map<string, string>(); // componentId -> componentName

    themes.forEach(theme => {
      head1.push({ content: theme.theme, colSpan: theme.skills.length, styles: { halign: 'center', fillColor: [240, 240, 240] } });
      theme.skills.forEach(skill => {
        head2.push({ content: skill.name, styles: { halign: 'center', valign: 'bottom' } });
        
        // Find component name from PRE_PRIMARY_AREAS
        const comp = area.components.find(c => c.id === skill.componentId);
        if (comp) componentsMap.set(comp.id, comp.name);
      });
    });

    // Total Marks section
    const components = Array.from(componentsMap.entries());
    if (components.length > 0) {
      head1.push({ content: 'TOTAL MARKS', colSpan: components.length, styles: { halign: 'center', fillColor: [220, 220, 220] } });
      components.forEach(([id, name]) => {
        head2.push({ content: `${name} average`, styles: { halign: 'center', valign: 'bottom' } });
      });
    }

    const body: any[] = [];
    
    // Grading key in the first column for the first few rows?
    // Autotable doesn't easily support a complex left column spanning multiple rows while having data rows.
    // We'll just put the student names and numbers.
    
    students.forEach((student, index) => {
      const row: any[] = [`${index + 1}. ${student.name}`];
      const record = records[student.id];
      const rawScores = record?.rawScores || {};
      const ratings = record?.ratings || {};
      
      themes.forEach(theme => {
        theme.skills.forEach(skill => {
          const score = rawScores[skill.id];
          row.push({ content: score ? score.toString() : '', styles: { halign: 'center' } });
        });
      });

      components.forEach(([id, name]) => {
        const rating = ratings[id];
        row.push({ content: rating || '', styles: { halign: 'center', fontStyle: 'bold' } });
      });

      body.push(row);
    });

    autoTable(doc, {
      startY: 63,
      margin: { left: 14, right: 14 },
      head: [head1, head2],
      body: body,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 40 } },
      didDrawCell: function(data) {
        // We can rotate text here if needed, but for now we rely on autoTable's text wrapping
        // To make it look like the image, we can draw vertical text manually, but it's complex.
        // Let's stick to wrapped text for now, it's readable.
      }
    });
  });

  // Download and print
  doc.save(`Summary_Report_${termName}.pdf`);
  doc.autoPrint();
  window.open(doc.output('bloburl'), '_blank');
};
