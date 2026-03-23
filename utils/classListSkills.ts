export const CLASS_LIST_SKILLS: Record<string, Record<string, { theme: string, skills: { id: string, name: string, componentId: string }[] }[]>> = {
  'Term 1': {
    'language': [
      {
        theme: 'THEME 1: MYSELF',
        skills: [
          { id: 'l1_1', name: 'L&R: imitate and recognise', componentId: 'listening' },
          { id: 'l1_2', name: 'S&C: speak with confidence', componentId: 'speaking' },
          { id: 'l1_3', name: 'Pre-R: read pictures L to R', componentId: 'prep_reading' },
          { id: 'l1_4', name: 'Inc R: recognise own name', componentId: 'incidental_reading' },
          { id: 'l1_5', name: 'Pre-Wr: finger ex fasten thread', componentId: 'prep_writing' },
        ]
      },
      {
        theme: 'THEME 2: MY BODY',
        skills: [
          { id: 'l1_6', name: 'L&R: respond to questions', componentId: 'listening' },
          { id: 'l1_7', name: 'S&C: retell parts of story', componentId: 'speaking' },
          { id: 'l1_8', name: 'Pre-R: tell story in sequence', componentId: 'prep_reading' },
          { id: 'l1_9', name: 'Inc R: imitate action cards', componentId: 'incidental_reading' },
          { id: 'l1_10', name: 'Pre-Wr: tear, cut & paste', componentId: 'prep_writing' },
        ]
      },
      {
        theme: 'THEME 3: MY FAMILY',
        skills: [
          { id: 'l1_11', name: 'L&R: carry out instructions', componentId: 'listening' },
          { id: 'l1_12', name: 'S&C: partic in shopping game', componentId: 'speaking' },
          { id: 'l1_13', name: 'Pre-R: complete a picture', componentId: 'prep_reading' },
          { id: 'l1_14', name: 'Inc R: read name, action cards', componentId: 'incidental_reading' },
          { id: 'l1_15', name: 'Pre-Wr: colour picture', componentId: 'prep_writing' },
        ]
      }
    ],
    'math': [
      {
        theme: 'THEME 1: MYSELF',
        skills: [
          { id: 'm1_1', name: 'NC: mechanical counting 1-5', componentId: 'number_concept' },
          { id: 'm1_2', name: 'Class: sort by shape', componentId: 'classification' },
          { id: 'm1_3', name: 'Ser: copy a pattern', componentId: 'seriation' },
          { id: 'm1_4', name: 'Sp R: behind, in front of', componentId: 'spatial_relations' },
          { id: 'm1_5', name: 'Meas: Time: days of the week', componentId: 'measurement' },
        ]
      },
      {
        theme: 'THEME 2: MY BODY',
        skills: [
          { id: 'm1_6', name: 'NC: mechanically counting 1-7', componentId: 'number_concept' },
          { id: 'm1_7', name: 'Class: sort by colour', componentId: 'classification' },
          { id: 'm1_8', name: 'Ser: arrange biggest to smallest', componentId: 'seriation' },
          { id: 'm1_9', name: 'Sp R: below, above', componentId: 'spatial_relations' },
          { id: 'm1_10', name: 'Meas: length; long & short', componentId: 'measurement' },
        ]
      },
      {
        theme: 'THEME 3: MY FAMILY',
        skills: [
          { id: 'm1_11', name: 'NC: identify 1-2 objects without counting', componentId: 'number_concept' },
          { id: 'm1_12', name: 'PS: simple stories 1-3', componentId: 'problem_solving' },
          { id: 'm1_13', name: 'Class: sort by texture', componentId: 'classification' },
          { id: 'm1_14', name: 'Ser: arrange longest to shortest', componentId: 'seriation' },
          { id: 'm1_15', name: 'SR: on, under', componentId: 'spatial_relations' },
          { id: 'm1_16', name: 'Meas: time - day & night events', componentId: 'measurement' },
          { id: 'm1_17', name: 'Meas: capacity - full, empty', componentId: 'measurement' },
          { id: 'm1_18', name: 'Meas: Money 5C', componentId: 'measurement' },
        ]
      }
    ],
    'environmental': [
      {
        theme: 'THEME 1: MYSELF',
        skills: [
          { id: 'e1_1', name: 'GI: Personal information', componentId: 'general_info' },
          { id: 'e1_2', name: 'GI: Emotions', componentId: 'general_info' },
          { id: 'e1_3', name: 'H: Personal Hygeine', componentId: 'health' },
          { id: 'e1_4', name: 'S: Road Safety', componentId: 'safety' },
        ]
      },
      {
        theme: 'THEME 2: MY BODY',
        skills: [
          { id: 'e1_5', name: 'GI: Body Parts', componentId: 'general_info' },
          { id: 'e1_6', name: 'GI: Daily routine', componentId: 'general_info' },
          { id: 'e1_7', name: 'W: Weather', componentId: 'weather' },
          { id: 'e1_8', name: 'SO: Special occasions', componentId: 'special_occasions' },
        ]
      },
      {
        theme: 'THEME 3: MY FAMILY',
        skills: [
          { id: 'e1_9', name: 'GI: Family members', componentId: 'general_info' },
          { id: 'e1_10', name: 'GI: Role of family members', componentId: 'general_info' },
          { id: 'e1_11', name: 'H: Healthy food', componentId: 'health' },
          { id: 'e1_12', name: 'SO: Customs and Ceremonies', componentId: 'special_occasions' },
        ]
      }
    ],
    'arts': [
      {
        theme: 'THEME 1: MYSELF',
        skills: [
          { id: 'a1_1', name: 'VA: spatter painting', componentId: 'visual_art' },
          { id: 'a1_2', name: 'Mus: sing songs', componentId: 'music' },
          { id: 'a1_3', name: 'Dce: free movement', componentId: 'dance' },
          { id: 'a1_4', name: 'Dma: dramatise story', componentId: 'drama' },
        ]
      },
      {
        theme: 'THEME 2: MY BODY',
        skills: [
          { id: 'a1_5', name: 'VA: finger painting', componentId: 'visual_art' },
          { id: 'a1_6', name: 'Mus: action songs', componentId: 'music' },
          { id: 'a1_7', name: 'Dce: repeat dance movements', componentId: 'dance' },
          { id: 'a1_8', name: 'Dma: express feelings', componentId: 'drama' },
        ]
      },
      {
        theme: 'THEME 3: MY FAMILY',
        skills: [
          { id: 'a1_9', name: 'VA: draw family members', componentId: 'visual_art' },
          { id: 'a1_10', name: 'Mus: musical instruments', componentId: 'music' },
          { id: 'a1_11', name: 'Dce: free movement', componentId: 'dance' },
          { id: 'a1_12', name: 'Dma: mime roles of family', componentId: 'drama' },
        ]
      }
    ],
    'rme': [
      {
        theme: 'THEME 1: MYSELF',
        skills: [
          { id: 'r1_1', name: 'M&V: obedience', componentId: 'morals_values' },
          { id: 'r1_2', name: 'SD: respect & accept peers', componentId: 'social_dev' },
          { id: 'r1_3', name: 'ED: act self-assuredly', componentId: 'emotional_dev' },
        ]
      },
      {
        theme: 'THEME 2: MY BODY',
        skills: [
          { id: 'r1_4', name: 'M&V: patience', componentId: 'morals_values' },
          { id: 'r1_5', name: 'SD: play in groups', componentId: 'social_dev' },
          { id: 'r1_6', name: 'ED: work independently', componentId: 'emotional_dev' },
        ]
      },
      {
        theme: 'THEME 3: MY FAMILY',
        skills: [
          { id: 'r1_7', name: 'M&V: loyalty', componentId: 'morals_values' },
          { id: 'r1_8', name: 'SD: respect & accept adults', componentId: 'social_dev' },
          { id: 'r1_9', name: 'ED: express emotions', componentId: 'emotional_dev' },
        ]
      }
    ],
    'physical': [
      {
        theme: 'THEME 1: MYSELF',
        skills: [
          { id: 'p1_1', name: 'GMD: walking activities (tiptoe)', componentId: 'gross_motor' },
          { id: 'p1_2', name: 'GMD: walk backwards, sideways', componentId: 'gross_motor' },
          { id: 'p1_3', name: 'FMC: control eye movement', componentId: 'fine_muscle' },
          { id: 'p1_4', name: 'E-HC: throw & catch beanbag', componentId: 'eye_hand' },
          { id: 'p1_5', name: 'BA: name body parts', componentId: 'body_awareness' },
        ]
      },
      {
        theme: 'THEME 2: MY BODY',
        skills: [
          { id: 'p1_6', name: 'GMD: running & stopping act', componentId: 'gross_motor' },
          { id: 'p1_7', name: 'Bal: stand on one leg', componentId: 'balance' },
          { id: 'p1_8', name: 'E-HC: throw & catch ball', componentId: 'eye_hand' },
          { id: 'p1_9', name: 'E-FC: jump over obstacles', componentId: 'eye_foot' },
          { id: 'p1_10', name: 'BA: name senses', componentId: 'body_awareness' },
        ]
      },
      {
        theme: 'THEME 3: MY FAMILY',
        skills: [
          { id: 'p1_11', name: 'GMD: hop & jump activities', componentId: 'gross_motor' },
          { id: 'p1_12', name: 'FMC: string beads', componentId: 'fine_muscle' },
          { id: 'p1_13', name: 'Bal: walk on balance beam', componentId: 'balance' },
          { id: 'p1_14', name: 'BA: functions of body parts', componentId: 'body_awareness' },
        ]
      }
    ]
  },
  'Term 2': {
    'language': [
      {
        theme: 'THEME 4: MY HOME',
        skills: [
          { id: 'l2_1', name: 'L&R: Repeat clapping pattern', componentId: 'listening' },
          { id: 'l2_2', name: 'S&C: Retell a story', componentId: 'speaking' },
          { id: 'l2_3', name: 'Pre-R: match words to pictures', componentId: 'prep_reading' },
          { id: 'l2_4', name: 'Inc R: beginning sounds', componentId: 'incidental_reading' },
          { id: 'l2_5', name: 'Pre-Wr: L-R drawing', componentId: 'prep_writing' },
        ]
      },
      {
        theme: 'THEME 5: MY SCHOOL',
        skills: [
          { id: 'l2_6', name: 'L&R: Greetings', componentId: 'listening' },
          { id: 'l2_7', name: 'S&C: Retell a story', componentId: 'speaking' },
          { id: 'l2_8', name: 'Pre-R: Name classroom objects', componentId: 'prep_reading' },
          { id: 'l2_9', name: 'Inc R: pictures in correct sequence', componentId: 'incidental_reading' },
          { id: 'l2_10', name: 'Pre-Wr: trace patterns', componentId: 'prep_writing' },
        ]
      },
      {
        theme: 'THEME 6: MY COMMUNITY',
        skills: [
          { id: 'l2_11', name: 'L&R: Answer questions', componentId: 'listening' },
          { id: 'l2_12', name: 'S&C: rhymes & songs', componentId: 'speaking' },
          { id: 'l2_13', name: 'Pre-R: puzzle 12 pce', componentId: 'prep_reading' },
          { id: 'l2_14', name: 'Inc R: match words to pictures', componentId: 'incidental_reading' },
          { id: 'l2_15', name: 'Pre-Wr: pencil grip', componentId: 'prep_writing' },
        ]
      }
    ],
    'math': [
      {
        theme: 'THEME 4: MY HOME',
        skills: [
          { id: 'm2_1', name: 'NC: Count mechanically 1 - 11', componentId: 'number_concept' },
          { id: 'm2_2', name: 'NC: identify numerals 1-4', componentId: 'number_concept' },
          { id: 'm2_3', name: 'Class: Sort thick and thin', componentId: 'classification' },
          { id: 'm2_4', name: 'Ser: Copy number pattern', componentId: 'seriation' },
          { id: 'm2_5', name: 'Sp R: inside, outside', componentId: 'spatial_relations' },
          { id: 'm2_6', name: 'Meas: Days in sequence', componentId: 'measurement' },
        ]
      },
      {
        theme: 'THEME 5: MY SCHOOL',
        skills: [
          { id: 'm2_7', name: 'NC: Count mechanically 1 - 13', componentId: 'number_concept' },
          { id: 'm2_8', name: 'NC: identify numerals 1-5', componentId: 'number_concept' },
          { id: 'm2_9', name: 'Class: sort by shape', componentId: 'classification' },
          { id: 'm2_10', name: 'Ser: Arrange longest-shortest', componentId: 'seriation' },
          { id: 'm2_11', name: 'Sp R: near & far', componentId: 'spatial_relations' },
          { id: 'm2_12', name: 'Meas: mass - heavy/er/est', componentId: 'measurement' },
          { id: 'm2_13', name: 'Meas: Money 5C & 10C', componentId: 'measurement' },
        ]
      },
      {
        theme: 'THEME 6: MY COMMUNITY',
        skills: [
          { id: 'm2_14', name: 'NC: identify numerals 1-6', componentId: 'number_concept' },
          { id: 'm2_15', name: 'PS: simple stories 1-6', componentId: 'problem_solving' },
          { id: 'm2_16', name: 'Class: loud & soft sounds', componentId: 'classification' },
          { id: 'm2_17', name: 'Ser: ordering first & last', componentId: 'seriation' },
          { id: 'm2_18', name: 'Sp R: left & right', componentId: 'spatial_relations' },
          { id: 'm2_19', name: 'Meas: full, half full, empty', componentId: 'measurement' },
        ]
      }
    ],
    'environmental': [
      {
        theme: 'THEME 4: MY HOME',
        skills: [
          { id: 'e2_1', name: 'GI: Different houses', componentId: 'general_info' },
          { id: 'e2_2', name: 'GI: Chores', componentId: 'general_info' },
          { id: 'e2_3', name: 'S: Safety in the home', componentId: 'safety' },
          { id: 'e2_4', name: 'SO: Special occasions', componentId: 'special_occasions' },
        ]
      },
      {
        theme: 'THEME 5: MY SCHOOL',
        skills: [
          { id: 'e2_5', name: 'GI: Knowledge of school', componentId: 'general_info' },
          { id: 'e2_6', name: 'GI: Classroom objects', componentId: 'general_info' },
          { id: 'e2_7', name: 'S: Safety at school', componentId: 'safety' },
          { id: 'e2_8', name: 'W: Weather', componentId: 'weather' },
        ]
      },
      {
        theme: 'THEME 6: MY COMMUNITY',
        skills: [
          { id: 'e2_9', name: 'GI: Namibian flag', componentId: 'general_info' },
          { id: 'e2_10', name: 'GI: Local food & transport', componentId: 'general_info' },
          { id: 'e2_11', name: 'H: Health', componentId: 'health' },
          { id: 'e2_12', name: 'SO: Special occasions', componentId: 'special_occasions' },
        ]
      }
    ],
    'arts': [
      {
        theme: 'THEME 4: MY HOME',
        skills: [
          { id: 'a2_1', name: 'VA: Spatter painting', componentId: 'visual_art' },
          { id: 'a2_2', name: 'Mus: Sing action song', componentId: 'music' },
          { id: 'a2_3', name: 'Dce: Free movement', componentId: 'dance' },
          { id: 'a2_4', name: 'Dma: Dramatise story', componentId: 'drama' },
        ]
      },
      {
        theme: 'THEME 5: MY SCHOOL',
        skills: [
          { id: 'a2_5', name: 'VA: box construction', componentId: 'visual_art' },
          { id: 'a2_6', name: 'Mus: Musical Instruments', componentId: 'music' },
          { id: 'a2_7', name: 'Dce: Choreographed dance', componentId: 'dance' },
          { id: 'a2_8', name: 'Dma: Role-play', componentId: 'drama' },
        ]
      },
      {
        theme: 'THEME 6: MY COMMUNITY',
        skills: [
          { id: 'a2_9', name: 'VA: Collage', componentId: 'visual_art' },
          { id: 'a2_10', name: 'Mus: loud/soft sounds', componentId: 'music' },
          { id: 'a2_11', name: 'Dce: Traditional dance', componentId: 'dance' },
          { id: 'a2_12', name: 'Dma: Mime cultural events', componentId: 'drama' },
        ]
      }
    ],
    'rme': [
      {
        theme: 'THEME 4: MY HOME',
        skills: [
          { id: 'r2_1', name: 'M&V: honesty', componentId: 'morals_values' },
          { id: 'r2_2', name: 'SD: integrate in group', componentId: 'social_dev' },
          { id: 'r2_3', name: 'ED: express self-control', componentId: 'emotional_dev' },
        ]
      },
      {
        theme: 'THEME 5: MY SCHOOL',
        skills: [
          { id: 'r2_4', name: 'M&V: good & bad behaviour', componentId: 'morals_values' },
          { id: 'r2_5', name: 'SD: accept discipline', componentId: 'social_dev' },
          { id: 'r2_6', name: 'ED: wait for turn', componentId: 'emotional_dev' },
        ]
      },
      {
        theme: 'THEME 6: MY COMMUNITY',
        skills: [
          { id: 'r2_7', name: 'M&V: generosity', componentId: 'morals_values' },
          { id: 'r2_8', name: 'SD: can play with a friend', componentId: 'social_dev' },
          { id: 'r2_9', name: 'ED: make decisions', componentId: 'emotional_dev' },
        ]
      }
    ],
    'physical': [
      {
        theme: 'THEME 4: MY HOME',
        skills: [
          { id: 'p2_1', name: 'GMD: stretch activities', componentId: 'gross_motor' },
          { id: 'p2_2', name: 'FMC: rhythmic finger movements', componentId: 'fine_muscle' },
          { id: 'p2_3', name: 'E-HC: Bounce a ball', componentId: 'eye_hand' },
          { id: 'p2_4', name: 'E-FC: dribble a ball', componentId: 'eye_foot' },
        ]
      },
      {
        theme: 'THEME 5: MY SCHOOL',
        skills: [
          { id: 'p2_5', name: 'GMD: push & pull activities', componentId: 'gross_motor' },
          { id: 'p2_6', name: 'FMC: pass on a bean bag', componentId: 'fine_muscle' },
          { id: 'p2_7', name: 'Bal: walk on rope', componentId: 'balance' },
          { id: 'p2_8', name: 'BA: left and right', componentId: 'body_awareness' },
        ]
      },
      {
        theme: 'THEME 6: MY COMMUNITY',
        skills: [
          { id: 'p2_9', name: 'GMD: rolling activities', componentId: 'gross_motor' },
          { id: 'p2_10', name: 'FMC: fasten buttons', componentId: 'fine_muscle' },
          { id: 'p2_11', name: 'Bal: walk heel-to-toe', componentId: 'balance' },
          { id: 'p2_12', name: 'E-HC: roll a ball at skittles', componentId: 'eye_hand' },
        ]
      }
    ]
  },
  'Term 3': {
    'language': [
      {
        theme: 'THEME 7: ANIMALS',
        skills: [
          { id: 'l3_1', name: 'L&R: respond and act', componentId: 'listening' },
          { id: 'l3_2', name: 'S&C: retell story', componentId: 'speaking' },
          { id: 'l3_3', name: 'Pre-R: indicate directions', componentId: 'prep_reading' },
          { id: 'l3_4', name: 'Inc R: identify labelled objects', componentId: 'incidental_reading' },
          { id: 'l3_5', name: 'Pre-Wr: trace patterns on dots', componentId: 'prep_writing' },
        ]
      },
      {
        theme: 'THEME 8: WATER',
        skills: [
          { id: 'l3_6', name: 'L&R: respond to instructions', componentId: 'listening' },
          { id: 'l3_7', name: 'S&C: formulate sentences', componentId: 'speaking' },
          { id: 'l3_8', name: 'Pre-R: arrange pitures in order', componentId: 'prep_reading' },
          { id: 'l3_9', name: 'Inc R: read picture book', componentId: 'incidental_reading' },
          { id: 'l3_10', name: 'Pre-Wr: complete task on time', componentId: 'prep_writing' },
        ]
      },
      {
        theme: 'THEME 9: PLANTS',
        skills: [
          { id: 'l3_11', name: 'L&R: differences & similarities', componentId: 'listening' },
          { id: 'l3_12', name: 'L&R: differences in oral sounds', componentId: 'listening' },
          { id: 'l3_13', name: 'S&C: speak out loud', componentId: 'speaking' },
          { id: 'l3_14', name: 'Pre-R: recognise printed word', componentId: 'prep_reading' },
          { id: 'l3_15', name: 'Inc R: recognise written word', componentId: 'incidental_reading' },
          { id: 'l3_16', name: 'Pre-Wr: trace without crossing lines', componentId: 'prep_writing' },
        ]
      }
    ],
    'math': [
      {
        theme: 'THEME 7: ANIMALS',
        skills: [
          { id: 'm3_1', name: 'NC: Count mechanically 1 - 17', componentId: 'number_concept' },
          { id: 'm3_2', name: 'NC: match sets with numerals 1-7', componentId: 'number_concept' },
          { id: 'm3_3', name: 'Class: sort by size', componentId: 'classification' },
          { id: 'm3_4', name: 'Ser: place objects in given sequence', componentId: 'seriation' },
          { id: 'm3_5', name: 'Sp R: on top of, underneath', componentId: 'spatial_relations' },
          { id: 'm3_6', name: 'Meas: capacity - more/less than', componentId: 'measurement' },
        ]
      },
      {
        theme: 'THEME 8: WATER',
        skills: [
          { id: 'm3_7', name: 'NC: match sets with numerals 1-8', componentId: 'number_concept' },
          { id: 'm3_8', name: 'Class: sort by texture', componentId: 'classification' },
          { id: 'm3_9', name: 'Ser: create own pattern', componentId: 'seriation' },
          { id: 'm3_10', name: 'Sp R: float & sink', componentId: 'spatial_relations' },
          { id: 'm3_11', name: 'Meas: morning, afternoon, night', componentId: 'measurement' },
          { id: 'm3_12', name: 'Meas: Money 5C, 10C & 50C', componentId: 'measurement' },
        ]
      },
      {
        theme: 'THEME 9: PLANTS',
        skills: [
          { id: 'm3_13', name: 'NC: fewer than, more than, equal to', componentId: 'number_concept' },
          { id: 'm3_14', name: 'NC: identify numerals 1-10', componentId: 'number_concept' },
          { id: 'm3_15', name: 'PS: Simple stories 1-9', componentId: 'problem_solving' },
          { id: 'm3_16', name: 'Class: sort by same features', componentId: 'classification' },
          { id: 'm3_17', name: 'Ser: ordinal numbers in a pattern', componentId: 'seriation' },
          { id: 'm3_18', name: 'Sp R: in front of, behind, inside', componentId: 'spatial_relations' },
          { id: 'm3_19', name: 'Meas: measuring length', componentId: 'measurement' },
          { id: 'm3_20', name: 'Meas: Money 5C, 10C, 50C & N$1', componentId: 'measurement' },
        ]
      }
    ],
    'environmental': [
      {
        theme: 'THEME 7: ANIMALS',
        skills: [
          { id: 'e3_1', name: 'GI: Wild and domestic', componentId: 'general_info' },
          { id: 'e3_2', name: 'GI: Animal products', componentId: 'general_info' },
          { id: 'e3_3', name: 'GI: Animal sounds', componentId: 'general_info' },
          { id: 'e3_4', name: 'S: Safety', componentId: 'safety' },
          { id: 'e3_5', name: 'W: Weather', componentId: 'weather' },
        ]
      },
      {
        theme: 'THEME 8: WATER',
        skills: [
          { id: 'e3_6', name: 'GI: Sources of water', componentId: 'general_info' },
          { id: 'e3_7', name: 'GI: Uses of water', componentId: 'general_info' },
          { id: 'e3_8', name: 'H: Health', componentId: 'health' },
          { id: 'e3_9', name: 'S: Safety', componentId: 'safety' },
          { id: 'e3_10', name: 'W: Weather', componentId: 'weather' },
        ]
      },
      {
        theme: 'THEME 9: PLANTS',
        skills: [
          { id: 'e3_11', name: 'GI: Local plants', componentId: 'general_info' },
          { id: 'e3_12', name: 'GI: Edible and poisonous', componentId: 'general_info' },
          { id: 'e3_13', name: 'H: Health', componentId: 'health' },
          { id: 'e3_14', name: 'SO: Special occasions', componentId: 'special_occasions' },
          { id: 'e3_15', name: 'W: Weather', componentId: 'weather' },
        ]
      }
    ],
    'arts': [
      {
        theme: 'THEME 7: ANIMALS',
        skills: [
          { id: 'a3_1', name: 'VA: model animals', componentId: 'visual_art' },
          { id: 'a3_2', name: 'Mus: action songs', componentId: 'music' },
          { id: 'a3_3', name: 'Dce: repeat dance routine', componentId: 'dance' },
          { id: 'a3_4', name: 'Dma: puppet play', componentId: 'drama' },
        ]
      },
      {
        theme: 'THEME 8: WATER',
        skills: [
          { id: 'a3_5', name: 'VA: river collage', componentId: 'visual_art' },
          { id: 'a3_6', name: 'Mus: Musical Instruments', componentId: 'music' },
          { id: 'a3_7', name: 'Dce: free rhythmic movements', componentId: 'dance' },
          { id: 'a3_8', name: 'Dma: finger puppets', componentId: 'drama' },
        ]
      },
      {
        theme: 'THEME 9: PLANTS',
        skills: [
          { id: 'a3_9', name: 'VA: finger paint', componentId: 'visual_art' },
          { id: 'a3_10', name: 'Mus: sing songs', componentId: 'music' },
          { id: 'a3_11', name: 'Dce: harvest dances', componentId: 'dance' },
          { id: 'a3_12', name: 'Dma: dramatise story', componentId: 'drama' },
        ]
      }
    ],
    'rme': [
      {
        theme: 'THEME 7: ANIMALS',
        skills: [
          { id: 'r3_1', name: 'M&V: respect other beliefs', componentId: 'morals_values' },
          { id: 'r3_2', name: 'SD: can cooperate in a group', componentId: 'social_dev' },
          { id: 'r3_3', name: 'ED: make decisions', componentId: 'emotional_dev' },
        ]
      },
      {
        theme: 'THEME 8: WATER',
        skills: [
          { id: 'r3_4', name: 'M&V: respect others rights', componentId: 'morals_values' },
          { id: 'r3_5', name: 'SD: can compromise', componentId: 'social_dev' },
          { id: 'r3_6', name: 'ED: emotional stability', componentId: 'emotional_dev' },
        ]
      },
      {
        theme: 'THEME 9: PLANTS',
        skills: [
          { id: 'r3_7', name: 'M&V: perseverance', componentId: 'morals_values' },
          { id: 'r3_8', name: 'SD: able to share', componentId: 'social_dev' },
          { id: 'r3_9', name: 'ED: handle problem situations', componentId: 'emotional_dev' },
        ]
      }
    ],
    'physical': [
      {
        theme: 'THEME 7: ANIMALS',
        skills: [
          { id: 'p3_1', name: 'GMD: climbing activities', componentId: 'gross_motor' },
          { id: 'p3_2', name: 'GMD: swinging activities', componentId: 'gross_motor' },
          { id: 'p3_3', name: 'FMC: controlled tongue movements', componentId: 'fine_muscle' },
          { id: 'p3_4', name: 'Bal: balance object on head while walking', componentId: 'balance' },
          { id: 'p3_5', name: 'BA: cross the midline', componentId: 'body_awareness' },
        ]
      },
      {
        theme: 'THEME 8: WATER',
        skills: [
          { id: 'p3_6', name: 'GMD: skip with a rope', componentId: 'gross_motor' },
          { id: 'p3_7', name: 'GMD: swinging activities', componentId: 'gross_motor' },
          { id: 'p3_8', name: 'Bal: move over obstacles', componentId: 'balance' },
          { id: 'p3_9', name: 'BA: dominance', componentId: 'body_awareness' },
        ]
      },
      {
        theme: 'THEME 9: PLANTS',
        skills: [
          { id: 'p3_10', name: 'GMD: tense and relax muscles', componentId: 'gross_motor' },
          { id: 'p3_11', name: 'FMC: clapping rhythms', componentId: 'fine_muscle' },
          { id: 'p3_12', name: 'E-HC: throw and catch', componentId: 'eye_hand' },
          { id: 'p3_13', name: 'E-FC: throw and kick', componentId: 'eye_foot' },
        ]
      }
    ]
  }
};
