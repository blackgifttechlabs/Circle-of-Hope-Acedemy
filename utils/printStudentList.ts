import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Student, SystemSettings } from '../types';

const fetchImage = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
      });
    } catch (error) {
      return "";
    }
  };

export const printStudentList = async (students: Student[], settings: SystemSettings | null) => {
  const doc = new jsPDF();
  
  let totalFees = 0;
  if (settings && settings.fees) {
      settings.fees.forEach(fee => {
        const amount = parseFloat(fee.amount) || 0;
        let multiplier = 1;
        if (fee.frequency === 'Monthly') multiplier = 12; 
        else if (fee.frequency === 'Termly') multiplier = 3; 
        totalFees += (amount * multiplier);
      });
  }

  const logoUrl = "https://i.ibb.co/LzYXwYfX/logo.png";
  const logoData = await fetchImage(logoUrl);
  if (logoData) {
      doc.addImage(logoData, 'PNG', 14, 10, 20, 20);
  }

  doc.setFontSize(14);
  doc.setTextColor(0, 29, 100);
  doc.setFont("helvetica", "bold");
  doc.text("CIRCLE OF HOPE ACADEMY", 40, 18);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("OFFICIAL STUDENT REGISTER & ACCOUNTS", 40, 24);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 40, 29);

  const tableData = students.map(s => [
      s.id || '',
      s.surname || '',
      s.firstName || '',
      s.assignedClass || s.grade || s.level || 'Placement Pending',
      s.parentName || 'N/A',
      `N$ 0.00`, 
      `N$ ${totalFees.toLocaleString()}`
  ]);

  autoTable(doc, {
      startY: 35,
      head: [['ID', 'Surname', 'First Name', 'Grade/Level', 'Parent', 'Paid', 'Due']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 29, 100], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
          5: { halign: 'right', fontStyle: 'bold', textColor: [0, 100, 0] },
          6: { halign: 'right', fontStyle: 'bold', textColor: [200, 0, 0] }
      }
  });

  doc.save("COHA_Register.pdf");
};