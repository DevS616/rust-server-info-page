interface AdminPayload {
  is_admin?: boolean;
  exp?: number;
  [key: string]: unknown;
}

const decodePayload = (token: string): AdminPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as AdminPayload;
  } catch {
    return null;
  }
};

/**
 * Клиентская проверка админ-токена: структура JWT, флаг is_admin и срок действия.
 * Это НЕ проверка подписи (её делает бэкенд), а защита от явно поддельных/просроченных токенов на фронте.
 */
export const isValidAdminToken = (token: string | null): boolean => {
  if (!token) return false;
  const payload = decodePayload(token);
  if (!payload) return false;
  if (!payload.is_admin) return false;
  if (payload.exp && Date.now() >= payload.exp * 1000) return false;
  return true;
};
