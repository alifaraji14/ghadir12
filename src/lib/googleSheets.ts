import { Registration, Session } from '../types';

interface SheetCreationResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

/**
 * Normalizes attendance status for Google Sheets
 */
const getStatusLabel = (status: string) => {
  switch (status) {
    case 'yes': return 'بله حتماً';
    case 'maybe': return 'احتمالی';
    case 'no': return 'عدم حضور';
    default: return 'نامشخص';
  }
};

/**
 * Builds rows from registration data including companions
 */
const buildSheetRows = (registrations: Registration[], sessions: Session[]) => {
  const getSessionName = (id: string) => {
    const s = sessions.find(item => item.id === id);
    return s ? `${s.name} (${s.timeRange})` : id;
  };

  const headers = [
    'شناسه ثبت‌نام',
    'نقش مهمان',
    'نام و نام خانوادگی',
    'شماره تماس همراه',
    'سن',
    'وضعیت حضور',
    'سانس انتخابی',
    'یادداشت مهمان',
    'تاریخ و زمان ثبت‌نام'
  ];

  const rows: any[][] = [headers];

  registrations.forEach(reg => {
    const PersianDate = reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }) : '-';

    // Main guest row
    rows.push([
      reg.id,
      'مهمان اصلی',
      reg.mainGuestName,
      reg.mainGuestMobile,
      reg.mainGuestAge || '-',
      getStatusLabel(reg.attendanceStatus),
      getSessionName(reg.sessionId),
      reg.notes || '-',
      PersianDate
    ]);

    // Companions rows
    if (reg.companions && reg.companions.length > 0) {
      reg.companions.forEach(comp => {
        rows.push([
          reg.id,
          'همراه',
          comp.fullName,
          comp.mobileNumber || '-',
          comp.age || '-',
          getStatusLabel(comp.attendanceStatus),
          getSessionName(comp.sessionId),
          '-', // no separate notes for companions
          PersianDate
        ]);
      });
    }
  });

  return rows;
};

/**
 * Creates a brand new Google Sheet and populates it with existing registrations
 */
export const createGoogleSheet = async (
  accessToken: string,
  registrations: Registration[],
  sessions: Session[]
): Promise<SheetCreationResult> => {
  const title = `سامانه غدیر ۱۴۰۵ - لیست نهایی ثبت‌نام (${new Date().toLocaleDateString('fa-IR')})`;

  // Create empty spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      properties: { title }
    })
  });

  if (!createRes.ok) {
    const errorData = await createRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'خطا در ایجاد گوگل شیت.');
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl;
  const firstSheetTitle = sheetData.sheets?.[0]?.properties?.title || 'Sheet1';

  // Populate data using values.update API
  const rows = buildSheetRows(registrations, sessions);
  const range = `${firstSheetTitle}!A1:I${rows.length}`;

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: rows
      })
    }
  );

  if (!updateRes.ok) {
    const errorData = await updateRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'خطا در افزودن اطلاعات به گوگل شیت.');
  }

  return { spreadsheetId, spreadsheetUrl };
};

/**
 * Overwrites the specified Google Sheet with latest registrations
 */
export const syncToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  registrations: Registration[],
  sessions: Session[]
): Promise<void> => {
  // First, fetch the spreadsheet metadata to get the actual first sheet name
  const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!metaRes.ok) {
    const errorData = await metaRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'خطا در خواندن مشخصات گوگل شیت.');
  }

  const metaData = await metaRes.json();
  const firstSheetTitle = metaData.sheets?.[0]?.properties?.title || 'Sheet1';

  // Clear sheet values first (to prevent leftover rows from previous run)
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${firstSheetTitle}!A1:Z5000:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );

  if (!clearRes.ok) {
    const errorData = await clearRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'خطا در پاکسازی مقادیر قدیمی شیت.');
  }

  // Rewrite values
  const rows = buildSheetRows(registrations, sessions);
  const range = `${firstSheetTitle}!A1:I${rows.length}`;

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values: rows
      })
    }
  );

  if (!updateRes.ok) {
    const errorData = await updateRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'خطا در بروزرسانی اطلاعات گوگل شیت.');
  }
};
