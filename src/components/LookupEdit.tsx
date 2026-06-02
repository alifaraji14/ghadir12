import React, { useState } from 'react';
import { Search, MapPin, Printer, Edit3, Trash2, ShieldAlert, CheckCircle, HelpCircle, User, Users, Calendar, Clock } from 'lucide-react';
import { Registration, Session } from '../types';

interface LookupEditProps {
  sessions: Session[];
  onEdit: (reg: Registration) => void;
  onRefresh: () => void;
}

export const LookupEdit: React.FC<LookupEditProps> = ({ sessions, onEdit, onRefresh }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setRegistration(null);
    setConfirmDelete(false);
    setDeleteSuccess(false);

    try {
      const response = await fetch(`/api/public/lookup?query=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ثبت‌نامی با اطلاعات وارد شده یافت نشد.');
      }

      setRegistration(data.registration);
    } catch (err: any) {
      setError(err.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!registration) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/public/register/${registration.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در لغو ثبت‌نام.');
      }

      setDeleteSuccess(true);
      setRegistration(null);
      setConfirmDelete(false);
      onRefresh(); // Refresh parent capacities
    } catch (err: any) {
      alert(err.message || 'لغو ثبت‌نام موفقیت‌آمیز نبود.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getSessionDetails = (id: string) => {
    return sessions.find(s => s.id === id);
  };

  const translateStatus = (status: string, isCompanion = false) => {
    switch (status) {
      case 'yes':
        return { label: isCompanion ? 'انشاءالله می‌آید' : 'انشاءالله می‌آیم', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'maybe':
        return { label: isCompanion ? 'شاید بیاید' : 'شاید بیایم', color: 'bg-amber-50 text-amber-800 border-[#ebdcb9]' };
      case 'no':
        return { label: isCompanion ? 'نمی‌آید' : 'نمی‌آیم', color: 'bg-stone-100 text-stone-600 border-stone-300' };
      default:
        return { label: 'نامشخص', color: 'bg-stone-50 border-stone-200' };
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  return (
    <div className="bg-[#fcfaf2] rounded-2xl border border-[#ebdcb9] shadow-sm p-4 md:p-6 text-right">
      <h2 className="text-xl font-bold text-teal-900 mb-2">پیگیری و مدیریت کارت ورود</h2>
      <p className="text-xs text-stone-500 mb-6 leading-relaxed">
        برای دریافت کارت دعوت، اصلاح ساعت حضور یا لغو رزرو، شماره همراه یا کد ثبت‌نامی خود را وارد نمایید.
      </p>

      {/* Search Input bar */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            required
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="مثال: 09121234567 یا GHADIR-2026-A2J5K9"
            className="w-full pr-10 pl-4 py-3 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-teal-500 font-semibold text-center font-mono placeholder:font-sans"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 active:scale-98"
        >
          {loading ? 'در حال پیگیری...' : 'جستجو و پیگیری'}
        </button>
      </form>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl max-w-xl">
          ⚠️ {error}
        </div>
      )}

      {deleteSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl max-w-xl flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>ثبت‌نام مورد نظر با موفقیت لغو و ظرفیت سانس آزاد گردید.</span>
        </div>
      )}

      {/* Ghadir invitational card rendering */}
      {registration && (
        <div className="space-y-6 max-w-2xl">
          {/* Card Frame wrapping */}
          <div className="printable-card bg-[#fcfaf2] border-2 border-dashed border-teal-600/30 rounded-2xl p-6 relative overflow-hidden shadow-xs print:border-none print:shadow-none print:bg-white">
            {/* Ambient ornaments for religious event style */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-teal-600/5 rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/5 rounded-full pointer-events-none"></div>

            {/* Header banner */}
            <div className="text-center border-b border-[#ebdcb9] pb-4 mb-4">
              <span className="text-xs text-amber-800 font-bold tracking-widest block font-sans">یا امیرالمومنین علیه السلام</span>
              <h3 className="text-lg font-black text-teal-900 mt-1">کارت دعوت رسمی جشن بزرگ عید غدیر خم</h3>
              <p className="text-[10px] text-stone-500 font-medium mt-1">«برنامه اتاق فرار تعاملی وقف تاریکی»</p>
            </div>

            {/* Code identifier */}
            <div className="flex justify-between items-center bg-teal-900/5 border border-teal-600/10 rounded-xl px-4 py-2.5 mb-6">
              <span className="text-2xs font-extrabold text-[#0f766e]">کد پیگیری ثبت‌نام (شماره دعوت‌نامه)</span>
              <span className="font-mono font-black text-teal-800 tracking-wider text-sm select-all">
                {registration.id}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Main guest details */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-extrabold text-[#115e59] flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> مشخصات مهمان
                </h4>

                <div className="bg-white/80 border border-stone-200/60 rounded-xl p-3.5 space-y-2.5 text-xs text-stone-700">
                  <div className="flex justify-between">
                    <span className="text-stone-400 font-semibold">نام و نام خانوادگی:</span>
                    <span className="font-bold text-stone-800">{registration.mainGuestName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400 font-semibold">تلفن همراه:</span>
                    <span className="font-mono font-bold text-stone-800">{registration.mainGuestMobile}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 font-semibold">وضعیت حضور:</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${translateStatus(registration.attendanceStatus).color}`}>
                      {translateStatus(registration.attendanceStatus).label}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400 font-semibold">سانس منتخب خودتان:</span>
                    <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-sans">
                      {registration.session?.name} ({registration.session?.timeRange})
                    </span>
                  </div>
                  {registration.notes && (
                    <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-600">
                      <span className="font-bold block text-stone-500 text-3xs mb-0.5">یادداشت ثبت شده:</span>
                      <p className="leading-relaxed italic bg-stone-50 p-2 rounded">{registration.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Companions Details */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-extrabold text-[#115e59] flex items-center gap-1">
                  <Users className="w-4 h-4" /> ۲. مشخصات افراد همراه
                </h4>

                {registration.companions.length === 0 ? (
                  <div className="bg-stone-50/50 border border-dashed border-stone-300 rounded-xl p-6 text-center text-stone-500 text-xs">
                    مهمان همراهی ثبت نشده است.
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-56 pr-0.5">
                    {registration.companions.map((comp, idx) => {
                      const compSession = getSessionDetails(comp.sessionId);
                      return (
                        <div key={comp.id || idx} className="bg-white/80 border border-stone-200/60 rounded-xl p-3 text-xs flex flex-col gap-1.5 hover:border-[#ebdcb9]">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-stone-800 flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-stone-100 flex items-center justify-center text-3xs text-stone-500">{idx + 1}</span>
                              {comp.fullName}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-full ${translateStatus(comp.attendanceStatus, true).color}`}>
                              {translateStatus(comp.attendanceStatus, true).label}
                            </span>
                          </div>
                          <div className="flex justify-between text-4xs text-stone-500 font-semibold">
                            <span>سانس همراه: {compSession ? `${compSession.name} (${compSession.timeRange})` : 'نامشخص'}</span>
                            {comp.mobileNumber && <span>تلفن: <span className="font-mono">{comp.mobileNumber}</span></span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Event schedule notes summary */}
            <div className="mt-6 border-t border-[#ebdcb9] pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-1.5 text-stone-600">
                <Calendar className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-stone-700">تاریخ حضور شما:</span>
                  <span>چهارشنبه 20 خرداد 1405 (24 ذی الحجه 1447)</span>
                </div>
              </div>
              <div className="flex items-start gap-1.5 text-stone-600">
                <MapPin className="w-4 h-4 text-[#854d0e] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block text-stone-700">محل برگزاری:</span>
                  <p className="leading-relaxed text-3xs text-stone-600 mt-0.5">تهران، خیابان شهید کلاهدوز، کوچه صراف، بن بست ارغوان، پلاک 6</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap gap-2 justify-start items-center">
            <button
              onClick={() => onEdit(registration)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-[#0f766e] text-xs font-bold border border-teal-200 rounded-xl shadow-2xs transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>ویرایش مشخصات یا سانس‌ها</span>
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#fdf2f2] hover:bg-[#fde2e2] text-rose-700 text-xs font-bold border border-rose-200 rounded-xl shadow-2xs transition-colors mr-auto"
            >
              <Trash2 className="w-4 h-4" />
              <span>لغو کل ثبت‌نام</span>
            </button>
          </div>

          {/* Delete confirmation Alert overlay */}
          {confirmDelete && (
            <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-xl space-y-4 max-w-xl animate-fade-in text-rose-950">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 animate-bounce" />
                <div>
                  <h4 className="text-xs font-bold text-rose-900 mb-1">هشدار انصراف و لغو ثبت‌نام</h4>
                  <p className="text-stone-600 leading-relaxed text-2xs">
                    آیا از لغو کامل ثبت‌نام خود و همراهان برای این رویداد اطمینان دارید؟ با لغو این ثبت‌نام، ردیف‌های رزرو شده بلافاصله باطل گردیده و در اختیار سایر مخاطبان مذهبی عید غدیر قرار می‌گیرد. این عملیات قابل بازگشت نیست.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3.5 py-1.5 border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 rounded-lg text-4xs font-bold transition-all shadow-2xs"
                >
                  منصرف شدم (حفظ بلیت)
                </button>
                <button
                  disabled={deleteLoading}
                  onClick={handleDelete}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-4xs font-bold flex items-center gap-1 transition-all shadow-2xs active:scale-98"
                >
                  {deleteLoading ? 'در حال لغو...' : 'خیر، حتماً باطل شود'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
