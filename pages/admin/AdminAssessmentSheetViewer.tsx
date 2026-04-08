import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import AssessmentSheet from '../teacher/assessment/AssessmentSheet';
import { Loader } from '../../components/ui/Loader';
import { getTeacherByClass } from '../../services/dataService';

export const AdminAssessmentSheetViewer: React.FC = () => {
  const params = useParams<{ className: string; subject: string }>();
  const [searchParams] = useSearchParams();
  const [teacherName, setTeacherName] = useState('Administrator');
  const [loading, setLoading] = useState(true);

  const className = decodeURIComponent(params.className || '');
  const subject = decodeURIComponent(params.subject || '');
  const termId = searchParams.get('term') || undefined;

  useEffect(() => {
    const fetchTeacher = async () => {
      setLoading(true);
      try {
        const teacher = await getTeacherByClass(className);
        setTeacherName(teacher?.name || 'Administrator');
      } finally {
        setLoading(false);
      }
    };

    if (!className) {
      setLoading(false);
      return;
    }

    fetchTeacher();
  }, [className]);

  if (loading) return <Loader />;

  return (
    <AssessmentSheet
      user={{ name: teacherName, assignedClass: className }}
      backPath="/admin/assessment-progress"
      visibleTermIds={termId ? [termId] : undefined}
      key={`${className}-${subject}-${termId || 'all'}`}
    />
  );
};
