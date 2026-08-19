/**
 * Microsoft Entra ID (Azure AD) Graph helpers — OAuth 2.0 client credentials.
 * Permission required: User.Read.All (Application) + admin consent.
 */

export interface AzureAdCredentials {
  tenantId: string;
  clientId: string;
  clientSecret: string;
}

export interface GraphManager {
  id?: string;
  displayName?: string;
  mail?: string | null;
  userPrincipalName?: string;
}

export interface GraphUser {
  id: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
  employeeId?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  officeLocation?: string | null;
  accountEnabled?: boolean | null;
  manager?: GraphManager | null;
}

export interface MappedEntraUser {
  azureObjectId: string;
  email: string;
  fullName: string;
  hrisEmployeeId: string | null;
  departmentName: string | null;
  designation: string | null;
  location: string | null;
  accountEnabled: boolean;
  managerAzureObjectId: string | null;
  managerEmail: string | null;
}

export function mapGraphUser(u: GraphUser): MappedEntraUser | null {
  const emailRaw = (u.mail || u.userPrincipalName || '').trim().toLowerCase();
  if (!emailRaw || !emailRaw.includes('@')) return null;
  const fullName = (u.displayName || emailRaw.split('@')[0] || 'User').trim();
  if (!u.id) return null;

  const manager = u.manager;
  const managerEmail = manager
    ? (manager.mail || manager.userPrincipalName || '').trim().toLowerCase() || null
    : null;

  return {
    azureObjectId: u.id,
    email: emailRaw,
    fullName,
    hrisEmployeeId: u.employeeId?.trim() || null,
    departmentName: u.department?.trim() || null,
    designation: u.jobTitle?.trim() || null,
    location: u.officeLocation?.trim() || null,
    accountEnabled: u.accountEnabled !== false,
    managerAzureObjectId: manager?.id ?? null,
    managerEmail: managerEmail && managerEmail.includes('@') ? managerEmail : null,
  };
}

export async function acquireGraphToken(creds: AzureAdCredentials): Promise<string> {
  const url = `https://login.microsoftonline.com/${encodeURIComponent(creds.tenantId)}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || `Token request failed (${res.status})`);
  }
  return json.access_token;
}

/** Lightweight auth check — token + one user page. */
export async function testGraphConnection(creds: AzureAdCredentials): Promise<{ ok: true; userSampleCount: number }> {
  const token = await acquireGraphToken(creds);
  const res = await fetch(
    'https://graph.microsoft.com/v1.0/users?$top=1&$select=id,displayName,mail,userPrincipalName',
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = (await res.json()) as { value?: GraphUser[]; error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message || `Graph users request failed (${res.status}). Check User.Read.All + admin consent.`);
  }
  return { ok: true, userSampleCount: json.value?.length ?? 0 };
}

export async function fetchAllGraphUsers(creds: AzureAdCredentials): Promise<GraphUser[]> {
  const token = await acquireGraphToken(creds);
  const select =
    'id,displayName,mail,userPrincipalName,employeeId,department,jobTitle,officeLocation,accountEnabled';
  const expand = 'manager($select=id,displayName,mail,userPrincipalName)';
  let url: string | null =
    `https://graph.microsoft.com/v1.0/users?$select=${select}&$expand=${expand}&$top=100`;

  const users: GraphUser[] = [];
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = (await res.json()) as {
      value?: GraphUser[];
      '@odata.nextLink'?: string;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(json.error?.message || `Graph users list failed (${res.status})`);
    }
    users.push(...(json.value ?? []));
    url = json['@odata.nextLink'] ?? null;
  }
  return users;
}
