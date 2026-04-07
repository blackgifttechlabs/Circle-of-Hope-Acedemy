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
        if (gradeNum === 4) {
          return [
            'Preparatory activities',
            'Imitative activities',
            'Athletics (the start)',
            'Acrobatics tumbling',
            'Large group activities',
            'Games',
            'Creative dance',
            'Water activities – entry into water',
            'Sport skills',
            'Health and physical well-being'
          ];
        } else if (gradeNum === 5) {
          return [
            'Endurance activities',
            'Cardiorespiratory endurance activities',
            'Sprints',
            'Middle distance running',
            'Acrobatics tumbling',
            'Competition in small group activities',
            'Games',
            'Creative dance',
            'Swimming strokes',
            'Sport skills',
            'Health and physical well-being',
            'Healthy living habits'
          ];
        } else if (gradeNum === 6) {
          return [
            'Muscular strength and endurance activities',
            'Flexibility activities',
            'Relays',
            'Hurdles',
            'High jump',
            'Acrobatics jumping and vaulting',
            'Acrobatics balancing activities',
            'Competition in large group activities',
            'Tag and dodging games',
            'Social dance',
            'Water safety and life-saving skills and techniques',
            'Water activities with apparatus and stunts',
            'Sport skills',
            'Healthy living habits',
            'Posture'
          ];
        } else if (gradeNum === 7) {
          return [
            'Speed activities',
            'Fitness evaluation',
            'Knowledge and value of general fitness',
            'Long jump',
            'Shot put',
            'Turbo javelin throwing',
            'Sportsmanship',
            'Fitness',
            'Challenging activities',
            'Races and relays',
            'Participation in games',
            'Traditional games',
            'Self-designed games',
            'Traditional rhythmical movement with hand apparatus',
            'Water games and competitions / Water games and safety',
            'Traffic rules and regulations',
            'Sport skills',
            'Nutrition',
            'Harmful substance/habits/practices'
          ];
        }
        break;
      case 'Life Skills':
        return [
          'Career Guidance',
          'Holistic Wellness',
          'Civic Affairs'
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
      case 'Religious and Moral Education':
      case 'RME':
        return [
          'Religion',
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
