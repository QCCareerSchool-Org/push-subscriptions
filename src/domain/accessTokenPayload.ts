export type Privileges = {
  deleteEnrollment: boolean;
  void: boolean;
};

export type AccessTokenPayload = {
  id: number;
  exp: number;
  xsrf: string;
  privileges: Privileges;
};

export const isAccessTokenPayload = (value: unknown): value is AccessTokenPayload => {
  if (typeof value === 'object' && value !== null) {
    const v = value as Record<string, unknown>;
    if (typeof v.id === 'number' && typeof v.exp === 'number' && typeof v.xsrf === 'string' && typeof v.privileges === 'object' && v.privileges !== null) {
      const p = v.privileges as Record<string, unknown>;
      return typeof p.deleteEnrollment === 'boolean' && typeof p.void === 'boolean';
    }
  }
  return false;
};
