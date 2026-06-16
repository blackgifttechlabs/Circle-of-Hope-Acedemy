export const getPromotionalSubjects = (grade: string): string[] => {
  const gradeMatch = grade.match(/Grade ([1-7])/i);
  const gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : 0;

  let subjects = ['Mathematics', 'English', 'Environmental Studies', 'Handwriting', 'Religious Education'];
  
  if (gradeNum >= 4 && gradeNum <= 7) {
    subjects = subjects.filter(s => s !== 'Handwriting');
  }
  
  return subjects;
};

export const getNonPromotionalSubjects = (grade: string): string[] => {
  const gradeMatch = grade.match(/Grade ([1-7])/i);
  const gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : 0;

  let subjects = ['Physical Education', 'Arts', 'Life Skills'];
  
  if (gradeNum >= 1 && gradeNum <= 3) {
    subjects = subjects.filter(s => s !== 'Life Skills');
  }
  
  return subjects;
};
