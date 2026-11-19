export type SessionUser = {
  name: string;
  initials: string;
  email: string;
  role: string;
  company: string;
};

export const CURRENT_USER: SessionUser = {
  name: 'Muhammad Wahab',
  initials: 'MW',
  email: 'm.wahab@alnoorfoods.example',
  role: 'Exporter · Verified',
  company: 'Al Noor Foods',
};
