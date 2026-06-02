import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Compass, Copy, Check, ExternalLink } from 'lucide-react';
import { EventSetting } from '../types';

interface EventInfoProps {
  settings: EventSetting;
}

export const EventInfo: React.FC<EventInfoProps> = ({ settings }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCoord = () => {
    navigator.clipboard.writeText(settings.coordinates);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#fcfaf2]/90 backdrop-blur-md rounded-2xl border border-[#ebdcb9] p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 border-b border-[#ebdcb9] pb-4 mb-6">
        <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
          <MapPin className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-teal-900">مشخصات و زمان برگزاری رویداد</h2>
          <p className="text-xs text-amber-800 mt-1">اطلاعات تکمیلی جهت حضور در محفل عید غدیر</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Date Card */}
        <div className="flex gap-4 p-4 rounded-xl bg-white/70 border border-[#f1ebd9]">
          <div className="p-3 bg-amber-50 rounded-lg text-amber-700 h-fit">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-stone-500 font-medium">تاریخ برگزاری مراسم</span>
            <div className="text-stone-800 font-bold mt-1 text-sm md:text-base leading-relaxed">
              {settings.solarDate}
            </div>
            <div className="text-xs text-amber-800 mt-1 font-semibold bg-amber-50 inline-block px-1.5 py-0.5 rounded">
              مصادف با {settings.hijriDate}
            </div>
          </div>
        </div>

        {/* Time Card */}
        <div className="flex gap-4 p-4 rounded-xl bg-white/70 border border-[#f1ebd9]">
          <div className="p-3 bg-teal-50 rounded-lg text-teal-700 h-fit">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-stone-500 font-medium">ساعت و سانس‌ها</span>
            <div className="text-[#115e59] font-bold mt-1 text-sm md:text-base">
              از ساعت {settings.eventTime}
            </div>
            <div className="text-xs text-stone-500 mt-1">
              شامل ۳ سانس ۶۰ دقیقه‌ای مجزا جهت بازی اسکیپ‌باکس
            </div>
          </div>
        </div>

        {/* Program Title */}
        <div className="flex gap-4 p-4 rounded-xl bg-white/70 border border-[#f1ebd9]">
          <div className="p-3 bg-teal-50 rounded-lg text-teal-700 h-fit">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-stone-500 font-medium">برنامه و اتاق فرار</span>
            <div className="text-stone-800 font-bold mt-1 text-sm md:text-base">
              بسته تعاملی {settings.programInfo}
            </div>
            <div className="text-xs text-teal-800 font-semibold bg-teal-50 inline-block px-1.5 py-0.5 rounded mt-1">
              اسکیپ باکس: «{settings.escapeBoxName}»
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-teal-900/5 border border-teal-600/10 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Address Detail */}
        <div className="lg:col-span-8 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-teal-600 mt-1 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-teal-900">نشانی دقیق محل برگزاری:</span>
            <p className="text-stone-700 text-sm font-medium mt-1 leading-relaxed">
              {settings.address}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="lg:col-span-4 flex flex-wrap gap-2 justify-start lg:justify-end">
          <button
            type="button"
            onClick={handleCopyCoord}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-lg border border-stone-300 transition-colors shadow-xs active:bg-stone-100"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>کپی شد</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-stone-500" />
                <span>کپی مختصات</span>
              </>
            )}
          </button>
          <a
            href="https://www.google.com/maps?q=35.775861,51.441944"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
          >
            <ExternalLink className="w-4 h-4" />
            <span>مسیریابی در نقشه گوگل</span>
          </a>
        </div>
      </div>

      {/* Embed map visualization aspect */}
      <div className="mt-4 overflow-hidden rounded-xl h-56 bg-stone-100 border border-[#ebdcb9] relative">
        <iframe
          src="https://maps.google.com/maps?q=35.775861,51.441944&z=16&output=embed"
          className="w-full h-full border-0"
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="محل برگزاری جشن عید غدیر"
        ></iframe>
        <div className="absolute bottom-2 right-2 left-2 md:left-auto bg-white/95 backdrop-blur-xs border border-stone-200 px-3 py-1.5 rounded-lg shadow-sm flex items-center justify-between gap-3 text-xs">
          <span className="text-stone-700 font-bold text-3xs">پلاک ۶، بن بست ارغوان</span>
          <a
            href="https://www.google.com/maps?q=35.775861,51.441944"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-700 hover:text-teal-900 text-3xs font-black underline flex items-center gap-1"
          >
            نمایش کامل نقشه در گوگل مپ <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
