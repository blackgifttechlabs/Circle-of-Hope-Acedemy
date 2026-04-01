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
            'Belonging: Self and the community',
            'Phases of Life: Being accepted into a community (welcoming a baby)',
            'The Sacred: Sacred places and objects',
            'Festivals: Joyful celebrations — Advent and Christmas',
            'Social Values: Living together — Interrelationships',
            'Religion and the Environment: The world around us — what is around us',
            'Personal Values: Change, loss and growth / Being at peace with oneself / Turning point in life',
            "Children's Rights and Responsibilities: My basic rights and responsibilities",
            'Topic of Own Choice'
          ];
        } else if (gradeNum === 2) {
          return [
            'Belonging: Families in harmony and in conflict',
            'Phases of Life: Elders and ancestors',
            'The Sacred: Sacred time — special times in our lives and sacred time',
            'Festivals: Passover and Easter',
            'Social Values: Forgiveness and reconciliation',
            'Religion and the Environment: Where our food comes from / The beauty of nature',
            'Personal Values: Being at peace together',
            "Children's Rights and Responsibilities: Rights and responsibilities in the home / Rights and responsibilities at school",
            'Topic of Own Choice'
          ];
        } else if (gradeNum === 3) {
          return [
            'Belonging: Community as a resource',
            'Phases of Life: Growing up — new responsibilities at adolescence',
            'The Sacred: Texts, music and art — sacred texts',
            'Festivals: African traditions and religion / Palm Sunday and Holy Week',
            'Social Values: Democracy — making our own rules by majority decision and following them',
            'Religion and the Environment: Trees in religious traditions',
            'Personal Values: Friendship in everyday life',
            "Children's Rights and Responsibilities: The right to say No — training in assertiveness",
            'Topic of Own Choice'
          ];
        }
        break;
      case 'English':
        return [
          'Listening and Responding',
          'Speaking and Communicating',
          'Reading and Viewing',
          'Writing',
          'Language Structure, Grammar and Language Use'
        ];
      case 'Environmental Studies':
        return [
          'The Social Environment',
          'Health, Safety and Nutrition',
          'The Natural Environment'
        ];
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
    // For grades 4-7, return empty array for now
    return [];
  }

  return [];
};
