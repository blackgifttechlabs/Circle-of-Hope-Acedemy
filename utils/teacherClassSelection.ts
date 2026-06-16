import { Teacher } from '../types';

type TeacherLike = Partial<Teacher> | null | undefined;

export const getTeacherAssignedClasses = (teacher: TeacherLike): string[] => {
  const values = [...(teacher?.assignedClasses || []), teacher?.assignedClass || '']
    .map((value) => value?.trim())
    .filter(Boolean) as string[];
  return Array.from(new Set(values));
};

export const getSelectedTeachingClass = (teacher: TeacherLike, search: string): string => {
  const classes = getTeacherAssignedClasses(teacher);
  const params = new URLSearchParams(search);
  const requestedClass = params.get('class')?.trim() || '';

  if (requestedClass) {
    return requestedClass;
  }

  if (teacher?.activeTeachingClass && classes.includes(teacher.activeTeachingClass)) {
    return teacher.activeTeachingClass;
  }

  return classes[0] || teacher?.assignedClass || '';
};

export const withTeachingClass = (path: string, className: string): string => {
  if (!className) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}class=${encodeURIComponent(className)}`;
};

export const isSpecialNeedsClass = (className: string): boolean => className.startsWith('Level ');

export const getTeachingClassStageOptions = (classes: string[]): string[] => {
  const options: string[] = [];

  classes
    .map((className) => className.trim())
    .filter(Boolean)
    .forEach((className) => {
      if (!options.includes(className)) options.push(className);
      if (!/\s-\sStage\s+\d+$/i.test(className)) {
        [1, 2, 3].forEach((stage) => {
          const stageClass = `${className} - Stage ${stage}`;
          if (!options.includes(stageClass)) options.push(stageClass);
        });
      }
    });

  return options;
};

export const matchesTeachingClass = (studentClass: string, className: string): boolean => {
  const normalizedStudentClass = studentClass.trim();
  const normalizedClass = className.trim();
  if (!normalizedStudentClass || !normalizedClass) return false;
  return normalizedStudentClass === normalizedClass || normalizedStudentClass.startsWith(`${normalizedClass} - Stage`);
};
