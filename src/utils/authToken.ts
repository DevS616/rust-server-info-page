export interface TokenPayload {
  user_id: number;
  steam_id: string;
  username: string;
  avatar: string;
  exp: number;
}

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode token:', e);
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeToken(token);
  if (!payload) return true;
  
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
};

export const isTokenExpiringSoon = (token: string, daysThreshold: number = 7): boolean => {
  const payload = decodeToken(token);
  if (!payload) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const daysInSeconds = daysThreshold * 24 * 60 * 60;
  return payload.exp - now < daysInSeconds;
};

export const refreshTokenIfNeeded = async (): Promise<boolean> => {
  const token = localStorage.getItem('support_token');
  const userData = localStorage.getItem('steam_user');
  
  if (!token || !userData) {
    return false;
  }
  
  if (isTokenExpired(token)) {
    console.log('Token expired, clearing auth data');
    localStorage.removeItem('support_token');
    localStorage.removeItem('steam_user');
    return false;
  }
  
  if (isTokenExpiringSoon(token, 7)) {
    console.log('Token expiring soon, silent refresh recommended');
    return true;
  }
  
  return true;
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('support_token');
  if (!token) return {};
  
  return {
    'Authorization': `Bearer ${token}`
  };
};
