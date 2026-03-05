const API_BASE_URL = 'https://app.positron-portal.com';
const REQUEST_TIMEOUT = 30000;

export interface ManifestEntry {
  path: string;
  lastModified: string;
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = REQUEST_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function linkAccount(username: string, password: string): Promise<{ siteId: string; siteName: string; token: string; licenses: string[] }> {
  console.log('[PositronAPI] linkAccount: attempting login...');

  const response = await fetchWithTimeout(`${API_BASE_URL}/linkwebviewaccount`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  console.log('[PositronAPI] linkAccount: status', response.status);

  const data = await response.json().catch(() => null);
  console.log('[PositronAPI] linkAccount: response data', JSON.stringify(data));
  console.log('[PositronAPI] linkAccount: response keys', data ? Object.keys(data) : 'null');

  if (!response.ok || !data?.ok) {
    throw new Error(data?.error || 'Invalid credentials');
  }

  const siteId = data.venueId || data.siteId || data.user?.venueId || data.user?.siteId || data.site_id || data.venue_id;
  const siteName = data.venueName || data.siteName || data.user?.venueName || data.user?.siteName || data.site_name || data.venue_name || 'Default Site';

  console.log('[PositronAPI] linkAccount: resolved siteId:', siteId, 'siteName:', siteName);

  if (!siteId) {
    console.error('[PositronAPI] linkAccount: No siteId/venueId found in response:', JSON.stringify(data));
    throw new Error('Login succeeded but no site ID was returned. Please contact support.');
  }

  const siteIdStr = String(siteId).padStart(6, '0');
  console.log('[PositronAPI] linkAccount: padded siteId:', siteIdStr);

  return {
    siteId: siteIdStr,
    siteName: String(siteName),
    token: data.token || data.sessionId || 'authenticated',
    licenses: data.licenses || [],
  };
}

export async function getManifest(siteId: string): Promise<ManifestEntry[]> {
  console.log('[PositronAPI] getManifest: fetching for site', siteId);

  const response = await fetchWithTimeout(
    `${API_BASE_URL}/api/v1/sites/${siteId}/data/manifest`,
    {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    },
    45000,
  );

  console.log('[PositronAPI] getManifest: status', response.status);

  if (!response.ok) {
    throw new Error(`Failed to fetch manifest (HTTP ${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();
    const rawEntries: unknown[] = Array.isArray(data) ? data : (data.files || data.manifest || []);

    const entries: ManifestEntry[] = rawEntries.map((entry: unknown) => {
      if (typeof entry === 'string') {
        return { path: entry, lastModified: '' };
      }
      const obj = entry as Record<string, unknown>;
      return {
        path: String(obj.path || obj.Path || obj.filePath || obj.name || obj.FileName || ''),
        lastModified: String(obj.lastModified || obj.LastModified || ''),
      };
    });

    console.log('[PositronAPI] getManifest: got', entries.length, 'entries (JSON)');
    if (entries.length > 0) {
      console.log('[PositronAPI] getManifest: first entry path:', entries[0].path);
    }
    return entries;
  }

  const text = await response.text();
  const lines = text.split('\n').filter((l: string) => l.trim());
  const entries: ManifestEntry[] = lines.map((line: string) => {
    const parts = line.split('\t');
    return {
      path: parts[0]?.trim() || line.trim(),
      lastModified: parts[1]?.trim() || '',
    };
  });

  console.log('[PositronAPI] getManifest: got', entries.length, 'entries (text)');
  return entries;
}

export async function getFile(siteId: string, path: string): Promise<string> {
  const url = `${API_BASE_URL}/api/v1/sites/${siteId}/data/file?path=${encodeURIComponent(path)}`;

  const response = await fetchWithTimeout(url, {
    method: 'GET',
    headers: { 'Accept': 'text/plain' },
  });

  if (!response.ok) {
    throw new Error(`Failed to download file: ${path} (HTTP ${response.status})`);
  }

  return response.text();
}
