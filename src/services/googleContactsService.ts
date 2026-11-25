export interface GoogleContact {
  resourceName: string;
  etag: string;
  names?: {
    displayName?: string;
    givenName?: string;
    familyName?: string;
  }[];
  emailAddresses?: {
    value?: string;
    type?: string;
  }[];
  phoneNumbers?: {
    value?: string;
    type?: string;
  }[];
  photos?: {
    url?: string;
    default?: boolean;
  }[];
  organizations?: {
    name?: string;
    title?: string;
    department?: string;
  }[];
  addresses?: {
    formattedValue?: string;
    type?: string;
  }[];
  biographies?: {
    value?: string;
  }[];
}

const PEOPLE_BASE_URL = 'https://people.googleapis.com/v1';

/**
 * List contacts from Google People API
 */
export async function listContacts(
  accessToken: string,
  pageSize: number = 100
): Promise<{ contacts: GoogleContact[]; totalPeople: number }> {
  const url = `${PEOPLE_BASE_URL}/people/me/connections?pageSize=${pageSize}&personFields=names,emailAddresses,phoneNumbers,photos,organizations,addresses,biographies&sortOrder=FIRST_NAME_ASCENDING`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل جلب جهات الاتصال: ${res.statusText}`);
  }

  const data = await res.json();
  return {
    contacts: data.connections || [],
    totalPeople: data.totalPeople || (data.connections ? data.connections.length : 0),
  };
}

/**
 * Search contacts
 */
export async function searchContacts(
  accessToken: string,
  query: string
): Promise<GoogleContact[]> {
  if (!query.trim()) {
    const { contacts } = await listContacts(accessToken);
    return contacts;
  }

  const url = `${PEOPLE_BASE_URL}/people:searchContacts?query=${encodeURIComponent(
    query
  )}&readMask=names,emailAddresses,phoneNumbers,photos,organizations`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل البحث في جهات الاتصال: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.results || []).map((r: any) => r.person);
}

/**
 * Create a new contact
 */
export async function createContact(
  accessToken: string,
  contact: {
    givenName: string;
    familyName?: string;
    email?: string;
    phone?: string;
    organization?: string;
    jobTitle?: string;
  }
): Promise<GoogleContact> {
  const body: any = {
    names: [
      {
        givenName: contact.givenName,
        familyName: contact.familyName || '',
      },
    ],
  };

  if (contact.email) {
    body.emailAddresses = [{ value: contact.email, type: 'work' }];
  }

  if (contact.phone) {
    body.phoneNumbers = [{ value: contact.phone, type: 'work' }];
  }

  if (contact.organization || contact.jobTitle) {
    body.organizations = [
      {
        name: contact.organization || '',
        title: contact.jobTitle || '',
      },
    ];
  }

  const res = await fetch(`${PEOPLE_BASE_URL}/people:createContact`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل إنشاء جهة الاتصال: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Update an existing contact
 */
export async function updateContact(
  accessToken: string,
  resourceName: string,
  etag: string,
  contact: {
    givenName: string;
    familyName?: string;
    email?: string;
    phone?: string;
    organization?: string;
    jobTitle?: string;
  }
): Promise<GoogleContact> {
  const body: any = {
    etag,
    names: [
      {
        givenName: contact.givenName,
        familyName: contact.familyName || '',
      },
    ],
  };

  if (contact.email) {
    body.emailAddresses = [{ value: contact.email, type: 'work' }];
  }

  if (contact.phone) {
    body.phoneNumbers = [{ value: contact.phone, type: 'work' }];
  }

  if (contact.organization || contact.jobTitle) {
    body.organizations = [
      {
        name: contact.organization || '',
        title: contact.jobTitle || '',
      },
    ];
  }

  const url = `${PEOPLE_BASE_URL}/${resourceName}:updateContact?updatePersonFields=names,emailAddresses,phoneNumbers,organizations`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل تحديث جهة الاتصال: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Delete a contact (requires confirmation before calling)
 */
export async function deleteContact(
  accessToken: string,
  resourceName: string
): Promise<void> {
  const res = await fetch(`${PEOPLE_BASE_URL}/${resourceName}:deleteContact`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `فشل حذف جهة الاتصال: ${res.statusText}`);
  }
}
