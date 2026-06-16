export const buildGmailComposeUrl = ({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) => {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to,
    su: subject,
    body,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
};

export const openGmailDraft = (draft: { to: string; subject: string; body: string }) => {
  const gmailWindow = window.open(buildGmailComposeUrl(draft), '_blank', 'noopener,noreferrer');

  if (!gmailWindow) {
    window.location.href = buildGmailComposeUrl(draft);
  }
};
