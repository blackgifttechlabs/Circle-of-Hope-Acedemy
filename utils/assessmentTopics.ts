export const getTopicsForSubjectAndGrade = (subject: string, grade: string): string[] => {
  const gradeMatch = grade.match(/Grade ([1-7])/i);
  const gradeNum = gradeMatch ? parseInt(gradeMatch[1]) : 0;

  if (gradeNum >= 1 && gradeNum <= 3) {
    switch (subject) {
      case 'Mathematics':
        return [
          'Number Concept Development',
          'Computation',
          'Problem Solving',
          'Measurement',
          'Geometry',
          'Data Handling'
        ];
      case 'Religious Education':
        if (gradeNum === 1) {
          return [
            'Belonging',
            'Phases of Life',
            'The Sacred',
            'Festivals',
            'Social Values',
            'Religion and the Environment',
            'Personal Values',
            "Children's Rights and Responsibilities",
            'Topic of Own Choice'
          ];
        } else if (gradeNum === 2) {
          return [
            'Belonging',
            'Phases of Life',
            'The Sacred',
            'Festivals',
            'Social Values',
            'Religion and the Environment',
            'Personal Values',
            "Children's Rights and Responsibilities",
            'Topic of Own Choice'
          ];
        } else if (gradeNum === 3) {
          return [
            'Belonging',
            'Phases of Life',
            'The Sacred',
            'Festivals',
            'Social Values',
            'Religion and the Environment',
            'Personal Values',
            "Children's Rights and Responsibilities",
            'Topic of Own Choice'
          ];
        }
        break;
      case 'English':
        return [
          'Listening and Responding',
          'Speaking and Communicating',
          'Reading and Viewing',
          'Language',
          'Writing',
          'Phonics'
        ];
      case 'Physical Education':
      case 'PE':
        return [
          'Physical Fitness',
          'Motor Skills',
          'Athletics',
          'Sport Skills',
          'Games in Limited Space',
          'Traditional Games'
        ];
      case 'Environmental Studies':
        return [
          'The Social Environment',
          'Health, Safety and Nutrition',
          'The Natural Environment'
        ];
      case 'Handwriting':
        return [];
      case 'Arts':
        return [
          'Visual Art',
          'Music',
          'Drama',
          'Dance'
        ];
      default:
        return [];
    }
  } else if (gradeNum >= 4 && gradeNum <= 7) {
    switch (subject) {
      case 'Physical Education':
      case 'PE':
        return [
          'Physical Fitness',
          'Applied Movement Skills',
          'Health Related Aspects'
        ];
      case 'Life Skills':
        return [
          'Career Guidance',
          'Holistic Wellness',
          'Civic Affairs'
        ];
      case 'English':
        return [
          'Prepared Speaking',
          'Unprepared Speaking',
          'Reading Aloud',
          'Reading Comprehension',
          'Reading & Directed Writing Task',
          'Spelling & Dictation'
        ];
      case 'Mathematics':
        return [
          'Whole Numbers',
          'Computation',
          'Common Fractions',
          'Decimal Fractions',
          'Percentages',
          'Money and Finance',
          'Measurement: Length, Mass, and Capacity',
          'Measurement: Time',
          'Geometry',
          'Mensuration',
          'Data Handling',
          'Patterns, Functions, and Algebra'
        ];
      case 'Religious Education':
      case 'Religious and Moral Education':
      case 'RME':
        return [
          'Religions',
          'Moral Issues'
        ];
      case 'Arts':
        return [
          'Exploring',
          'Creating',
          'Appreciating'
        ];
      default:
        return [];
    }
  }

  return [];
};
