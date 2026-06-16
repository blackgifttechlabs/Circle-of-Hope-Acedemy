import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Student } from '../types';

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
    console.warn("Failed to load image for PDF", error);
    return "";
  }
};

export const printStudentProfile = async (student: Student) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const logoUrl = "https://i.ibb.co/LzYXwYfX/logo.png";
  const logoData = await fetchImage(logoUrl);
  if (logoData) {
      doc.addImage(logoData, 'PNG', 14, 10, 25, 25);
  }

  doc.setFontSize(16);
  doc.setTextColor(0, 29, 100); 
  doc.setFont("helvetica", "bold");
  doc.text("CIRCLE OF HOPE ACADEMY", 45, 20);
  
  doc.setFontSize(9);
  doc.setTextColor(0, 152, 241); 
  doc.text("ACCESSIBLE EDUCATION FOR ALL", 45, 25);
  
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.setFont("helvetica", "normal");
  doc.text("P.O. Box 3675 Ondangwa", pageWidth - 14, 18, { align: "right" });
  doc.text("Cell: +264 81 666 4074", pageWidth - 14, 22, { align: "right" });
  doc.text("circleofhopeacademy@yahoo.com", pageWidth - 14, 26, { align: "right" });

  doc.setDrawColor(0, 29, 100);
  doc.setLineWidth(0.5);
  doc.line(14, 38, pageWidth - 14, 38);

  doc.setFillColor(245, 247, 250);
  doc.rect(14, 42, pageWidth - 28, 20, 'F');
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.text(student.name.toUpperCase(), 18, 51);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  
  const studentGrade = student.assignedClass || student.grade || student.level || 'Placement Pending';
  doc.text(`Grade/Level: ${studentGrade}   |   Student ID: ${student.id}   |   Enrolled: ${student.enrolledAt?.toDate ? student.enrolledAt.toDate().toLocaleDateString() : 'N/A'}`, 18, 57);

  let currentY = 66;

  const tableStyles: any = {
      theme: 'grid',
      headStyles: { fillColor: [0, 29, 100], fontSize: 8, fontStyle: 'bold', textColor: 255 },
      bodyStyles: { fontSize: 8, textColor: 50, cellPadding: 1.5 },
      columnStyles: { 0: { fontStyle: 'bold', width: 45, fillColor: [250, 250, 250] } },
      margin: { left: 14, right: 14 }
  };

  autoTable(doc, {
      startY: currentY,
      head: [[{ content: 'LEARNER INFORMATION', colSpan: 4, styles: { halign: 'left' } }]],
      body: [
          ['Full Name', student.name || '-', 'Student ID', student.id],
          ['Date of Birth', student.dob || '-', 'Gender', student.gender || '-'],
          ['Citizenship', student.citizenship || '-', 'Region', student.region || '-'],
          ['Address', { content: student.address || '-', colSpan: 3 }],
          ['Special Needs', student.isSpecialNeeds ? `Yes (${student.specialNeedsType || '-'})` : 'No', 'Current Class', studentGrade]
      ],
      ...tableStyles,
      columnStyles: { 
          0: { fontStyle: 'bold', width: 30, fillColor: [248, 248, 248] },
          1: { width: 60 },
          2: { fontStyle: 'bold', width: 30, fillColor: [248, 248, 248] }
      }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
      startY: currentY,
      head: [[{ content: 'PARENT / GUARDIAN DETAILS', colSpan: 4, styles: { halign: 'left' } }]],
      body: [
          ['Father Name', student.fatherName || '-', 'Father Phone', student.fatherPhone || '-'],
          ['Father Email', { content: student.fatherEmail || '-', colSpan: 3 }],
          ['Mother Name', student.motherName || '-', 'Mother Phone', student.motherPhone || '-']
      ],
      ...tableStyles,
      columnStyles: { 
          0: { fontStyle: 'bold', width: 30, fillColor: [248, 248, 248] },
          1: { width: 60 },
          2: { fontStyle: 'bold', width: 30, fillColor: [248, 248, 248] }
      }
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  autoTable(doc, {
      startY: currentY,
      head: [[{ content: 'EMERGENCY & MEDICAL', colSpan: 4, styles: { halign: 'left' } }]],
      body: [
          ['Emergency Contact', student.emergencyName || '-', 'Relation', student.emergencyRelationship || '-'],
          ['Emergency Number', student.emergencyCell || '-', 'Work Contact', student.emergencyWork || '-'],
          ['Medical Conditions', { content: student.medicalConditions || 'None', colSpan: 3 }],
          ['Doctor', student.doctorName || '-', 'Medical Aid', student.hasMedicalAid ? (student.medicalAidName || '-') : 'None'],
          ['Medical Consent', { content: student.medicalConsent ? 'Consent GIVEN for emergency treatment' : 'Consent NOT GIVEN', colSpan: 3, styles: { textColor: student.medicalConsent ? [0, 100, 0] : [200, 0, 0], fontStyle: 'bold' } }]
      ],
      ...tableStyles,
      columnStyles: { 
          0: { fontStyle: 'bold', width: 30, fillColor: [248, 248, 248] },
          1: { width: 60 },
          2: { fontStyle: 'bold', width: 30, fillColor: [248, 248, 248] }
      }
  });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Official Document Generated on ${new Date().toLocaleDateString()}`, 14, 285);
  doc.text("Page 1 of 1", pageWidth - 14, 285, { align: "right" });

  doc.save(`Profile_${student.id}.pdf`);
};