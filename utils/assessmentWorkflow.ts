import { PRE_PRIMARY_AREAS, Student } from '../types';
import { getTopicsForSubjectAndGrade } from './assessmentTopics';
import { CLASS_LIST_SKILLS } from './classListSkills';
import { getNonPromotionalSubjects, getPromotionalSubjects } from './subjects';

export interface WorkflowSubject {
  id: string;
  label: string;
  category: 'promotional' | 'non-promotional' | 'preprimary';
}

export interface WorkflowTheme {
  id: string;
  label: string;
}

export interface WorkflowTopic {
  id: string;
  label: string;
  componentId?: string;
  theme?: string;
}

export const isGrade1To7Class = (className: string = '') => /Grade [1-7]/i.test(className);

export const isPrePrimaryWorkflowClass = (className: string = '') => !isGrade1To7Class(className);

export const getAssessmentRecordKey = (
  value?: Pick<Student, 'grade' | 'assignedClass'> | string | null
) => {
  if (!value) return 'Grade 0';
  if (typeof value === 'string') return value || 'Grade 0';
  return value.grade || value.assignedClass || 'Grade 0';
};

export const getGradeDisplayValue = (className: string = '') => {
  if (/Grade 0/i.test(className)) return 'Pre-primary';
  return className;
};

export const getAssessmentSubjects = (className: string = ''): WorkflowSubject[] => {
  if (isGrade1To7Class(className)) {
    return [
      ...getPromotionalSubjects(className).map((subject) => ({
        id: subject,
        label: subject,
        category: 'promotional' as const,
      })),
      ...getNonPromotionalSubjects(className).map((subject) => ({
        id: subject,
        label: subject,
        category: 'non-promotional' as const,
      })),
    ];
  }

  return PRE_PRIMARY_AREAS.map((area) => ({
    id: area.id,
    label: area.name,
    category: 'preprimary' as const,
  }));
};

export const getSubjectLabel = (subjectId: string, className: string = '') => {
  if (isGrade1To7Class(className)) return subjectId;
  return PRE_PRIMARY_AREAS.find((area) => area.id === subjectId)?.name || subjectId;
};

export const getDefaultThemesForSubject = (
  className: string = '',
  termId: string,
  subjectId: string
): WorkflowTheme[] => {
  if (isGrade1To7Class(className)) {
    return [{ id: 'default', label: 'All Topics' }];
  }

  return (CLASS_LIST_SKILLS[termId]?.[subjectId] || []).map((theme, index) => ({
    id: String(index),
    label: theme.theme,
  }));
};

export const getDefaultTopicsForTheme = (
  className: string = '',
  termId: string,
  subjectId: string,
  themeId?: string
): WorkflowTopic[] => {
  if (isGrade1To7Class(className)) {
    return getTopicsForSubjectAndGrade(subjectId, className).map((topic) => ({
      id: topic,
      label: topic,
    }));
  }

  const themes = CLASS_LIST_SKILLS[termId]?.[subjectId] || [];
  const selectedTheme = themes[Number(themeId || 0)];
  if (!selectedTheme) return [];

  return selectedTheme.skills.map((skill) => ({
    id: skill.id,
    label: skill.name,
    componentId: skill.componentId,
    theme: selectedTheme.theme,
  }));
};

export const findPrePrimarySkill = (
  termId: string,
  subjectId: string,
  topic: string,
  topicId?: string
) => {
  const themes = CLASS_LIST_SKILLS[termId]?.[subjectId] || [];
  for (const theme of themes) {
    const skill = theme.skills.find((item) => item.id === topicId || item.name === topic);
    if (skill) {
      return {
        ...skill,
        theme: theme.theme,
      };
    }
  }
  return null;
};

export const getPrePrimaryComponentName = (componentId: string) => {
  for (const area of PRE_PRIMARY_AREAS) {
    const component = area.components.find((item) => item.id === componentId);
    if (component) return component.name;
  }
  return componentId;
};
