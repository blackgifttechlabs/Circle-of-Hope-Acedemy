import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ActivityLog } from '../types';

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
    return '';
  }
};

const formatDateTime = (value: any) => {
  if (!value) return '-';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

export const printActivityReport = async (logs: ActivityLog[], filterLabel: string) => {
  const doc = new jsPDF('landscape');
  const logo = await fetchImage('https://i.ibb.co/LzYXwYfX/logo.png');

  if (logo) {
    doc.addImage(logo, 'PNG', 14, 10, 18, 18);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(0, 29, 100);
  doc.text('CIRCLE OF HOPE ACADEMY', 38, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 90, 90);
  doc.text('ADMIN ACTIVITY REPORT', 38, 23);
  doc.text(`Filter: ${filterLabel}`, 38, 28);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 38, 33);

  autoTable(doc, {
    startY: 40,
    head: [['Action Time', 'User', 'Role', 'Category', 'Action', 'Details']],
    body: logs.map((log) => [
      formatDateTime(log.createdAt),
      log.actorName || '-',
      log.actorRole || '-',
      log.category || '-',
      log.action || '-',
      log.details || '-',
    ]),
    theme: 'grid',
    headStyles: { fillColor: [0, 29, 100], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 34 },
      1: { cellWidth: 34 },
      2: { cellWidth: 24 },
      3: { cellWidth: 26 },
      4: { cellWidth: 68 },
      5: { cellWidth: 94 },
    },
  });

  doc.save(`COHA_Activity_Report_${filterLabel.replace(/[^a-z0-9]+/gi, '_')}.pdf`);
};
