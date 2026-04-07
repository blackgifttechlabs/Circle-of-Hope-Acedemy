import { jsPDF } from "jspdf";
import { Student, TermAssessmentRecord, PRE_PRIMARY_AREAS } from '../types';

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

/** Draw a simple bordered rectangle with optional fill */
const drawRect = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  fillColor?: [number, number, number]
) => {
  if (fillColor) {
    doc.setFillColor(...fillColor);
    doc.rect(x, y, w, h, 'FD');
  } else {
    doc.rect(x, y, w, h, 'S');
  }
};

/** Vertically-centered text inside a cell */
const cellText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  align: 'left' | 'center' | 'right' = 'left',
  padding = 2
) => {
  const textY = y + h / 2 + doc.getFontSize() * 0.35;
  if (align === 'center') {
    doc.text(text, x + w / 2, textY, { align: 'center' });
  } else if (align === 'right') {
    doc.text(text, x + w - padding, textY, { align: 'right' });
  } else {
    doc.text(text, x + padding, textY);
  }
};

export const printGrade0Report = async (
  student: Student,
  record: TermAssessmentRecord,
  termName: string,
  year: string,
  teacherName: string
) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // ─── LOAD IMAGES ───────────────────────────────────────────────
  const namibiaLogoUrl = "https://i.ibb.co/LzYXwYfX/logo.png";
  const schoolLogoUrl  = "https://i.ibb.co/LzYXwYfX/logo.png";
  const principalSigUrl = "https://i.ibb.co/MkKndHWd/eraze-result-medium-1.png";

  const [namibiaLogo, schoolLogo, principalSig] = await Promise.all([
    fetchImage(namibiaLogoUrl),
    fetchImage(schoolLogoUrl),
    fetchImage(principalSigUrl),
  ]);

  // ─── HEADER LOGOS ──────────────────────────────────────────────
  const logoSize = 25;
  if (namibiaLogo) doc.addImage(namibiaLogo, 'JPEG', margin, 8, logoSize, logoSize);
  if (schoolLogo)  doc.addImage(schoolLogo,  'PNG',  pageWidth - margin - logoSize, 8, logoSize, logoSize);

  // ─── HEADER TEXT ───────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  const headerX = margin + logoSize + 3;
  doc.text("P O Box 3675 Ondangwa",                                 headerX, 14);
  doc.text("Cell: + 264 81 666 4074/ +264 85 266 4074",             headerX, 19);
  doc.text("Email: circleofhopeacademy@yahoo.com",                  headerX, 24);
  doc.text("Reg No:7826 Registered with Ministry of Education",     headerX, 29);

  // ─── THICK SEPARATOR LINE ──────────────────────────────────────
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1.2);
  doc.line(margin, 36, pageWidth - margin, 36);
  doc.setLineWidth(0.3);

  // ─── SCHOOL TITLE ──────────────────────────────────────────────
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Circle of Hope Private Academy", pageWidth / 2, 44, { align: "center" });

  // ─── REPORT TITLE BOX ──────────────────────────────────────────
  const titleBoxY = 47;
  const titleBoxH = 13;
  drawRect(doc, margin, titleBoxY, contentWidth, titleBoxH);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  cellText(doc, "PRE-PRIMARY PROGRESS REPORT", margin, titleBoxY, contentWidth, titleBoxH, 'center');

  // ─── STUDENT INFO ROW ──────────────────────────────────────────
  const infoY = titleBoxY + titleBoxH;
  const infoH = 12;
  const col1W = 80;
  const col2W = 55;
  const col3W = contentWidth - col1W - col2W;

  // Name cell
  drawRect(doc, margin, infoY, col1W, infoH);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Name:", margin + 2, infoY + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(student.name || "-", margin + 2, infoY + 9);

  // DOB cell
  drawRect(doc, margin + col1W, infoY, col2W, infoH);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Date of Birth:", margin + col1W + 2, infoY + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(student.dob || "-", margin + col1W + 2, infoY + 9);

  // Grade / Term cell
  drawRect(doc, margin + col1W + col2W, infoY, col3W, infoH);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Grade / Year / Term:", margin + col1W + col2W + 2, infoY + 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Grade 0  |  ${year}  |  ${termName}`, margin + col1W + col2W + 2, infoY + 9);

  // ─── MAIN AREAS TABLE ──────────────────────────────────────────
  // Columns: Area Name | Component | Rating
  // Split into left column (3 areas) and right column (3 areas) like original
  let currentY = infoY + infoH;

  const leftAreas  = ['language', 'environmental', 'arts'];
  const rightAreas = ['math', 'physical', 'religious'];

  const halfW     = contentWidth / 2;
  const leftX     = margin;
  const rightX    = margin + halfW;
  const rowH      = 6.5;
  const areaHeadH = 7;
  const compW     = halfW * 0.72;
  const ratingW   = halfW * 0.28;

  // Header row for both halves
  const tblHeaderH = 11;
  drawRect(doc, leftX,  currentY, halfW, tblHeaderH, [230, 230, 230]);
  drawRect(doc, rightX, currentY, halfW, tblHeaderH, [230, 230, 230]);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  // Draw divider lines on top of header fills
  doc.line(leftX + compW,  currentY, leftX + compW,  currentY + tblHeaderH);
  doc.line(rightX + compW, currentY, rightX + compW, currentY + tblHeaderH);

  cellText(doc, "Learning Area / Component",  leftX,  currentY, compW,   tblHeaderH, 'center');
  cellText(doc, "Rating",                     leftX + compW,  currentY, ratingW, tblHeaderH, 'center');
  cellText(doc, "Learning Area / Component",  rightX, currentY, compW,   tblHeaderH, 'center');
  cellText(doc, "Rating",                     rightX + compW, currentY, ratingW, tblHeaderH, 'center');

  currentY += tblHeaderH;

  // Render one side (left or right) area rows, returns final Y
  const renderSide = (areas: string[], startX: number, startY: number): number => {
    let y = startY;
    areas.forEach(areaId => {
      const area = PRE_PRIMARY_AREAS.find(a => a.id === areaId);
      if (!area) return;

      // Area heading row
      drawRect(doc, startX, y, halfW, areaHeadH, [245, 245, 245]);
      // Redraw divider on top of fill
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(startX + compW, y, startX + compW, y + areaHeadH);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      cellText(doc, area.name.toUpperCase(), startX, y, compW, areaHeadH, 'left', 3);
      y += areaHeadH;

      // Component rows
      area.components.forEach(comp => {
        drawRect(doc, startX, y, halfW, rowH);
        doc.line(startX + compW, y, startX + compW, y + rowH);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        // Truncate component name if too long
        const maxChars = 52;
        const displayName = comp.name.length > maxChars ? comp.name.substring(0, maxChars - 1) + '…' : comp.name;
        cellText(doc, displayName, startX, y, compW, rowH, 'left', 3);

        const rating = record.ratings[comp.id];
        if (rating) {
          let bgColor: [number, number, number] = [255, 255, 255];
          let textColor: [number, number, number] = [0, 0, 0];
          if (rating === 'FM')      { bgColor = [220, 252, 231]; textColor = [22, 163, 74]; }
          else if (rating === 'AM') { bgColor = [254, 249, 195]; textColor = [202, 138, 4]; }
          else if (rating === 'NM') { bgColor = [254, 226, 226]; textColor = [220, 38, 38]; }

          // Fill background
          doc.setFillColor(...bgColor);
          doc.rect(startX + compW, y, ratingW, rowH, 'F');
          // Redraw cell border on top of fill so it stays crisp
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.rect(startX + compW, y, ratingW, rowH, 'S');
          // Redraw inner divider line on top of fill
          doc.line(startX + compW, y, startX + compW, y + rowH);

          // Centered text — exact midpoint
          doc.setTextColor(...textColor);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          const textX = startX + compW + ratingW / 2;
          const textY = y + rowH / 2 + 1.4; // +1.4 = ~half cap-height for 8pt
          doc.text(rating, textX, textY, { align: 'center' });
          doc.setTextColor(0, 0, 0);
        } else {
          // Empty rating cell — still draw border explicitly
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.3);
          doc.rect(startX + compW, y, ratingW, rowH, 'S');
          doc.line(startX + compW, y, startX + compW, y + rowH);
        }

        y += rowH;
      });
    });
    return y;
  };

  const leftEndY  = renderSide(leftAreas,  leftX,  currentY);
  const rightEndY = renderSide(rightAreas, rightX, currentY);

  // Extend shorter side with empty rows to match height of taller side
  const maxEndY = Math.max(leftEndY, rightEndY);

  if (leftEndY < maxEndY) {
    drawRect(doc, leftX, leftEndY, halfW, maxEndY - leftEndY);
    doc.line(leftX + compW, leftEndY, leftX + compW, maxEndY);
  }
  if (rightEndY < maxEndY) {
    drawRect(doc, rightX, rightEndY, halfW, maxEndY - rightEndY);
    doc.line(rightX + compW, rightEndY, rightX + compW, maxEndY);
  }

  currentY = maxEndY;

  // ─── KEY ROW — FM / AM / NM with full descriptions ──────────────
  const keyRowH = 10;
  drawRect(doc, margin, currentY, contentWidth, keyRowH, [248, 248, 248]);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  const keyItems: Array<{ label: string; desc: string; bg: [number,number,number]; tc: [number,number,number] }> = [
    { label: 'FM', desc: 'Fully Mastered',     bg: [220,252,231], tc: [22,163,74]  },
    { label: 'AM', desc: 'Almost Mastered',    bg: [254,249,195], tc: [202,138,4]  },
    { label: 'NM', desc: 'Not Yet Mastered',   bg: [254,226,226], tc: [220,38,38]  },
  ];

  // Lay out items evenly across the full width
  const itemSlotW = contentWidth / keyItems.length;
  const badgeW2 = 14;
  const badgeH2 = 6;

  keyItems.forEach((item, idx) => {
    const slotX = margin + idx * itemSlotW;
    const badgeX = slotX + 6;
    const badgeY2 = currentY + (keyRowH - badgeH2) / 2;
    const textY2 = currentY + keyRowH / 2 + 1.4;

    // Coloured badge
    doc.setFillColor(...item.bg);
    doc.setDrawColor(...item.tc);
    doc.setLineWidth(0.5);
    doc.rect(badgeX, badgeY2, badgeW2, badgeH2, 'FD');
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);

    // Badge label
    doc.setTextColor(...item.tc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(item.label, badgeX + badgeW2 / 2, textY2, { align: 'center' });

    // Description text
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`= ${item.desc}`, badgeX + badgeW2 + 2, textY2);
  });

  doc.setTextColor(0, 0, 0);
  currentY += keyRowH;

  // ─── DAYS ABSENT ───────────────────────────────────────────────
  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Days absent:", margin, currentY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("0", margin + 32, currentY);

  // ─── REMARKS ───────────────────────────────────────────────────
  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Remarks:", margin, currentY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  const remarksText = record.remarks || "No remarks provided.";
  const splitRemarks = doc.splitTextToSize(remarksText, contentWidth - 30);
  doc.text(splitRemarks, margin + 26, currentY);

  // ─── DOUBLE SEPARATOR BEFORE SIGNATURES ────────────────────────
  currentY += splitRemarks.length * 5.5 + 8;
  doc.setLineWidth(0.8);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 1.5;
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);

  // ─── SIGNATURE ROW — Principal only ───────────────────────────
  currentY += 12;

  const col1X = margin;
  const col2X = margin + 28;
  const col3X = margin + 85;
  const col4X = margin + 148;

  // Today's date formatted as DD/MM/YYYY
  const today = new Date();
  const printedDate = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Principal", col1X, currentY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Ms Victoria Joel", col2X, currentY);

  // Signature label + line
  doc.setFont("helvetica", "bold");
  doc.text("Signature", col3X, currentY);
  doc.setLineWidth(0.5);
  doc.line(col3X + 24, currentY, col3X + 60, currentY);

  // Date label + printed date value
  doc.text("Date", col4X, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(printedDate, col4X + 14, currentY);

  doc.setLineWidth(0.3);

  // Principal signature image over the signature line
  if (principalSig) {
    doc.addImage(principalSig, 'PNG', col3X + 22, currentY - 11, 30, 15);
  }

  // ─── SAVE ──────────────────────────────────────────────────────
  doc.save(`Progress_Report_${student.name.replace(/\s+/g, '_')}_${termName}.pdf`);
};
