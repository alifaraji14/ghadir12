import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { prisma } from "./src/lib/prisma";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const adminPassword = process.env.ADMIN_PASSWORD;

app.use(express.json());

// Safely initialize the database, seed if tables are empty, and print robust diagnostics
let dbInitialized = false;
async function initializeDatabase() {
  if (dbInitialized) return;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      "⚠️ [Database Setup Error] DATABASE_URL environment variable is MISSING or UNDEFINED!\n" +
      "👉 Action Required: Please set the DATABASE_URL environment variable with your PostgreSQL connection string.\n" +
      "👉 Reference: 'postgresql://username:password@hostname:port/database?sslmode=require'"
    );
    return;
  }

  try {
    console.log("🔍 [Database] Testing PostgreSQL connection...");
    
    // 1. Test database connection
    try {
      await prisma.$queryRawUnsafe("SELECT 1;");
      console.log("✅ [Database] PostgreSQL connection successful!");
    } catch (connErr: any) {
      console.error(
        "❌ [Database Connection Failure] PostgreSQL connection test ('SELECT 1;') failed!\n" +
        "👉 Potential Causes:\n" +
        "  1. Invalid database URL or credentials (username/password/host/port)\n" +
        "  2. SSL/TLS configuration mismatches or missing '?sslmode=require'\n" +
        "  3. Neon PostgreSQL pooling limits or active service outage\n" +
        "  4. Network or host unreachable\n" +
        "👉 Error Message: " + (connErr.message || connErr)
      );
      return;
    }

    // 2. Verify settings and session schemas/counts
    let settingsCount = 0;
    try {
      settingsCount = await prisma.eventSetting.count();
    } catch (err: any) {
      console.error(
        "❌ [Database Schema Error] Failed to query EventSetting table. This usually means tables or database migrations have not been applied to your target database yet!\n" +
        "👉 Action Required: Please run 'npx prisma db push' or apply database migrations to configure your PostgreSQL target database schema.\n" +
        "👉 Error Message: " + (err.message || err)
      );
      return; // Return early, don't attempt to seed tables that don't exist yet
    }

    // 3. Seed default event setting if not exists
    if (settingsCount === 0) {
      console.log("🌱 [Database Seed] EventSetting table is empty. Seeding default event setting...");
      try {
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
        console.log("✅ [Database Seed] Default EventSetting seeded successfully.");
      } catch (seedErr: any) {
        console.error("❌ [Database Seed Error] Failed to seed default EventSetting. Error: " + (seedErr.message || seedErr));
      }
    }

    // 4. Seed default sessions if not exists
    let sessionsCount = 0;
    try {
      sessionsCount = await prisma.session.count();
    } catch (err: any) {
      console.error("❌ [Database Schema Error] Failed to query Session table. Error: " + (err.message || err));
      return;
    }

    if (sessionsCount === 0) {
      console.log("🌱 [Database Seed] Session table is empty. Seeding default sessions...");
      try {
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
          ]
        });
        console.log("✅ [Database Seed] Default Sessions seeded successfully.");
      } catch (seedErr: any) {
        console.error("❌ [Database Seed Error] Failed to seed default sessions. Error: " + (seedErr.message || seedErr));
      }
    }

    dbInitialized = true;
    console.log("🎉 [Database] Database initialization completed safely!");
  } catch (error: any) {
    console.error("🌋 [Database Exception] Fatal initialization check failure: " + (error.message || error));
  }
}

// Background, non-blocking check on server startup
initializeDatabase().catch((err) => {
  console.error("🌋 [Database Exception] Unresolved background promise error during boot: " + (err.message || err));
});

// API Authentication Middleware for Admin Panel
function adminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "عدم دسترسی. لطفاً رمز عبور مدیریت را وارد کنید." });
  }
  const token = authHeader.split(" ")[1];
  if (!adminPassword || token !== adminPassword) {
    return res.status(403).json({ error: "رمز عبور مدیریت اشتباه است." });
  }
  next();
}

// Helper to calculate sessions capacity availability in real-time
async function getSessionAvailabilities() {
  const sessions = await prisma.session.findMany();
  
  // Find all registrations where the main guest OR any companion is active (yes or maybe)
  const activeRegistrations = await prisma.registration.findMany({
    where: {
      OR: [
        { attendanceStatus: { in: ['yes', 'maybe'] } },
        { companions: { some: { attendanceStatus: { in: ['yes', 'maybe'] } } } }
      ]
    },
    include: {
      companions: {
        where: { attendanceStatus: { in: ['yes', 'maybe'] } }
      }
    }
  });

  const sessionGroupCounts: { [key: string]: number } = {};
  sessions.forEach(s => {
    sessionGroupCounts[s.id] = 0;
  });

  // Calculate deep session-group occupancy counts
  activeRegistrations.forEach(reg => {
    const attendedSessions = new Set<string>();

    if (reg.attendanceStatus === 'yes' || reg.attendanceStatus === 'maybe') {
      attendedSessions.add(reg.sessionId);
    }

    reg.companions.forEach(c => {
      attendedSessions.add(c.sessionId);
    });

    attendedSessions.forEach(sId => {
      if (sId in sessionGroupCounts) {
        sessionGroupCounts[sId]++;
      }
    });
  });

  return sessions.map(session => {
    const groupCount = sessionGroupCounts[session.id] || 0;
    const availability = Math.max(0, session.capacity - groupCount);
    
    return {
      id: session.id,
      name: session.name,
      timeRange: session.timeRange,
      capacity: session.capacity,
      isClosed: session.isClosed,
      registeredCount: groupCount,
      availability,
    };
  });
}

// Generate secure & immutable unique Registration ID (GHADIR-2026-XXXXXX)
function generateRegistrationId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `GHADIR-2026-${result}`;
}

// Send Webhook to n8n (disabled as per user request)
async function triggerN8NWebhook(data: any, action: "insert" | "update" | "delete") {
  // Silent no-op
}

// API ENDPOINTS

// 1. Get Event General info and sessions availability with self-healing auto-seed
app.get("/api/public/event", async (req, res) => {
  const getFallbackData = () => {
    return {
      settings: {
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
      sessions: [
        {
          id: "session-1",
          name: "سانس اول",
          timeRange: "16:30 - 17:30",
          capacity: 4,
          remainingCapacity: 4,
          isClosed: false,
          availability: 4,
        },
        {
          id: "session-2",
          name: "سانس دوم",
          timeRange: "17:30 - 18:30",
          capacity: 4,
          remainingCapacity: 4,
          isClosed: false,
          availability: 4,
        },
        {
          id: "session-3",
          name: "سانس سوم",
          timeRange: "18:30 - 19:30",
          capacity: 4,
          remainingCapacity: 4,
          isClosed: false,
          availability: 4,
        },
      ],
      db_unconfigured: !process.env.DATABASE_URL
    };
  };

  if (!process.env.DATABASE_URL) {
    console.warn("⚠️ [Database Warning] DATABASE_URL is not set. Serving in-memory default settings and sessions.");
    return res.json(getFallbackData());
  }

  try {
    let settings = await prisma.eventSetting.findUnique({ where: { id: "default" } });
    
    // Auto-seed settings if blank/unseeded
    if (!settings) {
      console.log("No settings found. Auto-seeding default event settings...");
      settings = await prisma.eventSetting.create({
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
      console.log("Seeded settings successfully.");
    }

    // Auto-seed sessions if they have 0 count
    const sessionCount = await prisma.session.count();
    if (sessionCount === 0) {
      console.log("No sessions found. Auto-seeding default sessions...");
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
      console.log("Seeded sessions successfully.");
    }

    const sessions = await getSessionAvailabilities();
    res.json({ settings, sessions });
  } catch (error: any) {
    console.error("Database error in /api/public/event, falling back gracefully:", error);
    const fallback = getFallbackData();
    res.json({
      ...fallback,
      db_error: error.message || String(error)
    });
  }
});

// 2. Perform Lookup by ID or Mobile Number
app.get("/api/public/lookup", async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: "لطفاً شناسه ثبت‌نام یا شماره موبایل را وارد نمایید." });
  }
  const queryStr = String(query).trim();
  try {
    const reg = await prisma.registration.findFirst({
      where: {
        OR: [
          { id: { equals: queryStr } },
          { mainGuestMobile: { equals: queryStr } }
        ]
      },
      include: {
        companions: true,
        session: true
      }
    });

    if (!reg) {
      return res.status(404).json({ error: "ثبت‌نامی با مشخصات وارد شده یافت نشد." });
    }

    res.json({ registration: reg });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Register a Guest
app.post("/api/public/register", async (req, res) => {
  const { mainGuestName, mainGuestMobile, mainGuestAge, attendanceStatus, sessionId, notes, companions } = req.body;

  if (!mainGuestName || !mainGuestMobile || !attendanceStatus || !sessionId || mainGuestAge === undefined) {
    return res.status(400).json({ error: "لطفاً اطلاعات ضروری را به صورت کامل تکمیل کنید." });
  }

  const parsedMainAge = parseInt(String(mainGuestAge), 10);
  if (isNaN(parsedMainAge) || parsedMainAge < 1 || parsedMainAge > 110) {
    return res.status(400).json({ error: "لطفاً سن معتبر برای مهمان اصلی وارد نمایید." });
  }

  if (companions && companions.length > 0) {
    for (const comp of companions) {
      const parsedCompAge = parseInt(String(comp.age), 10);
      if (isNaN(parsedCompAge) || parsedCompAge < 1 || parsedCompAge > 110) {
        return res.status(400).json({ error: `لطفاً سن معتبر برای همراه (${comp.fullName || 'وارد نشده'}) وارد نمایید.` });
      }
    }
  }

  try {
    // Check Event Settings status
    const settings = await prisma.eventSetting.findUnique({ where: { id: "default" } });
    if (!settings || settings.registrationStatus !== "open") {
      return res.status(400).json({ error: "ثبت‌نام رویداد عید غدیر بسته است." });
    }

    // Check duplicate main guest mobile
    const normalizedMainMobile = mainGuestMobile.trim();
    const existing = await prisma.registration.findUnique({
      where: { mainGuestMobile: normalizedMainMobile }
    });
    if (existing) {
      return res.status(400).json({ error: "ثبت‌نام دیگری قبلاً با این شماره موبایل انجام شده است." });
    }

    // Check if mainGuestMobile exists as a companion's mobile inside the database
    const existMainAsCompanion = await prisma.companion.findFirst({
      where: { mobileNumber: normalizedMainMobile }
    });
    if (existMainAsCompanion) {
      return res.status(400).json({ error: `شماره تلفن ${normalizedMainMobile} قبلاً به عنوان شماره همراه در سیستم ثبت شده است.` });
    }

    // Now check all companions for duplicates
    if (companions && companions.length > 0) {
      const formMobiles = new Set<string>();
      formMobiles.add(normalizedMainMobile);

      for (const comp of companions) {
        if (comp.mobileNumber) {
          const compMob = comp.mobileNumber.trim();
          
          // Check duplicate within the incoming registration form itself
          if (formMobiles.has(compMob)) {
            return res.status(400).json({ error: `شماره تلفن تکراری در همین فرم وارد شده است: ${compMob}` });
          }
          formMobiles.add(compMob);

          // Check if companion mobile exists in database as a main guest
          const existCompAsMain = await prisma.registration.findUnique({
            where: { mainGuestMobile: compMob }
          });
          if (existCompAsMain) {
            return res.status(400).json({ error: `شماره تلفن همراه ${compMob} قبلاً به عنوان مهمان اصلی در سامانه ثبت شده است.` });
          }

          // Check if companion mobile exists in database as another companion
          const existCompAsCompanion = await prisma.companion.findFirst({
            where: { mobileNumber: compMob }
          });
          if (existCompAsCompanion) {
            return res.status(400).json({ error: `شماره تلفن همراه ${compMob} قبلاً در سامانه ثبت شده است.` });
          }
        }
      }
    }

    // Check Companion counts constraint (max 4 companions, total max 5 people)
    if (companions && companions.length > 4) {
      return res.status(400).json({ error: "حداکثر تعداد همراهان مجاز ۴ نفر است." });
    }

    // Check capacities for sessions (1 group slot per registration on chosen sessions)
    const chosenSessions = new Set<string>();
    if (attendanceStatus !== "no") {
      chosenSessions.add(sessionId);
    }
    if (companions) {
      companions.forEach((comp: any) => {
        if (comp.attendanceStatus !== "no") {
          chosenSessions.add(comp.sessionId);
        }
      });
    }

    const sessionsAvail = await getSessionAvailabilities();
    const availMap: { [key: string]: number } = {};
    const closedMap: { [key: string]: boolean } = {};
    sessionsAvail.forEach(s => {
      availMap[s.id] = s.availability;
      closedMap[s.id] = s.isClosed;
    });

    for (const sId of chosenSessions) {
      if (closedMap[sId]) {
        return res.status(400).json({ error: "سانس انتخابی در حال حاضر بسته است." });
      }
      const avail = availMap[sId] ?? 0;
      if (avail < 1) {
        return res.status(400).json({ error: `ظرفیت سانس مورد نظر پر شده است.` });
      }
    }

    // Generate Unique registration ID
    let finalRegId = "";
    let attempts = 0;
    while (attempts < 10) {
      const proposal = generateRegistrationId();
      const existingId = await prisma.registration.findUnique({ where: { id: proposal } });
      if (!existingId) {
        finalRegId = proposal;
        break;
      }
      attempts++;
    }
    if (!finalRegId) {
      finalRegId = generateRegistrationId();
    }

    // Database write transaction
    const finalReg = await prisma.$transaction(async (tx) => {
      const created = await tx.registration.create({
        data: {
          id: finalRegId,
          mainGuestName: mainGuestName.trim(),
          mainGuestMobile: mainGuestMobile.trim(),
          mainGuestAge: parsedMainAge,
          attendanceStatus,
          sessionId,
          notes: notes ? notes.trim() : null,
        }
      });

      if (companions && companions.length > 0) {
        await tx.companion.createMany({
          data: companions.map((comp: any) => ({
            registrationId: finalRegId,
            fullName: comp.fullName.trim(),
            mobileNumber: comp.mobileNumber ? comp.mobileNumber.trim() : null,
            age: parseInt(String(comp.age), 10),
            attendanceStatus: comp.attendanceStatus,
            sessionId: comp.sessionId,
          }))
        });
      }

      return tx.registration.findUnique({
        where: { id: finalRegId },
        include: { companions: true, session: true }
      });
    });

    // Send Webhook non-blocking
    triggerN8NWebhook(finalReg, "insert").catch(() => {});

    res.json({ success: true, message: settings.successMessage, registration: finalReg });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Update/Edit Registration
app.put("/api/public/register/:id", async (req, res) => {
  const regId = req.params.id;
  const { mainGuestName, mainGuestMobile, mainGuestAge, attendanceStatus, sessionId, notes, companions } = req.body;

  if (!mainGuestName || !mainGuestMobile || !attendanceStatus || !sessionId || mainGuestAge === undefined) {
    return res.status(400).json({ error: "لطفاً تمامی اطلاعات ضروری را به صورت کامل پر کنید." });
  }

  const parsedMainAge = parseInt(String(mainGuestAge), 10);
  if (isNaN(parsedMainAge) || parsedMainAge < 1 || parsedMainAge > 110) {
    return res.status(400).json({ error: "لطفاً سن معتبر برای مهمان اصلی وارد نمایید." });
  }

  if (companions && companions.length > 0) {
    for (const comp of companions) {
      const parsedCompAge = parseInt(String(comp.age), 10);
      if (isNaN(parsedCompAge) || parsedCompAge < 1 || parsedCompAge > 110) {
        return res.status(400).json({ error: `لطفاً سن معتبر برای همراه (${comp.fullName || 'وارد نشده'}) وارد نمایید.` });
      }
    }
  }

  try {
    const existingReg = await prisma.registration.findUnique({
      where: { id: regId },
      include: { companions: true }
    });

    if (!existingReg) {
      return res.status(404).json({ error: "ثبت‌نامی با این کد یافت نشد." });
    }

    // Check duplicate main guest mobile with others
    const normalizedMainMobile = mainGuestMobile.trim();
    const conflictMobile = await prisma.registration.findFirst({
      where: {
        mainGuestMobile: normalizedMainMobile,
        NOT: { id: regId }
      }
    });

    if (conflictMobile) {
      return res.status(400).json({ error: "شماره موبایل وارد شده متعلق به ثبت‌نام دیگری است." });
    }

    // Check if main guest mobile exists as a companion mobile in any OTHER registration
    const existMainAsCompanionConflict = await prisma.companion.findFirst({
      where: {
        mobileNumber: normalizedMainMobile,
        NOT: { registrationId: regId }
      }
    });

    if (existMainAsCompanionConflict) {
      return res.status(400).json({ error: `شماره تلفن ${normalizedMainMobile} قبلاً به عنوان شماره همراه در سیستم ثبت شده است.` });
    }

    // Now check companions for duplicates
    if (companions && companions.length > 0) {
      const formMobiles = new Set<string>();
      formMobiles.add(normalizedMainMobile);

      for (const comp of companions) {
        if (comp.mobileNumber) {
          const compMob = comp.mobileNumber.trim();

          // Check duplicate within the edited form itself
          if (formMobiles.has(compMob)) {
            return res.status(400).json({ error: `شماره تلفن تکراری در همین فرم وارد شده است: ${compMob}` });
          }
          formMobiles.add(compMob);

          // Check if companion mobile exists in database as a main guest in any OTHER registration
          const existCompAsMainConflict = await prisma.registration.findFirst({
            where: {
              mainGuestMobile: compMob,
              NOT: { id: regId }
            }
          });
          if (existCompAsMainConflict) {
            return res.status(400).json({ error: `شماره تلفن همراه ${compMob} متعلق به بلیت مهمان اصلی دیگری در سیستم است.` });
          }

          // Check if companion mobile exists in database as a companion in any OTHER registration
          const existCompAsCompanionConflict = await prisma.companion.findFirst({
            where: {
              mobileNumber: compMob,
              NOT: { registrationId: regId }
            }
          });
          if (existCompAsCompanionConflict) {
            return res.status(400).json({ error: `شماره تلفن همراه ${compMob} متعلق به همراه ثبت‌نامی دیگری است.` });
          }
        }
      }
    }

    if (companions && companions.length > 4) {
      return res.status(400).json({ error: "حداکثر تعداد همراهان مجاز ۴ نفر است." });
    }

    // Validate capacity by excluding currently selected sessions of this RSVP (1 group per reservation)
    const existingSessions = new Set<string>();
    if (existingReg.attendanceStatus !== "no") {
      existingSessions.add(existingReg.sessionId);
    }
    existingReg.companions.forEach(c => {
      if (c.attendanceStatus !== "no") {
        existingSessions.add(c.sessionId);
      }
    });

    const chosenSessions = new Set<string>();
    if (attendanceStatus !== "no") {
      chosenSessions.add(sessionId);
    }
    if (companions) {
      companions.forEach((comp: any) => {
        if (comp.attendanceStatus !== "no") {
          chosenSessions.add(comp.sessionId);
        }
      });
    }

    const sessionsAvail = await getSessionAvailabilities();
    const availMap: { [key: string]: number } = {};
    sessionsAvail.forEach(s => {
      const occupiedHere = existingSessions.has(s.id) ? 1 : 0;
      availMap[s.id] = s.availability + occupiedHere; // re-add currently occupied group slots
    });

    for (const sId of chosenSessions) {
      const avail = availMap[sId] ?? 0;
      if (avail < 1) {
        return res.status(400).json({ error: `ظرفیت سانس مورد نظر پر شده است. ظرفیت آزاد با احتساب رزرو فعلی شما: ${avail} گروه` });
      }
    }

    // Database update transaction
    const finalUpdated = await prisma.$transaction(async (tx) => {
      // 1. Update main guest info
      await tx.registration.update({
        where: { id: regId },
        data: {
          mainGuestName: mainGuestName.trim(),
          mainGuestMobile: mainGuestMobile.trim(),
          mainGuestAge: parsedMainAge,
          attendanceStatus,
          sessionId,
          notes: notes ? notes.trim() : null,
        }
      });

      // 2. Remove old companions
      await tx.companion.deleteMany({
        where: { registrationId: regId }
      });

      // 3. Create new companions
      if (companions && companions.length > 0) {
        await tx.companion.createMany({
          data: companions.map((comp: any) => ({
            registrationId: regId,
            fullName: comp.fullName.trim(),
            mobileNumber: comp.mobileNumber ? comp.mobileNumber.trim() : null,
            age: parseInt(String(comp.age), 10),
            attendanceStatus: comp.attendanceStatus,
            sessionId: comp.sessionId,
          }))
        });
      }

      return tx.registration.findUnique({
        where: { id: regId },
        include: { companions: true, session: true }
      });
    });

    // Send Webhook with updated data non-blocking
    triggerN8NWebhook(finalUpdated, "update").catch(() => {});

    res.json({ success: true, message: "اطلاعات ثبت‌نام شما با موفقیت به روز گردید.", registration: finalUpdated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ADMIN PANEL ENDPOINTS (Authenticated via adminAuth middleware)

// 1. Verify admin password
app.post("/api/admin/verify", (req, res) => {
  const { password } = req.body;
  if (adminPassword && password === adminPassword) {
    return res.json({ success: true });
  }
  res.status(401).json({ error: "رمز عبور وارد شده اشتباه است یا پنل مدیریت پیکربندی نشده است." });
});

// 2. Fetch all registered guests
app.get("/api/admin/registrations", adminAuth, async (req, res) => {
  try {
    const list = await prisma.registration.findMany({
      include: {
        companions: {
          include: {
            session: true
          }
        },
        session: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ registrations: list });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Delete a registration
app.delete("/api/admin/registrations/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const target = await prisma.registration.findUnique({
      where: { id },
      include: { companions: true }
    });

    if (!target) {
      return res.status(404).json({ error: "ثبت‌نامی یافت نشد." });
    }

    // SQLite deletion sequential
    await prisma.companion.deleteMany({ where: { registrationId: id } });
    await prisma.registration.delete({ where: { id } });

    // Notify Webhook non-blocking
    triggerN8NWebhook(target, "delete").catch(() => {});

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 3.5. Publicly delete/cancel registration
app.delete("/api/public/register/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const target = await prisma.registration.findUnique({
      where: { id },
      include: { companions: true }
    });

    if (!target) {
      return res.status(404).json({ error: "ثبت‌نامی جهت لغو یافت نشد." });
    }

    // SQLite deletion sequential
    await prisma.companion.deleteMany({ where: { registrationId: id } });
    await prisma.registration.delete({ where: { id } });

    // Notify Webhook non-blocking
    triggerN8NWebhook(target, "delete").catch(() => {});

    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Update Event Settings
app.put("/api/admin/settings", adminAuth, async (req, res) => {
  const {
    eventTitle,
    programInfo,
    escapeBoxName,
    solarDate,
    hijriDate,
    eventTime,
    address,
    coordinates,
    registrationStatus,
    successMessage,
    errorMessage,
    maxGuests
  } = req.body;

  try {
    const updated = await prisma.eventSetting.update({
      where: { id: "default" },
      data: {
        eventTitle,
        programInfo,
        escapeBoxName,
        solarDate,
        hijriDate,
        eventTime,
        address,
        coordinates,
        registrationStatus,
        successMessage,
        errorMessage,
        maxGuests: parseInt(maxGuests, 10) || 5
      }
    });

    res.json({ success: true, settings: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Update Session capacities / toggle close state
app.put("/api/admin/sessions/:id", adminAuth, async (req, res) => {
  const { id } = req.params;
  const { capacity, isClosed } = req.body;

  try {
    const updated = await prisma.session.update({
      where: { id },
      data: {
        capacity: parseInt(capacity, 10),
        isClosed: isClosed === true
      }
    });

    res.json({ success: true, session: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// INTEGRATION WITH VITE DEV MIDDLEWARE AND STATIC SERVING
async function serveApp() {
  if (process.env.NODE_ENV !== "production") {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [Full-stack Server] Ghadir RSVP Platform listening on port ${PORT}`);
    console.log(`📡 Production flag: ${process.env.NODE_ENV === "production" ? "ACTIVE" : "INACTIVE"}`);
  });
}

if (!process.env.VERCEL) {
  serveApp().catch((err) => {
    console.error("🌋 Server fail-to-boot:", err);
  });
}

export default app;

