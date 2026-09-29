const CODE_KEY = 'renovation-family-code';

export const getFamilyCode = () => {
  try {
    return localStorage.getItem(CODE_KEY) || '';
  } catch {
    return '';
  }
};

export const setFamilyCode = (code: string) => {
  try {
    localStorage.setItem(CODE_KEY, code.trim());
  } catch {
    // Private mode or blocked storage: the code lasts for this visit only.
  }
};
