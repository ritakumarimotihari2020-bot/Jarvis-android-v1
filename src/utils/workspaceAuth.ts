import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Ensure Firebase is initialized once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Google Workspace scopes configured for JARVIS
export const WORKSPACE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/contacts.readonly',
];

const provider = new GoogleAuthProvider();
for (const scope of WORKSPACE_SCOPES) {
  provider.addScope(scope);
}
// Request offline access prompt to ensure clean credentials
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline',
});

// Flag to prevent race conditions during sign-in
let isSigningIn = false;
// Cache access token in memory only (NEVER in localStorage/sessionStorage per security rules)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google (Popup flow)
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve access token from Google authentication provider.');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('[JARVIS Workspace] Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Get current cached access token
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Sign out and clear cached in-memory token
export const logoutGoogle = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
  cachedUser = null;
};

// Check if currently authenticated with valid in-memory token
export const isGoogleConnected = (): boolean => {
  return Boolean(cachedAccessToken && cachedUser);
};

export const getCurrentGoogleUser = (): User | null => {
  return cachedUser;
};

/* =========================================================================
   GMAIL API HELPERS
   ========================================================================= */

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export const listGmailMessages = async (
  maxResults = 10,
  query = ''
): Promise<GmailMessageSummary[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Workspace access token missing. Please sign in with Google.');

  const qParam = query ? `&q=${encodeURIComponent(query)}` : '';
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}${qParam}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Gmail API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const messagesList = data.messages || [];

  // Fetch header snippets for each message in parallel
  const details = await Promise.all(
    messagesList.slice(0, maxResults).map(async (msg: { id: string; threadId: string }) => {
      try {
        const itemRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!itemRes.ok) return null;
        const item = await itemRes.json();
        const headers = item.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const isUnread = Boolean(item.labelIds?.includes('UNREAD'));

        return {
          id: item.id,
          threadId: item.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject') || '(No Subject)',
          snippet: item.snippet || '',
          date: getHeader('Date'),
          unread: isUnread,
        };
      } catch {
        return null;
      }
    })
  );

  return details.filter((d): d is GmailMessageSummary => d !== null);
};

export const sendGmailMessage = async (
  to: string,
  subject: string,
  body: string
): Promise<{ id: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Workspace access token missing.');

  // Encode RFC 2822 email format as base64url
  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    '',
    body,
  ];

  const rawEmail = emailLines.join('\r\n');
  const base64Encoded = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: base64Encoded }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Failed to send email: ${err.error?.message || response.statusText}`);
  }

  return response.json();
};

export const createGmailDraft = async (
  to: string,
  subject: string,
  body: string
): Promise<{ id: string }> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Workspace access token missing.');

  const emailLines = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    '',
    body,
  ];

  const rawEmail = emailLines.join('\r\n');
  const base64Encoded = btoa(unescape(encodeURIComponent(rawEmail)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw: base64Encoded },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Failed to create draft: ${err.error?.message || response.statusText}`);
  }

  return response.json();
};

/* =========================================================================
   GOOGLE CALENDAR API HELPERS
   ========================================================================= */

export interface CalendarEventItem {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  htmlLink?: string;
}

export const listCalendarEvents = async (maxResults = 10): Promise<CalendarEventItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Workspace access token missing.');

  const nowIso = new Date().toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    nowIso
  )}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Calendar API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((e: any) => ({
    id: e.id,
    summary: e.summary || '(Untitled Event)',
    description: e.description || '',
    start: e.start?.dateTime || e.start?.date || '',
    end: e.end?.dateTime || e.end?.date || '',
    location: e.location || '',
    htmlLink: e.htmlLink || '',
  }));
};

export const createCalendarEvent = async (
  summary: string,
  startTimeIso: string,
  endTimeIso: string,
  description = '',
  location = ''
): Promise<CalendarEventItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Workspace access token missing.');

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary,
      description,
      location,
      start: { dateTime: startTimeIso },
      end: { dateTime: endTimeIso },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Failed to create calendar event: ${err.error?.message || response.statusText}`);
  }

  const e = await response.json();
  return {
    id: e.id,
    summary: e.summary || summary,
    description: e.description || description,
    start: e.start?.dateTime || startTimeIso,
    end: e.end?.dateTime || endTimeIso,
    location: e.location || location,
    htmlLink: e.htmlLink || '',
  };
};

/* =========================================================================
   GOOGLE DRIVE API HELPERS
   ========================================================================= */

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

export const listDriveFiles = async (
  maxResults = 15,
  query = ''
): Promise<DriveFileItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Workspace access token missing.');

  const q = query ? `&q=${encodeURIComponent(query)}` : '';
  const fields = 'fields=files(id,name,mimeType,modifiedTime,size,webViewLink,iconLink)';
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&${fields}${q}&orderBy=modifiedTime desc`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Drive API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name || 'Untitled File',
    mimeType: f.mimeType || 'application/octet-stream',
    modifiedTime: f.modifiedTime || new Date().toISOString(),
    size: f.size ? `${(Number(f.size) / 1024).toFixed(1)} KB` : undefined,
    webViewLink: f.webViewLink,
    iconLink: f.iconLink,
  }));
};

/* =========================================================================
   GOOGLE CONTACTS (PEOPLE API) HELPERS
   ========================================================================= */

export interface ContactItem {
  resourceName: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  photoUrl?: string;
}

export const listGoogleContacts = async (pageSize = 20): Promise<ContactItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Workspace access token missing.');

  const fields = 'personFields=names,emailAddresses,phoneNumbers,photos';
  const url = `https://people.googleapis.com/v1/people/me/connections?pageSize=${pageSize}&${fields}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`People API error: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const connections = data.connections || [];

  return connections.map((p: any) => {
    const name = p.names?.[0]?.displayName || 'Unknown Contact';
    const email = p.emailAddresses?.[0]?.value || '';
    const phone = p.phoneNumbers?.[0]?.value || '';
    const photo = p.photos?.[0]?.url || '';
    return {
      resourceName: p.resourceName || '',
      displayName: name,
      email,
      phoneNumber: phone,
      photoUrl: photo,
    };
  });
};
