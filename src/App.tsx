import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  UserPlus, Search, ShieldAlert, Sparkles, BookOpen, Heart, 
  MapPin, CheckCircle, Calendar, ArrowLeft, Printer, Loader2 
} from 'lucide-react';
import { EventSetting, Session, Registration } from './types';
import { EventInfo } from './components/EventInfo';
import { RegistrationForm } from './components/RegistrationForm';
import { LookupEdit } from './components/LookupEdit';
import { AdminPanel } from './components/AdminPanel';
import { CountdownTimer } from './components/CountdownTimer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'register' | 'lookup' | 'admin'>('register');
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Settings & Sessions loaded from database
  const [settings, setSettings] = useState<EventSetting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Editing state
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);

  // Successful Registration card display state
  const [successRegistration, setSuccessRegistration] = useState<Registration | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch Event Data from Backend
  const fetchEventData = async () => {
    try {
      const response = await fetch('/api/public/event');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'خطا در دریافت اطلاعات رویداد عید غدیر.');
      }
      setSettings(data.settings);
      setSessions(data.sessions || []);
    } catch (err: any) {
      setErrorCode(err.message || 'خطا در استخراج پیکربندی.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, []);

  const handleRegisterSuccess = (reg: Registration, msg: string) => {
    setSuccessRegistration(reg);
    setSuccessMessage(msg);
    setEditingRegistration(null);
    fetchEventData(); // refresh remaining capacities
  };

  const handleStartEdit = (reg: Registration) => {
    setEditingRegistration(reg);
    setActiveTab('register'); // Go to registration tab
  };

  const handleCancelEdit = () => {
    setEditingRegistration(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
        <h2 className="text-lg font-black text-teal-900 font-sans">سامانه ثبت‌نام آنلاین جشن عید غدیر</h2>
        <p className="text-xs text-stone-500 mt-2 font-medium">در حال فراخوانی اطلاعات و ظرفیت سانس‌ها...</p>
      </div>
    );
  }

  if (errorCode || !settings) {
    return (
      <div className="min-h-screen bg-[#faf7f0] flex flex-col items-center justify-center p-6 text-center text-right font-sans">
        <div className="max-w-md bg-white border border-rose-200 rounded-2xl p-6 shadow-xs">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-lg font-bold text-rose-900 mb-2">خطا در راه‌اندازی سامانه</h2>
          <p className="text-stone-600 text-xs leading-relaxed mb-6">
            دسترسی به پایگاه داده با اختلال مواجه شده است. لطفاً اطمینان حاصل کنید که ارتباط با سرور برقرار بوده و متغیرهای محلی پایگاه داده PostgreSQL به درستی تنظیم شده باشند.
          </p>
          <button
            onClick={() => {
              setLoading(true);
              fetchEventData();
            }}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            تلاش مجدد فراخوانی پایگاه داده
          </button>
        </div>
      </div>
    );
  }

  const isClosedGlobally = settings.registrationStatus === 'closed';

  return (
    <div className="min-h-screen bg-[#faf7f0] flex flex-col print:bg-white text-stone-800 selection:bg-teal-100 selection:text-teal-950 font-sans leading-relaxed">
      
      {/* 1. Header & Traditional Islamic Festive banner */}
      <div className="bg-gradient-to-b from-[#f2edd8] to-[#faf7f0] border-b border-[#ebdcb9] relative overflow-hidden py-10 md:py-16 px-4 shrink-0 text-center select-none print:hidden">
        {/* Abstract vector ornaments */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal-600/5 rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-8 -left-8 w-56 h-56 bg-amber-500/5 rounded-full pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          {/* Glowing lantern micro theme */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-800/10 border border-teal-800/20 text-teal-800 text-xs font-extrabold rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            من کنت مولاه فهذا علی مولاه
          </span>
          
          <h1 className="text-3xl md:text-5xl font-black text-teal-950 leading-tight md:leading-snug">
            {settings.eventTitle}
          </h1>
          
          <p className="text-xs md:text-sm font-bold text-amber-800 mt-3 flex justify-center items-center gap-1">
            <span>برنامه:</span>
            <span className="bg-amber-50 border border-[#ebdcb9] px-2 py-0.5 rounded-md text-3xs font-black">
              {settings.programInfo} — {settings.escapeBoxName}
            </span>
          </p>

          <p className="text-stone-700 text-xs md:text-sm font-semibold max-w-2xl mx-auto leading-relaxed mt-4">
            به مناسبت بزرگترین عید مسلمانان، گردهم می آییم تا عرض تبریکی محضر ولی عصر ارواحنا فداه داشته باشیم...
          </p>
        </motion.div>
      </div>

      {/* 2. Main Container holding views */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 md:py-12 space-y-8 print:py-0 print:px-0">
        
        {/* Countdown Timer */}
        <div className="print:hidden">
          <CountdownTimer />
        </div>

        {/* Event details summary info */}
        <div className="print:hidden">
          <EventInfo settings={settings} />
        </div>

        {/* Tab Selector Links */}
        <div className="flex bg-white/85 border border-[#ebdcb9] rounded-2xl p-1.5 max-w-xl mx-auto shadow-2xs print:hidden">
          <button
            onClick={() => {
              setActiveTab('register');
              setSuccessRegistration(null);
            }}
            className={`flex-1 py-3 text-2xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'register'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-teal-900 hover:bg-stone-50'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>ثبت‌نام جدید یا ویرایش</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('lookup');
              setSuccessRegistration(null);
            }}
            className={`flex-1 py-3 text-2xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'lookup'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-teal-900 hover:bg-stone-50'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>پیگیری و ویرایش ثبت نام</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('admin');
              setSuccessRegistration(null);
            }}
            className={`flex-1 py-3 text-2xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'admin'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-teal-900 hover:bg-stone-50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>ورود مدیریت</span>
          </button>
        </div>

        {/* WARNING BAR: If event is manually closed */}
        {isClosedGlobally && activeTab === 'register' && !editingRegistration && (
          <div className="max-w-2xl mx-auto p-4 bg-amber-50 border border-[#ebdcb9] text-amber-900 rounded-xl flex items-start gap-3 print:hidden">
            <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-extrabold block text-xs">ثبت‌نام متوقف شده است</span>
              <p className="text-3xs text-stone-600 leading-relaxed mt-1">
                اطلاعیه مدیریت: ثبت‌نام برای این محفل و بازی اسکیپ به حداکثر حد نصاب ظرفیت نهایی خود رسیده است. با این وجود شما می‌توانید از طریق سربرگ «پیگیری و ویرایش ثبت نام» رزرو قبلی خود را اصلاح نموده یا در پنل ادمین تغییرات لازم را اعمال دارید.
              </p>
            </div>
          </div>
        )}

        {/* 3. Core dynamic tabs rendered according to selection */}
        <AnimatePresence mode="wait">
          {successRegistration ? (
            /* SUCCESS REGISTRATION RSVP CARD VIEW OVERLAY */
            <motion.div
              key="success-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-2xl mx-auto bg-white border border-[#ebdcb9] rounded-2xl p-6 md:p-8 space-y-6 shadow-sm text-center print:border-none print:shadow-none"
            >
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mx-auto animate-bounce print:hidden">
                <CheckCircle className="w-8 h-8" />
              </div>
              
              <div className="print:hidden">
                <h2 className="text-xl font-black text-emerald-900">تبریک! ثبت‌نام شما تایید شد</h2>
                <p className="text-stone-600 text-xs mt-2 leading-relaxed">
                  {successMessage}
                </p>
              </div>

              {/* Digital entry tickets details */}
              <div className="printable-card border-2 border-dashed border-teal-600/30 rounded-2xl p-5 relative overflow-hidden bg-white">
                <span className="text-[10px] text-amber-800 font-extrabold bg-amber-50 px-2 py-0.5 rounded shadow-2xs mb-2 inline-block">دعوت‌نامه رسمی غدیر</span>
                <h3 className="text-lg font-bold text-teal-900 leading-normal">{settings.eventTitle}</h3>
                
                {/* RSVP ticket ID */}
                <div className="my-4 p-3 bg-teal-900/5 rounded-xl border border-teal-600/10 inline-block px-6">
                  <span className="text-[10px] text-[#0f766e] block font-semibold">شناسه دعوت‌نامه مستقل شما</span>
                  <span className="font-mono font-black text-teal-800 tracking-wider text-base select-all block mt-1">{successRegistration.id}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-right text-xs mt-4">
                  <div className="space-y-1">
                    <span className="text-stone-400 font-bold block">مهمان:</span>
                    <strong className="text-stone-800">{successRegistration.mainGuestName} ({successRegistration.mainGuestAge} ساله)</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-bold block">تلفن همراه:</span>
                    <strong className="text-stone-800 font-mono">{successRegistration.mainGuestMobile}</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-bold block">تعداد همراهان:</span>
                    <strong className="text-stone-800 font-sans">{successRegistration.companions.length} نفر</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-bold block">سانس اختصاصی:</span>
                    <strong className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">{successRegistration.session?.name || roomsSessionName(successRegistration.sessionId)}</strong>
                  </div>
                </div>

                {successRegistration.companions.length > 0 && (
                  <div className="mt-5 pt-3 border-t border-stone-200 text-right">
                    <span className="text-3xs text-stone-400 font-bold block mb-1.5">همراهان ثبت شده:</span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {successRegistration.companions.map((comp, idx) => (
                        <span key={idx} className="text-4xs font-bold bg-[#faf7f0] border border-[#ebdcb9] px-2 py-0.5 rounded text-stone-700 shadow-3xs">
                          {comp.fullName} ({comp.age} ساله)
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 pt-3 border-t border-[#ebdcb9] text-center text-[10px] text-stone-500 leading-relaxed grid grid-cols-2 gap-3">
                  <div>
                    <strong className="text-stone-700 block mb-0.5">تاریخ حضور:</strong>
                    <span>{settings.solarDate}</span>
                  </div>
                  <div>
                    <strong className="text-stone-700 block mb-0.5">آدرس برگزاری:</strong>
                    <span className="truncate block max-w-xs mx-auto" title={settings.address}>{settings.address}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-center gap-2 pt-4 print:hidden">
                <button
                  onClick={() => {
                    setSuccessRegistration(null);
                    setEditingRegistration(null);
                    setActiveTab('register');
                  }}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1 active:scale-98"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>ثبت‌نام کارت دیگر</span>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto print:max-w-full"
            >
              {activeTab === 'register' && (
                <div className="space-y-4">
                  {isClosedGlobally && !editingRegistration ? (
                    <div className="p-8 bg-white border border-dashed border-stone-300 rounded-2xl text-center">
                      <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto mb-3" />
                      <h3 className="text-base font-bold text-stone-700">درحال حاضر ظرفیت تکمیل شده است</h3>
                      <p className="text-stone-500 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                        با توجه به محدودیت فضای اتاق بازی اسکیپ و اولویت‌های ایمنی، ثبت‌نام جدید فعلا مقدور نیست. در صورت انصراف سایر مهمانان، ظرفیت‌ها مجدداً به صورت آنی باز خواهد شد.
                      </p>
                    </div>
                  ) : (
                    <RegistrationForm
                      settings={settings}
                      sessions={sessions}
                      onSuccess={handleRegisterSuccess}
                      onRefresh={fetchEventData}
                      initialData={editingRegistration}
                      onCancelEdit={handleCancelEdit}
                    />
                  )}
                </div>
              )}
              {activeTab === 'lookup' && (
                <LookupEdit 
                  sessions={sessions}
                  onEdit={handleStartEdit}
                  onRefresh={fetchEventData}
                />
              )}
              {activeTab === 'admin' && (
                <AdminPanel 
                  sessions={sessions}
                  settings={settings}
                  onRefresh={fetchEventData}
                  onEditRegistration={handleStartEdit}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer copyright */}
      <footer className="py-8 bg-teal-950 text-teal-200/50 text-[10px] md:text-xs text-center border-t border-teal-900 font-sans shrink-0 print:hidden mt-20">
        <div className="max-w-3xl mx-auto px-4 space-y-2">
          <Heart className="w-4 h-4 text-emerald-400 mx-auto fill-emerald-400 mb-1" />
          <p className="font-extrabold text-teal-100 text-xs md:text-sm">اللهم صلی علی محمد و آل محمد و عجل فرجهم والعن اعدائهم اجمعین.</p>
        </div>
      </footer>
    </div>
  );

  function roomsSessionName(id: string) {
    return sessions.find(s => s.id === id)?.name || id;
  }
}
