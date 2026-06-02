import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Phone, Clipboard, Plus, Trash2, Calendar, HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import { Session, EventSetting, Registration } from '../types';

// Zod validation scheme
const companionSchema = z.object({
  fullName: z.string().min(3, 'نام همراه باید حداقل ۳ کاراکتر باشد'),
  mobileNumber: z.string().regex(/^09\d{9}$/, 'شماره موبایل وارد شده صحیح نیست (مثال: 09121234567)'),
  age: z.coerce.number().int().min(1, 'وارد کردن سن به صورت عدد الزامی است').max(110, 'سن غیرمجاز است'),
  attendanceStatus: z.enum(['yes', 'maybe', 'no']),
  sessionId: z.string().optional(),
});

const formSchema = z.object({
  mainGuestName: z.string().min(3, 'نام مهمان باید حداقل ۳ کاراکتر باشد'),
  mainGuestMobile: z.string().regex(/^09\d{9}$/, 'شماره موبایل وارد شده صحیح نیست (مثال: 09121234567)'),
  mainGuestAge: z.coerce.number().int().min(1, 'وارد کردن سن به صورت عدد الزامی است').max(110, 'سن غیرمجاز است'),
  attendanceStatus: z.enum(['yes', 'maybe', 'no']),
  sessionId: z.string().min(1, 'انتخاب سانس برای مهمان الزامی است'),
  notes: z.string().optional(),
  companions: z.array(companionSchema).min(1, 'ثبت حداقل ۱ همراه برای فرآیند ثبت نام الزامی است (تک‌نفره مجاز نیست).').max(4, 'ثبت حداکثر ۴ همراه مجاز است'),
});

type FormValues = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  settings: EventSetting;
  sessions: Session[];
  onSuccess: (regData: Registration, successMsg: string) => void;
  onRefresh: () => void;
  initialData?: Registration | null; // for editing
  onCancelEdit?: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  settings,
  sessions,
  onSuccess,
  onRefresh,
  initialData,
  onCancelEdit,
}) => {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = !!initialData;

  // Setup React Hook Form
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          mainGuestName: initialData.mainGuestName,
          mainGuestMobile: initialData.mainGuestMobile,
          mainGuestAge: initialData.mainGuestAge || ('' as any),
          attendanceStatus: initialData.attendanceStatus,
          sessionId: initialData.sessionId,
          notes: initialData.notes || '',
          companions: initialData.companions.map((c) => ({
            fullName: c.fullName,
            mobileNumber: c.mobileNumber || '',
            age: c.age || ('' as any),
            attendanceStatus: c.attendanceStatus,
            sessionId: c.sessionId,
          })),
        }
      : {
          mainGuestName: '',
          mainGuestMobile: '',
          mainGuestAge: '' as any,
          attendanceStatus: 'yes',
          sessionId: '',
          notes: '',
          companions: [
            {
              fullName: '',
              mobileNumber: '',
              age: '' as any,
              attendanceStatus: 'yes',
              sessionId: '',
            }
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'companions',
  });

  const selectedMainSession = watch('sessionId');
  const mainAttendance = watch('attendanceStatus');
  const companionsList = watch('companions') || [];

  // Submit Handler
  const onSubmitForm = async (values: any) => {
    setLoading(true);
    setSubmitError(null);

    // Filter out companions if their values are empty or malformed
    const payload = {
      ...values,
      companions: values.companions.map((comp) => ({
        ...comp,
        mobileNumber: comp.mobileNumber || null,
        sessionId: values.sessionId, // Force companion's sessionId to match the main guest session
      })),
    };

    const url = isEditing ? `/api/public/register/${initialData.id}` : '/api/public/register';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || 'خطایی در ارسال اطلاعات رخ داد.');
      }

      onSuccess(resData.registration, resData.message || 'ثبت‌نام شما با موفقیت ثبت شد.');
    } catch (err: any) {
      setSubmitError(err.message || 'خطای غیرمنتظره رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppendCompanion = () => {
    if (fields.length >= 4) return;
    // Autoselect the main guest's session to provide stellar speed UX
    append({
      fullName: '',
      mobileNumber: '',
      age: '' as any,
      attendanceStatus: 'yes',
      sessionId: selectedMainSession || (sessions[0]?.id || ''),
    });
  };

  return (
    <div className="bg-[#fcfaf2] rounded-2xl border border-[#ebdcb9] shadow-sm overflow-hidden text-right">
      {/* Form Title banner */}
      <div className="bg-gradient-to-l from-teal-800 to-teal-700 text-white p-5 md:p-6">
        <h2 className="text-xl font-bold">
          {isEditing ? `ویرایش فرم ثبت نام کد ${initialData.id}` : 'فرم درخواست ثبت‌نام و رزرو سانس'}
        </h2>
        <p className="text-xs text-teal-100 mt-2 leading-relaxed">
          حداکثر ظرفیت ثبت‌نام نهایی یک مهمان به همراه ۴ همراه (مجموعا ۵ نفر) می‌باشد.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)} className="p-5 md:p-7 space-y-6">
        {submitError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl leading-relaxed">
            ⚠️ خطا: {submitError}
          </div>
        )}

        {/* Live Capacities panel */}
        <div className="bg-amber-50/50 rounded-xl p-4 border border-[#ebdcb9]/60">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-[#854d0e] flex items-center gap-1">
              <Calendar className="w-4 h-4 text-amber-700" /> ظرفیت آنلاین سانس‌ها (بازه حضور)
            </span>
            <button
              type="button"
              onClick={onRefresh}
              className="text-[#0f766e] hover:text-[#0d9488] text-xs font-bold flex items-center gap-1 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
              <span>به‌روزرسانی ظرفیت</span>
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sessions.map((session) => {
              const count = session.registeredCount ?? 0;
              const avail = session.availability ?? 0;
              const isClosed = session.isClosed || avail <= 0;

              return (
                <div
                  key={session.id}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isClosed
                      ? 'bg-stone-100/80 border-stone-200 opacity-65'
                      : selectedMainSession === session.id
                        ? 'bg-teal-50 border-teal-500 ring-1 ring-teal-500'
                        : 'bg-white border-stone-200 hover:border-amber-400'
                  }`}
                  onClick={() => {
                    if (!isClosed) setValue('sessionId', session.id);
                  }}
                  style={{ cursor: isClosed ? 'not-allowed' : 'pointer' }}
                >
                  <div className="text-xs font-bold text-stone-700">{session.name}</div>
                  <div className="text-xs font-semibold text-[#0f766e] font-mono mt-1 mt-0.5">
                    {session.timeRange}
                  </div>
                  <div className="mt-2 flex justify-center items-center gap-1">
                    {isClosed ? (
                      <span className="bg-stone-200 text-stone-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        تکمیل شد
                      </span>
                    ) : (
                      <span className="text-3xs bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-1.5 py-0.5 rounded-full">
                        ظرفیت باقیمانده: {avail} گروه
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {errors.sessionId && <p className="text-rose-600 text-2xs mt-2 font-bold">{errors.sessionId.message}</p>}
        </div>

        {/* SECTION 1: Main Guest Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-extrabold text-teal-900 border-r-4 border-teal-600 pr-2 pb-0.5">
            ۱. مشخصات
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-2xs font-extrabold text-stone-600 mb-1">نام و نام خانوادگی *</label>
              <div className="relative">
                <User className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="مثال: عباس علیزاده"
                  {...register('mainGuestName')}
                  className="w-full pr-10 pl-4 py-3 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-teal-500 font-bold"
                />
              </div>
              {errors.mainGuestName && (
                <p className="text-rose-600 text-2xs mt-1 font-bold">{errors.mainGuestName.message}</p>
              )}
            </div>

            {/* Mobile Number */}
            <div>
              <label className="block text-2xs font-extrabold text-stone-600 mb-1">شماره همراه *</label>
              <div className="relative">
                <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="tel"
                  placeholder="مثال: 09121234567"
                  disabled={isEditing}
                  {...register('mainGuestMobile')}
                  className="w-full pr-10 pl-4 py-3 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-teal-500 font-mono font-bold text-center disabled:bg-stone-100 disabled:text-stone-500"
                />
              </div>
              {isEditing && (
                <span className="text-[10px] text-[#b45309] font-bold mt-1 block">
                  ⚠️ شماره همراه در ویرایش غیرقابل تغییر است.
                </span>
              )}
              {errors.mainGuestMobile && (
                <p className="text-rose-600 text-2xs mt-1 font-bold">{errors.mainGuestMobile.message}</p>
              )}
            </div>

            {/* Age */}
            <div>
              <label className="block text-2xs font-extrabold text-stone-600 mb-1">سن *</label>
              <input
                type="number"
                placeholder="مثال: 25"
                {...register('mainGuestAge')}
                className="w-full px-4 py-3 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-teal-500 font-bold text-center"
              />
              {errors.mainGuestAge && (
                <p className="text-rose-600 text-2xs mt-1 font-bold">{errors.mainGuestAge.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Attendance Status */}
            <div>
              <label className="block text-2xs font-extrabold text-stone-600 mb-1">وضعیت حضور در مراسم *</label>
              <select
                {...register('attendanceStatus')}
                className="w-full px-4 py-3 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-teal-500 font-bold"
              >
                <option value="yes">انشاءالله می آیم</option>
                <option value="maybe">شاید بیایم</option>
                <option value="no">نمی آیم</option>
              </select>
              {errors.attendanceStatus && (
                <p className="text-rose-600 text-2xs mt-1 font-bold">{errors.attendanceStatus.message}</p>
              )}
            </div>

            {/* Selected Session (Hidden fallback but manually synchronized click card) */}
            <input type="hidden" {...register('sessionId')} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-2xs font-extrabold text-stone-600 mb-1">توضیحات یا یادداشت خاص (اختیاری)</label>
            <div className="relative">
              <Clipboard className="absolute right-3.5 top-3.5 w-4 h-4 text-stone-400" />
              <textarea
                placeholder="درصورتی که یادداشتی برای ما دارید بنویسید"
                rows={2}
                {...register('notes')}
                className="w-full pr-10 pl-4 py-3 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:border-teal-500 font-medium"
              ></textarea>
            </div>
          </div>
        </div>

        {/* SECTION 2: Companions List */}
        <div className="space-y-4 pt-4 border-t border-[#f1ebd9]">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-teal-900 border-r-4 border-amber-600 pr-2 pb-0.5">
              ۲. مشخصات همراهان (حداکثر ۴ همراه)
            </h3>
            {fields.length < 4 && (
              <button
                type="button"
                onClick={handleAppendCompanion}
                className="flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg px-2.5 py-1.5 transition-all shadow-2xs active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" /> افزودن همراه جدید
              </button>
            )}
          </div>

          {fields.length === 0 && (
            <div className="p-4 rounded-xl border border-dashed border-stone-300 bg-stone-50/50 text-center">
              <HelpCircle className="w-6 h-6 text-stone-400 mx-auto mb-1" />
              <p className="text-stone-500 text-xs font-bold">حداقل ۱ همراه برای ثبت نام الزامی است.</p>
            </div>
          )}

          {fields.map((item, index) => {
            const compNameKey = `companions.${index}.fullName` as const;
            const compMobKey = `companions.${index}.mobileNumber` as const;
            const compAgeKey = `companions.${index}.age` as const;
            const compStatusKey = `companions.${index}.attendanceStatus` as const;
            const compSessionKey = `companions.${index}.sessionId` as const;

            return (
              <div
                key={item.id}
                className="bg-white/90 border border-stone-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 relative shadow-2xs hover:border-[#ebdcb9] transition-all"
              >
                <div className="absolute left-3 top-3">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-1 px-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition-colors shadow-2xs flex items-center gap-1 text-[10px]"
                    title="حذف همراه"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف همراه</span>
                  </button>
                </div>

                <div className="md:col-span-12 font-bold text-xs text-stone-600 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-mono text-3xs pt-0.5">
                    {index + 1}
                  </span>
                  <span>مشخصات همراه شماره {index + 1}</span>
                </div>

                {/* Name */}
                <div className="md:col-span-3">
                  <label className="block text-4xs text-stone-500 font-bold mb-1">نام و نام خانوادگی همراه</label>
                  <input
                    type="text"
                    placeholder="مثال: فاطمه علیزاده"
                    {...register(compNameKey)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-bold"
                  />
                  {errors.companions?.[index]?.fullName && (
                    <p className="text-rose-600 text-2xs mt-1 font-bold">
                      {errors.companions[index]?.fullName?.message}
                    </p>
                  )}
                </div>

                {/* Mobile */}
                <div className="md:col-span-3">
                  <label className="block text-4xs text-stone-500 font-bold mb-1">شماره همراه *</label>
                  <input
                    type="tel"
                    placeholder="مثال: 09301234567"
                    {...register(compMobKey)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-mono text-center font-semibold"
                  />
                  {errors.companions?.[index]?.mobileNumber && (
                    <p className="text-rose-600 text-2xs mt-1 font-bold">
                      {errors.companions[index]?.mobileNumber?.message}
                    </p>
                  )}
                </div>

                {/* Age */}
                <div className="md:col-span-3">
                  <label className="block text-4xs text-stone-500 font-bold mb-1">سن همراه *</label>
                  <input
                    type="number"
                    placeholder="مثال: 12"
                    {...register(compAgeKey)}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-semibold text-center"
                  />
                  {errors.companions?.[index]?.age && (
                    <p className="text-rose-600 text-2xs mt-1 font-bold">
                      {errors.companions[index]?.age?.message}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="md:col-span-3">
                  <label className="block text-4xs text-stone-500 font-bold mb-1">وضعیت حضور</label>
                  <select
                    {...register(compStatusKey)}
                    className="w-full px-2 py-2 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:border-teal-500 font-semibold"
                  >
                    <option value="yes">انشاءالله می‌آید</option>
                    <option value="maybe">شاید بیاید</option>
                    <option value="no">نمی‌آید</option>
                  </select>
                  {errors.companions?.[index]?.attendanceStatus && (
                    <p className="text-rose-600 text-2xs mt-1 font-bold">
                      {errors.companions[index]?.attendanceStatus?.message}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total confirmation details bar */}
        <div className="pt-6 border-t border-[#f1ebd9] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-stone-600 text-xs font-semibold leading-relaxed text-center md:text-right">
            <span>کل مهمانان ثبت شده در فرم: </span>
            <span className="text-stone-800 font-black font-sans text-sm">
              {1 + companionsList.length}
            </span>
            <span>نفر</span>
          </div>

          <div className="flex gap-2">
            {onCancelEdit && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="px-5 py-3 border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 rounded-xl font-bold text-xs shadow-xs transition-colors active:bg-stone-100"
              >
                انصراف از ویرایش
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-stone-400 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-98"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال بررسی و ثبت...</span>
                </>
              ) : (
                <span>{isEditing ? 'ثبت و ویرایش نهایی اطلاعات' : 'ارسال درخواست و دریافت شناسه'}</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
