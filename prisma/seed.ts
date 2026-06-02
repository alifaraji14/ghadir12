import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding started...");

  // Check and seed EventSetting
  const settingsCount = await prisma.eventSetting.count();
  if (settingsCount === 0) {
    await prisma.eventSetting.create({
      data: {
        id: "default",
        eventTitle: "جشن عید سعید غدیر خم",
        programInfo: "اسکیپ باکس",
        escapeBoxName: "وقف تاریکی",
        solarDate: "چهارشنبه 20 خرداد 1405",
        hijriDate: "24 ذی الحجه 1447",
        eventTime: "16:30 تا 19:30",
        address: "تهران، خیابان شهید کلاهدوز، کوچه صراف، بن بست ارغوان، پلاک 6",
        coordinates: "35.775861,51.441944",
        registrationStatus: "open",
        successMessage: "ثبت نام شما با موفقیت انجام شد. شناسه ثبت نام شما برای مراجعات بعدی معتبر است.",
        errorMessage: "خطایی در ثبت اطلاعات رخ داد. لطفاً فیلدهای ورودی را بررسی کرده یا مجدداً تلاش کنید.",
        maxGuests: 5,
      },
    });
    console.log("Event settings seeded.");
  }

  // Check and seed Sessions
  const sessionCount = await prisma.session.count();
  if (sessionCount === 0) {
    await prisma.session.createMany({
      data: [
         {
          id: "session-1",
          name: "سانس اول",
          timeRange: "16:30 - 17:30",
          capacity: 4,
          isClosed: false,
        },
        {
          id: "session-2",
          name: "سانس دوم",
          timeRange: "17:30 - 18:30",
          capacity: 4,
          isClosed: false,
        },
        {
          id: "session-3",
          name: "سانس سوم",
          timeRange: "18:30 - 19:30",
          capacity: 4,
          isClosed: false,
        },
      ],
    });
    console.log("Sessions seeded.");
  }

  console.log("Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
