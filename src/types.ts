export interface Session {
  id: string;
  name: string;
  timeRange: string;
  capacity: number;
  isClosed: boolean;
  registeredCount?: number;
  availability?: number;
}

export interface Companion {
  id?: number;
  fullName: string;
  mobileNumber?: string;
  age: number;
  attendanceStatus: "yes" | "maybe" | "no";
  sessionId: string;
}

export interface Registration {
  id: string;
  mainGuestName: string;
  mainGuestMobile: string;
  mainGuestAge: number;
  attendanceStatus: "yes" | "maybe" | "no";
  sessionId: string;
  session?: Session;
  notes?: string | null;
  createdAt?: string | Date;
  companions: Companion[];
}

export interface EventSetting {
  id: string;
  eventTitle: string;
  programInfo: string;
  escapeBoxName: string;
  solarDate: string;
  hijriDate: string;
  eventTime: string;
  address: string;
  coordinates: string;
  registrationStatus: "open" | "closed";
  successMessage: string;
  errorMessage: string;
  maxGuests: number;
}

// Response models
export interface PublicEventResponse {
  settings: EventSetting;
  sessions: Session[];
}

export interface SearchLookupDetails {
  registrationId?: string;
  mobile?: string;
}
