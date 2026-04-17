export const navigateBackOr = (navigate: (to: number | string) => void, fallback: string) => {
  if (window.history.length > 1) {
    navigate(-1);
    return;
  }
  navigate(fallback);
};
