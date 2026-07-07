import { SystemSettings } from '../types';
import { REPORT_TERMS } from './assessmentReports';

export const ADMIN_ASSESSMENT_TERM_KEY = 'coha_admin_assessment_selected_term';
export const ADMIN_ASSESSMENT_TERM_EVENT = 'coha-admin-assessment-term-change';

export const getAssessmentTermOptions = (settings?: SystemSettings | null) => {
  const calendars = settings?.schoolCalendars || [];
  return REPORT_TERMS.map((term) => {
    const calendarTerm = calendars.find((item) => item.id === term.id);
    return {
      id: term.id,
      label: calendarTerm?.termName || term.fallbackName,
    };
  });
};

export const getStoredAdminAssessmentTerm = (settings?: SystemSettings | null) => {
  const options = getAssessmentTermOptions(settings);
  const stored = localStorage.getItem(ADMIN_ASSESSMENT_TERM_KEY);
  if (stored && options.some((term) => term.id === stored)) return stored;
  if (settings?.activeTermId && options.some((term) => term.id === settings.activeTermId)) {
    return settings.activeTermId;
  }
  return options[0]?.id || REPORT_TERMS[0].id;
};

export const setStoredAdminAssessmentTerm = (termId: string) => {
  localStorage.setItem(ADMIN_ASSESSMENT_TERM_KEY, termId);
  window.dispatchEvent(new CustomEvent(ADMIN_ASSESSMENT_TERM_EVENT, { detail: { termId } }));
};
