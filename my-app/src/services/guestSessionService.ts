const GUEST_UUID_KEY = 'guest_session_uuid';
const GUEST_TOKEN_KEY = 'guest_access_token';
const AUTH_BASE_URL = '/auth'; // Use Vite proxy

export interface GuestSessionResponse {
  status: string;
  data: string; // access token
  message: string | null;
  timestamp: string;
}

/**
 * Generate or retrieve guest UUID from localStorage
 */
export const getOrCreateGuestUUID = (): string => {
  let uuid = localStorage.getItem(GUEST_UUID_KEY);
  
  if (!uuid) {
    // Generate new UUID
    uuid = crypto.randomUUID();
    localStorage.setItem(GUEST_UUID_KEY, uuid);
  }
  
  return uuid;
};

/**
 * Get guest access token from localStorage
 */
export const getGuestToken = (): string | null => {
  return localStorage.getItem(GUEST_TOKEN_KEY);
};

/**
 * Save guest access token to localStorage
 */
export const saveGuestToken = (token: string): void => {
  localStorage.setItem(GUEST_TOKEN_KEY, token);
};

/**
 * Clear guest session data
 */
export const clearGuestSession = (): void => {
  localStorage.removeItem(GUEST_UUID_KEY);
  localStorage.removeItem(GUEST_TOKEN_KEY);
};

/**
 * Initialize guest session - get or create UUID and fetch access token
 */
export const initGuestSession = async (): Promise<string> => {
  const uuid = getOrCreateGuestUUID();
  console.log('🔑 Guest UUID:', uuid);
  
  try {
    const url = `${AUTH_BASE_URL}/guest/session?uuid=${uuid}`;
    console.log('📡 Calling API:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      throw new Error(`Failed to create guest session: ${response.statusText}`);
    }

    const data: GuestSessionResponse = await response.json();
    console.log('📡 Response data:', data);
    
    if (data.status === 'OK' && data.data) {
      saveGuestToken(data.data);
      console.log('✅ Guest token saved');
      return data.data;
    } else {
      throw new Error('Invalid response from guest session API');
    }
  } catch (error) {
    console.error('❌ Error initializing guest session:', error);
    if (error instanceof TypeError) {
      console.error('💡 Hint: Make sure backend server is running at', AUTH_BASE_URL);
    }
    throw error;
  }
};

/**
 * Get guest UUID without creating new session
 */
export const getGuestUUID = (): string | null => {
  return localStorage.getItem(GUEST_UUID_KEY);
};
