export const USER_ROLES = [
  "admin",
  "operator",
  "teacher",
  "student",
  "user",
] as const;

export type TUserRole = (typeof USER_ROLES)[number];

