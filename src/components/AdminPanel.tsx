import React, { useState, useEffect } from 'react';
import { 
  Key, ShieldCheck, Settings, Users, Calendar, Download, Trash2, 
  Search, ToggleLeft, ToggleRight, Save, Eye, EyeOff, Loader2, Edit3, CheckCircle, RefreshCw, XCircle,
  FileSpreadsheet, DatabaseZap, Link2, Share2
} from 'lucide-react';
import { Session, EventSetting, Registration } from '../types';
import { googleSignIn, initAuth, logoutGoogle } from '../lib/googleAuth';
import { createGoogleSheet, syncToGoogleSheet } from '../lib/googleSheets';

interface AdminPanelProps {
  sessions: Session[];
  settings: EventSetting;
  onRefresh: () => void;
  onEditRegistration: (reg: Registration) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  sessions, 
  settings, 
  onRefresh,
  onEditRegistration 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // States
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [regsError, setRegsError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');

  // Settings Forms
  const [eventSettingForm, setEventSettingForm] = useState<EventSetting>(settings);
  const [settingsSaveLoading, setSettingsSaveLoading] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // Session Capacity editing helper map
  const [editingSessionCaps, setEditingSessionCaps] = useState<{ [id: string]: number }>({});
  const [editingSessionStatus, setEditingSessionStatus] = useState<{ [id: string]: boolean }>({});
  const [sessionSaveLoading, setSessionSaveLoading] = useState<{ [id: string]: boolean }>({});

  // Google Sheets integration state
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(localStorage.getItem('ghadir_google_spreadsheet_id'));
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(localStorage.getItem('ghadir_google_spreadsheet_url'));
  const [sheetSyncing, setSheetSyncing] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const adminTokenKey = 'ghadir_admin_password_token';

  // Listen to Google Auth status
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Sync to Google Sheet when list of registrations changes
  useEffect(() => {
    const activeSheetId = spreadsheetId || localStorage.getItem('ghadir_google_spreadsheet_id');
    if (googleToken && activeSheetId && registrations.length > 0) {
      handleSyncSheet(googleToken);
    }
  }, [registrations, googleToken, spreadsheetId]);

  // Autologin check on mount
  useEffect(() => {
    const cached = localStorage.getItem(adminTokenKey);
    if (cached) {
      setPassword(cached);
      verifyPassword(cached);
    }
  }, []);

  useEffect(() => {
    if (settings) {
      setEventSettingForm(settings);
    }
  }, [settings]);

  useEffect(() => {
    if (sessions && Object.keys(editingSessionCaps).length === 0) {
      const caps: { [id: string]: number } = {};
      const status: { [id: string]: boolean } = {};
      sessions.forEach(s => {
        caps[s.id] = s.capacity;
        status[s.id] = s.isClosed;
      });
      setEditingSessionCaps(caps);
      setEditingSessionStatus(status);
    }
  }, [sessions]);

  const verifyPassword = async (pwdToVerify: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: pwdToVerify }),
      });

      if (!response.ok) {
        throw new Error('رمز عبور غیرمعتبر است.');
      }

      localStorage.setItem(adminTokenKey, pwdToVerify);
      setIsAuthenticated(true);
      fetchRegistrations(pwdToVerify);
    } catch (err: any) {
      setAuthError(err.message || 'خطا در احراز هویت.');
      localStorage.removeItem(adminTokenKey);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPassword(password);
  };

  const handleLogout = () => {
    localStorage.removeItem(adminTokenKey);
    setPassword('');
    setIsAuthenticated(false);
    setRegistrations([]);
  };

  const fetchRegistrations = async (pwdToken?: string) => {
    const token = pwdToken || password || localStorage.getItem(adminTokenKey) || '';
    if (!token) return;

    setRegsLoading(true);
    setRegsError(null);
    try {
      const response = await fetch('/api/admin/registrations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
         throw new Error(data.error || 'خطا در دریافت لیست ثبت‌نام‌ها.');
      }
      setRegistrations(data.registrations || []);
    } catch (err: any) {
      setRegsError(err.message || 'خطا در دسترسی به فید ثبت‌نام.');
    } finally {
      setRegsLoading(false);
    }
  };

  // Saved edited settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaveLoading(true);
    setSettingsSuccessMsg(null);

    const activeToken = password || localStorage.getItem(adminTokenKey) || '';

    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify(eventSettingForm)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'خطا در ارتقای تنظیمات.');
      }

      setSettingsSuccessMsg('تنظیمات عمومی رویداد غدیر با موفقیت به‌روزرسانی شد.');
      onRefresh(); // trigger parent update
    } catch (error: any) {
      alert(error.message || 'خطا در ثبت اطلاعات.');
    } finally {
      setSettingsSaveLoading(false);
    }
  };

  // Modify individual session capacities
  const handleSaveSessionCaps = async (sessionId: string) => {
    setSessionSaveLoading(prev => ({ ...prev, [sessionId]: true }));
    const targetCapacity = editingSessionCaps[sessionId];
    const targetClosed = editingSessionStatus[sessionId];
    const activeToken = password || localStorage.getItem(adminTokenKey) || '';

    try {
      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeToken}`
        },
        body: JSON.stringify({
          capacity: targetCapacity,
          isClosed: targetClosed
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'خطا در ذخیره ویرایش سانس.');
      }

      onRefresh(); // recall info
      alert('ظرفیت و وضعیت سانس مورد نظر مرتب گردید.');
    } catch (err: any) {
      alert(err.message || 'خطا در بروزرسانی سانس.');
    } finally {
      setSessionSaveLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  // Delete RSVP Row
  const handleDeleteRegistration = async (id: string) => {
    if (!window.confirm(`آیا از حذف دائم و باطل‌سازی کل بلیت شناسه ${id} کاملاً مطمئن هستید؟`)) return;

    const activeToken = password || localStorage.getItem(adminTokenKey) || '';

    try {
      const response = await fetch(`/api/admin/registrations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${activeToken}`
        }
      });

      if (!response.ok) {
         const data = await response.json();
         throw new Error(data.error || 'خطا در حذف بلیت.');
      }

      alert('ثبت‌نام با موفقیت منحل و حذف گردید.');
      fetchRegistrations(activeToken);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'خطایی رخ داد.');
    }
  };

  // Google Workspace Sheets integration operations
  const handleGoogleSignInAction = async () => {
    try {
      setSheetSyncing(true);
      setSheetError(null);
      const res = await googleSignIn();
      if (res) {
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        alert('اتصال با حساب گوگل با موفقیت به ثبت رسید.');
      }
    } catch (err: any) {
      setSheetError(err.message || 'خطا در برقراری ارتباط با گوگل.');
    } finally {
      setSheetSyncing(false);
    }
  };

  const handleCreateSheet = async () => {
    let activeToken = googleToken;
    try {
      setSheetSyncing(true);
      setSheetError(null);

      if (!activeToken) {
        const res = await googleSignIn();
        if (!res) return;
        setGoogleUser(res.user);
        setGoogleToken(res.accessToken);
        activeToken = res.accessToken;
      }

      const result = await createGoogleSheet(activeToken, registrations, sessions);
      setSpreadsheetId(result.spreadsheetId);
      setSpreadsheetUrl(result.spreadsheetUrl);
      localStorage.setItem('ghadir_google_spreadsheet_id', result.spreadsheetId);
      localStorage.setItem('ghadir_google_spreadsheet_url', result.spreadsheetUrl);
      alert('فایل گوگل شیتز زنده با موفقیت ساخته شد و اطلاعات اولیه به آن انتقال یافت.');
    } catch (err: any) {
      setSheetError(err.message || 'خطا در ارتباط یا ساخت فایل گوگل شیت.');
    } finally {
      setSheetSyncing(false);
    }
  };

  const handleSyncSheet = async (customToken?: string) => {
    const activeToken = customToken || googleToken;
    const activeSheetId = spreadsheetId || localStorage.getItem('ghadir_google_spreadsheet_id');
    if (!activeToken || !activeSheetId) return;

    try {
      setSheetSyncing(true);
      setSheetError(null);
      await syncToGoogleSheet(activeToken, activeSheetId, registrations, sessions);
    } catch (err: any) {
      console.error('Failed to auto-sync Google Sheet:', err);
    } finally {
      setSheetSyncing(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید اتصال گوگل شیتز را متوقف کنید؟')) return;
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      setSpreadsheetId(null);
      setSpreadsheetUrl(null);
      localStorage.removeItem('ghadir_google_spreadsheet_id');
      localStorage.removeItem('ghadir_google_spreadsheet_url');
      alert('اتصال گوگل شیت با موفقیت لغو شد.');
    } catch (err: any) {
      alert('خطا در قطع اتصال: ' + err.message);
    }
  };

  // Client-side CSV Exporter with BOM Excel Encoding support
  const handleExportCSV = () => {
    if (registrations.length === 0) return;

    // Header layout
    const headers = [
      'شناسه ثبت‌نام',
      'تاریخ عضویت',
      'نقش',
      'نام و نام خانوادگی',
      'شماره همراه',
      'سن',
      'وضعیت حضور',
      'سانس انتخابی',
      'یادداشت مهمان'
    ];

    const translateStatePersian = (status: string, isCompanion = false) => {
      switch (status) {
        case 'yes': return isCompanion ? 'انشاءالله می‌آید' : 'انشاءالله می‌آیم';
        case 'maybe': return isCompanion ? 'شاید بیاید' : 'شاید بیایم';
        case 'no': return isCompanion ? 'نمی‌آید' : 'نمی‌آیم';
        default: return 'نامشخص';
      }
    };

    const rows: string[][] = [];

    registrations.forEach(r => {
      const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString('fa-IR') : 'نامشخص';
      const notesClean = r.notes ? r.notes.replace(/\r?\n|\r/g, ' ') : '';
      const guestSessionName = r.session?.name || getSessionName(r.sessionId);

      // Row 1: Dedicated row for the main guest (now simply called 'مهمان')
      rows.push([
        r.id,
        dateStr,
        'مهمان',
        r.mainGuestName,
        r.mainGuestMobile,
        String(r.mainGuestAge || '-'),
        translateStatePersian(r.attendanceStatus),
        guestSessionName,
        notesClean
      ]);

      // Row 2+: Dedicated separate rows for each companion if they exist
      r.companions.forEach(comp => {
        const compSessionName = getSessionName(comp.sessionId);
        rows.push([
          r.id,
          dateStr,
          'همراه',
          comp.fullName,
          comp.mobileNumber || '-',
          String(comp.age || '-'),
          translateStatePersian(comp.attendanceStatus, true),
          compSessionName,
          notesClean
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Excel compatibility BOM
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ghadir_reservations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSessionName = (id: string) => {
    return sessions.find(s => s.id === id)?.name || id;
  };

  // Searching filter matching
  const filteredRegs = registrations.filter(r => {
    const q = searchFilter.toLowerCase().trim();
    if (!q) return true;
    return (
      r.id.toLowerCase().includes(q) ||
      r.mainGuestName.toLowerCase().includes(q) ||
      r.mainGuestMobile.includes(q) ||
      r.companions.some(c => c.fullName.toLowerCase().includes(q) || (c.mobileNumber && c.mobileNumber.includes(q)))
    );
  });

  if (!isAuthenticated) {
    return (
      <div className="bg-[#fcfaf2] rounded-2xl border border-[#ebdcb9] shadow-sm max-w-md mx-auto p-6 text-right">
        <div className="text-center pb-5 mb-5 border-b border-stone-200">
          <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-3">
            <Key className="w-5 h-5" />
          </div>
          <h2 className="text-lg font-black text-teal-900">احراز هویت و ورود مدیر</h2>
          <p className="text-3xs text-amber-800 mt-1 font-bold">جهت ورود رمز عبور مدیریت را وارد فرمایید.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-4xs font-bold text-stone-600 mb-1">رمز عبور مدیریت</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-teal-500 font-mono text-center font-bold"
            />
          </div>

          {authError && (
            <div className="text-rose-600 font-bold text-2xs p-2 bg-rose-50 border border-rose-200 rounded-lg">
              ⚠️ {authError}
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors active:scale-98"
          >
            {authLoading ? 'در حال بررسی...' : 'ورود به داشبورد'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-right">
      {/* Header Info */}
      <div className="bg-teal-900 text-white rounded-2xl p-5 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            داشبورد مدیریت و نظارت بر ثبت‌نام عید غدیر
          </h2>
          <p className="text-xs text-teal-200 mt-1">مدیریت آنلاین جلسات اسکیپ باکس جهت تنظیم بهینه ظرفیت</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 hover:bg-teal-800 border border-teal-700 hover:border-teal-600 text-teal-200 hover:text-white rounded-xl text-4xs font-bold transition-all shrink-0 shadow-2xs"
        >
          خروج از پنل مدیریت
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Capacities and Event General Settings forms */}
        <div className="lg:col-span-5 space-y-6">
          {/* A. LIVE SESSIONS CAPACITY AND MANAGEMENT */}
          <div className="bg-[#fcfaf2] border border-[#ebdcb9] rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-extrabold text-teal-900 border-r-4 border-teal-600 pr-2 pb-0.5 mb-4 flex justify-between items-center">
              <span>مدیریت هوشمند سانس‌ها</span>
              <button onClick={() => fetchRegistrations()} title="بازنشانی" className="text-teal-700 hover:text-teal-900 transition-colors">
                <RefreshCw className="w-4 h-4" />
              </button>
            </h3>

            <div className="space-y-4">
              {sessions.map(s => {
                const isClosed = editingSessionStatus[s.id] ?? s.isClosed;
                const capacity = editingSessionCaps[s.id] ?? s.capacity;
                const regCount = s.registeredCount ?? 0;
                const currentAv = Math.max(0, capacity - regCount);

                return (
                  <div key={s.id} className="bg-white/90 border border-stone-200 rounded-xl p-3.5 space-y-3 shadow-2xs hover:border-amber-400/50 transition-all">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-xs text-stone-700">{s.name} ({s.timeRange})</span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-teal-50 border border-teal-200 text-teal-800 font-bold px-1.5 py-0.5 rounded-full font-sans">
                           رزرو شده: {regCount} گروه
                        </span>
                        {isClosed ? (
                          <span className="text-[10px] bg-rose-50 border border-rose-200 text-rose-800 font-black px-1.5 py-0.5 rounded-full">بسته شده</span>
                        ) : (
                          <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">باز</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 items-center">
                      <div>
                        <label className="block text-4xs font-bold text-stone-500 mb-0.5">حد نصاب ظرفیت:</label>
                        <input
                          type="number"
                          value={capacity}
                          onChange={(e) => setEditingSessionCaps(prev => ({ ...prev, [s.id]: parseInt(e.target.value, 10) || 0 }))}
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-mono font-bold text-center text-stone-800 focus:outline-none"
                        />
                      </div>
                      <div className="flex flex-col items-center pt-3.5">
                        <label className="flex items-center gap-1.5 text-xs text-stone-700 font-bold cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isClosed}
                            onChange={(e) => setEditingSessionStatus(prev => ({ ...prev, [s.id]: e.target.checked }))}
                            className="accent-teal-600 rounded"
                          />
                          <span>بستن سانس</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                      <span className="text-[10px] text-stone-500 font-semibold">باقیمانده جاری: <strong className="font-sans text-teal-700">{currentAv} گروه</strong></span>
                      <button
                        onClick={() => handleSaveSessionCaps(s.id)}
                        disabled={sessionSaveLoading[s.id]}
                        className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 text-white font-bold text-[10px] rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        {sessionSaveLoading[s.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        <span>بروزرسانی سانس</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. EVENT GENERAL SETTINGS */}
          <form onSubmit={handleSaveSettings} className="bg-[#fcfaf2] border border-[#ebdcb9] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-teal-900 border-r-4 border-amber-600 pr-2 pb-0.5 flex justify-between items-center">
              <span>ویرایش تنظیمات اصلی رویداد</span>
            </h3>

            {settingsSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-2xs font-bold rounded-lg leading-relaxed">
                 ✓ {settingsSuccessMsg}
              </div>
            )}

            <div>
              <label className="block text-4xs font-bold text-stone-500 mb-1">عنوان اصلی مراسم:</label>
              <input
                type="text"
                required
                value={eventSettingForm.eventTitle}
                onChange={(e) => setEventSettingForm(prev => ({ ...prev, eventTitle: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-4xs font-bold text-stone-500 mb-1">نام اسکیپ باکس:</label>
                <input
                  type="text"
                  required
                  value={eventSettingForm.escapeBoxName || ''}
                  onChange={(e) => setEventSettingForm(prev => ({ ...prev, escapeBoxName: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-semibold"
                />
              </div>
              <div>
                <label className="block text-4xs font-bold text-stone-500 mb-1">فرمت تاریخ شمسی:</label>
                <input
                  type="text"
                  required
                  value={eventSettingForm.solarDate}
                  onChange={(e) => setEventSettingForm(prev => ({ ...prev, solarDate: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-semibold text-center"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-4xs font-bold text-stone-500 mb-1">ساعت کلی رویداد:</label>
                <input
                  type="text"
                  required
                  value={eventSettingForm.eventTime}
                  onChange={(e) => setEventSettingForm(prev => ({ ...prev, eventTime: e.target.value }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-semibold text-center"
                />
              </div>
              <div>
                <label className="block text-4xs font-bold text-stone-500 mb-1">کل وضعیت ثبت‌نام:</label>
                <select
                  value={eventSettingForm.registrationStatus}
                  onChange={(e) => setEventSettingForm(prev => ({ ...prev, registrationStatus: e.target.value as any }))}
                  className="w-full px-2 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-bold"
                >
                  <option value="open">درحال حاضر: باز (Open)</option>
                  <option value="closed">درحال حاضر: بسته (Closed)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-4xs font-bold text-stone-500 mb-1">آدرس برگزاری جلسات:</label>
              <textarea
                required
                value={eventSettingForm.address}
                onChange={(e) => setEventSettingForm(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 leading-relaxed font-semibold text-stone-700"
              />
            </div>

            <div>
              <label className="block text-4xs font-bold text-stone-500 mb-1 font-mono">Coordinates (مختصات جغرافیایی):</label>
              <input
                type="text"
                required
                value={eventSettingForm.coordinates}
                onChange={(e) => setEventSettingForm(prev => ({ ...prev, coordinates: e.target.value }))}
                className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-mono text-center text-stone-700 font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-4xs font-bold text-stone-500 mb-1">حداکثر بلیت در فرم:</label>
                <input
                  type="number"
                  required
                  value={eventSettingForm.maxGuests}
                  onChange={(e) => setEventSettingForm(prev => ({ ...prev, maxGuests: parseInt(e.target.value, 10) || 5 }))}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-4xs font-bold text-stone-500 mb-1">دکمه ارسال تنظیمات:</label>
                <button
                  type="submit"
                  disabled={settingsSaveLoading}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-stone-300 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1 shadow-2xs"
                >
                  {settingsSaveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>ذخیره کل تغییرات تنظیمات</span>
                </button>
              </div>
            </div>
          </form>

          {/* C. GOOGLE SHEETS LIVE SYNC CONTROLLER */}
          <div className="bg-[#fcfaf2] border border-[#ebdcb9] rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-teal-900 border-r-4 border-teal-600 pr-2 pb-0.5 flex justify-between items-center">
              <span className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>همگام‌سازی زنده گوگل شیتز</span>
              </span>
              {googleUser && (
                <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                  متصل به حساب گوگل
                </span>
              )}
            </h3>

            <p className="text-3xs text-stone-600 leading-relaxed font-semibold">
              کل اطلاعات ثبت فید ورودی شامل مهمانان اصلی و همراهان پیوسته به صورت آنی و خودکار به سند گوگل شیتز شما آپدیت و ثبت می‌شود.
            </p>

            {sheetError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 font-bold text-3xs rounded-lg">
                ⚠️ {sheetError}
              </div>
            )}

            {!spreadsheetId ? (
              <div className="space-y-3 pt-1">
                <button
                  onClick={handleCreateSheet}
                  disabled={sheetSyncing}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
                >
                  {sheetSyncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  <span>ساخت و اتصال به گوگل شیت جدید</span>
                </button>
                <p className="text-[10px] text-stone-400 text-center">
                  با کلیک روی دکمه بالا، دسترسی مقتضی از حساب گوگل شما دریافت شده و شیت همگام ساخته می‌شود.
                </p>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-2 shadow-3xs">
                  <div className="flex justify-between items-center text-3xs">
                    <span className="text-stone-400 font-bold">لینک سند فعال شما:</span>
                    <span className="text-emerald-700 font-extrabold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      همگام‌سازی زنده فعال است
                    </span>
                  </div>
                  
                  <div className="flex gap-2 pt-1">
                    <a
                      href={spreadsheetUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-stone-100 hover:bg-teal-50 border border-stone-205 hover:border-teal-200 text-teal-800 hover:text-teal-950 font-black text-3xs rounded-xl transition-all flex items-center justify-center gap-1 text-center"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      <span>مشاهده در گوگل شیت</span>
                    </a>
                    
                    <button
                      onClick={() => handleSyncSheet()}
                      disabled={sheetSyncing}
                      className="py-2 px-3 border border-stone-300 hover:bg-white text-stone-700 font-bold text-3xs rounded-xl flex items-center gap-1 shadow-3xs transition-all"
                      title="بروزرسانی دستی"
                    >
                      {sheetSyncing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      <span>همگام‌سازی مجدد</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center text-4xs">
                  <span className="text-stone-400 font-bold">موقوف به شناسه سند: <span className="font-mono text-stone-600 select-all">{spreadsheetId.substring(0, 10)}...</span></span>
                  <button
                    onClick={handleDisconnectGoogle}
                    className="text-rose-600 hover:text-rose-800 font-bold hover:underline transition-colors"
                  >
                    قطع اتصال گوگل شیت
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Search and Master Registrations Lists */}
        <div className="lg:col-span-7 bg-[#fcfaf2] border border-[#ebdcb9] rounded-2xl p-5 shadow-xs flex flex-col h-fit">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 mb-4 border-b border-stone-200">
            <h3 className="text-sm font-extrabold text-teal-900 border-r-4 border-teal-600 pr-2 pb-0.5">
              لیست کل ثبت‌نام شدگان ({registrations.length} ردیف)
            </h3>
            <div className="flex gap-1.5 w-full sm:w-auto">
              <button
                onClick={handleExportCSV}
                disabled={registrations.length === 0}
                className="px-3.5 py-2 bg-amber-50 hover:bg-[#ebdcb9]/40 border border-[#ebdcb9] text-[#854d0e] rounded-xl text-3xs font-bold flex items-center gap-1.5 transition-colors disabled:bg-stone-100 disabled:text-stone-300 shadow-2xs active:scale-98"
              >
                <Download className="w-3.5 h-3.5" /> خروجی اکسل (CSV)
              </button>
              <button
                onClick={() => fetchRegistrations()}
                className="p-2 border border-stone-300 bg-white hover:bg-stone-50 rounded-xl transition-all shadow-2xs text-stone-600"
                title="به‌روزرسانی"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="جستجوی سریع با نام مهمان، تلفن همراه یا کد پیگیری..."
              className="w-full pr-10 pl-4 py-2 flex items-center text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-teal-500 font-semibold"
            />
          </div>

          {regsError && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-2xs font-extrabold rounded-lg">
               🌋 خطا: {regsError}
            </div>
          )}

          {regsLoading ? (
            <div className="py-20 text-center text-stone-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <span className="text-xs font-semibold">در حال استخراج داده‌های ثبت‌نام...</span>
            </div>
          ) : filteredRegs.length === 0 ? (
            <div className="py-20 text-center text-stone-400 text-xs">
              مهمانی با فیلتر جستجوی فوق پیدا نشد.
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[750px] overflow-y-auto pr-0.5">
              {filteredRegs.map(reg => {
                const companionCount = reg.companions.length;
                const activeCompanionCount = reg.companions.filter(c => c.attendanceStatus !== 'no').length;
                const totalPeopleCount = (reg.attendanceStatus !== 'no' ? 1 : 0) + activeCompanionCount;

                return (
                  <div key={reg.id} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3 hover:border-teal-500 shadow-3xs transition-all relative">
                    {/* Guest ID badge */}
                    <div className="flex justify-between items-center bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5">
                      <span className="font-mono text-3xs font-black text-stone-600 select-all">{reg.id}</span>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('fa-IR') : ''}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <span className="text-stone-400 font-semibold">مهمان: </span>
                        <strong className="text-stone-800">{reg.mainGuestName} ({reg.mainGuestAge || '-'} ساله)</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 font-semibold">تلفن همراه: </span>
                        <strong className="text-stone-800 font-mono text-xs">{reg.mainGuestMobile}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 font-semibold">وضعیت حضور: </span>
                        <span className="text-[#3f51b5] font-extrabold">
                          {reg.attendanceStatus === 'yes' ? 'انشاءالله می‌آیم' : reg.attendanceStatus === 'maybe' ? 'شاید بیایم' : 'نمی‌آیم'}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400 font-semibold font-sans">سانس دعوت: </span>
                        <strong className="text-teal-700">{reg.session?.name || getSessionName(reg.sessionId)}</strong>
                      </div>
                      <div>
                        <span className="text-stone-400 font-semibold font-sans">تعداد کل نفرات: </span>
                        <span className="font-sans font-black text-teal-800 bg-teal-50 px-2 py-0.5 border border-teal-100 rounded-full text-4xs">
                          {totalPeopleCount} نفر حاضر (شامل {activeCompanionCount} همراه فعال)
                        </span>
                      </div>
                    </div>

                    {companionCount > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100">
                        <span className="text-3xs text-stone-500 font-extrabold block mb-1.5">همراهان:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {reg.companions.map((c, idx) => (
                            <div 
                              key={c.id || idx} 
                              className={`text-[11px] p-2 rounded-lg border ${
                                c.attendanceStatus === 'no' 
                                  ? 'bg-rose-50/50 border-rose-100 text-stone-400 line-through' 
                                  : 'bg-[#faf7f0]/60 border-amber-200 text-stone-700'
                              }`}
                            >
                              <div className="flex justify-between items-center font-bold">
                                <span>{idx + 1}. {c.fullName} ({c.age || '-'} ساله)</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                  c.attendanceStatus === 'yes' ? 'bg-emerald-100 text-emerald-800' :
                                  c.attendanceStatus === 'maybe' ? 'bg-amber-100 text-amber-800' :
                                  'bg-stone-100 text-stone-500'
                                }`}>
                                  {c.attendanceStatus === 'yes' ? 'انشاءالله می‌آید' : c.attendanceStatus === 'maybe' ? 'شاید بیاید' : 'نمی‌آید'}
                                </span>
                              </div>
                              <div className="flex justify-between text-4xs text-stone-500 font-medium mt-1">
                                <span>سانس: {getSessionName(c.sessionId)}</span>
                                {c.mobileNumber ? (
                                  <span>تلفن: <span className="font-mono text-stone-600 font-bold">{c.mobileNumber}</span></span>
                                ) : (
                                  <span className="italic text-stone-400">بدون تلفن</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reg.notes && (
                      <div className="text-4xs text-stone-500 leading-relaxed italic mt-1 bg-amber-50/30 p-2 border border-dashed border-[#ebdcb9] rounded-lg">
                        <strong>یادداشت:</strong> {reg.notes}
                      </div>
                    )}

                    {/* Operational tools */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
                      <button
                        onClick={() => onEditRegistration(reg)}
                        className="p-1.5 px-3 border border-teal-200 text-teal-700 hover:bg-teal-50 rounded-lg text-4xs font-bold font-sans transition-all flex items-center gap-1 shadow-3xs"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>ویرایش مشخصات</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRegistration(reg.id)}
                        className="p-1.5 px-3 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg text-3xs font-bold font-sans transition-all flex items-center gap-1 shadow-3xs"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>حذف دائم</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
