"use client";

import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type {
  PlaidLinkOnSuccessMetadata,
  PlaidLinkOptions,
} from "react-plaid-link";
import {
  isSupabaseConfigured,
  registerDevicePasskey,
  signInWithDevicePasskey,
  supabase,
} from "@/lib/supabase";

type TaskCategory =
  | "school"
  | "communications"
  | "financial"
  | "housing"
  | "food"
  | "vehicle"
  | "work"
  | "medical"
  | "emergency"
  | "logistics"
  | "calendar"
  | "documents"
  | "travel"
  | "social"
  | "admin"
  | "health"
  | "life";
type TaskStatus = "ok" | "due" | "snoozed" | "needs_help" | "escalated";
type ActionType = "done" | "already_did_it" | "snooze" | "need_help" | "created";
type SyncStatus = "loading" | "local" | "supabase" | "syncing" | "error";

type SupportTask = {
  id: string;
  title: string;
  category: TaskCategory;
  description: string;
  normalIntervalDays: number;
  maxGapDays: number;
  lastCompletedAt: string;
  status: TaskStatus;
};

type AcademicSupportResource = {
  name: string;
  shortName: string;
  useFor: string;
  timing: string;
  contact: string;
  href: string | null;
  details?: string[];
};

type HistoryEntry = {
  id: string;
  taskId: string | null;
  taskTitle: string;
  type: ActionType;
  createdAt: string;
};

type TaskRow = {
  id: string;
  assigned_user_id: string;
  created_by: string;
  title: string;
  category: TaskCategory;
  description: string;
  normal_interval_days: number;
  max_gap_days: number;
  last_completed_at: string;
  status: TaskStatus;
  updated_at?: string;
};

type HistoryRow = {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string;
  action_type: ActionType;
  created_at: string;
};

type SchoolAssignment = {
  id: string;
  courseName: string;
  title: string;
  dueAt: string | null;
  url: string | null;
  pointsPossible: number | null;
  workflowState: string | null;
};

type SchoolAssignmentRow = {
  id: string;
  course_name: string;
  title: string;
  due_at: string | null;
  url: string | null;
  points_possible: number | null;
  workflow_state: string | null;
};

type EmailDraft = {
  id: string;
  source: string;
  recipientEmail: string | null;
  subject: string;
  body: string;
  status: string;
  createdByAgent: string;
  updatedAt: string;
};

type EmailDraftRow = {
  id: string;
  source: string;
  recipient_email: string | null;
  subject: string;
  body: string;
  status: string;
  created_by_agent: string;
  updated_at: string;
};

type HousingDocument = {
  id: string;
  title: string;
  documentType: string;
  status: string;
  storagePath: string | null;
  fileUrl: string | null;
  importantDate: string | null;
  notes: string | null;
  updatedAt: string;
};

type HousingDocumentRow = {
  id: string;
  title: string;
  document_type: string;
  status: string;
  storage_path: string | null;
  file_url: string | null;
  important_date: string | null;
  notes: string | null;
  updated_at: string;
};

type FinancialAccount = {
  plaidAccountId: string;
  name: string;
  officialName: string | null;
  mask: string | null;
  accountType: string;
  accountSubtype: string | null;
  availableBalance: number | null;
  currentBalance: number | null;
  isoCurrencyCode: string | null;
  updatedAt: string;
};

type FinancialAccountRow = {
  plaid_account_id: string;
  name: string;
  official_name: string | null;
  mask: string | null;
  account_type: string;
  account_subtype: string | null;
  available_balance: number | null;
  current_balance: number | null;
  iso_currency_code: string | null;
  updated_at: string;
};

type PlaidConnectionPayload = {
  connected: boolean;
  institutionName: string | null;
  accounts: FinancialAccountRow[];
  lastSyncedAt: string | null;
  error?: string;
};

type CanvasConnection = {
  connected: boolean;
  canvasBaseUrl: string | null;
  expiresAt: string | null;
  lastImportedAt: string | null;
  updatedAt: string | null;
};

type CanvasConnectionStatusRow = {
  canvas_base_url: string;
  expires_at: string;
  last_imported_at: string | null;
  updated_at: string;
};

const dayMs = 24 * 60 * 60 * 1000;
const storageKey = "josephine-support-state-v1";
const primaryAccessEmail = "chilton18@gmail.com";
const devicePasskeyName = "Josephine MacBook Touch ID";
const defaultCanvasBaseUrl = "https://colostate.instructure.com";
const creditUnionUrl = process.env.NEXT_PUBLIC_CREDIT_UNION_URL?.trim() ?? "";
const viperCamUrl = process.env.NEXT_PUBLIC_VIPER_CAM_URL?.trim() ?? "";
const diningHoursUrl = "https://housing.colostate.edu/dining/";
const grubhubCampusUrl = "https://www.grubhub.com/campus";
const healthNetworkUrl = "https://health.colostate.edu/";
const healthPortalUrl = "https://portal.health.colostate.edu/";
const studentInsuranceUrl =
  "https://thehub.colostate.edu/student-health-insurance-information/";
const csuPoliceUrl = "https://police.colostate.edu/";
const safeWalkUrl = "https://police.colostate.edu/safe-walk/";
const csuSafetyUrl = "https://safety.colostate.edu/";
const ramCardUrl = "https://www.ramcash.colostate.edu/";
const transitUrl =
  "https://pts.colostate.edu/active-transportation-and-transit-commuter-services/transit-and-shuttles/";
const parkingUrl = "https://pts.colostate.edu/parking-services/";
const mailServicesUrl = "https://mailservices.colostate.edu/";
const authNetworkErrorMessage =
  "Could not reach Supabase Auth. Check NEXT_PUBLIC_SUPABASE_URL in .env.local, restart the dev server, then try again.";

const campusDiningLocations = [
  {
    name: "Braiden Dining Center",
    focus: "Home base",
    schedule: "Use first for breakfast, lunch, dinner, and between-class meals.",
    note: "Braiden Hall contains Braiden Dining Center and RAMwich pickup.",
  },
  {
    name: "Lory Student Center",
    focus: "Class-day backup",
    schedule: "Use between classes for quick meals and national-chain options.",
    note: "CSU lists local favorites plus national chains in the LSC.",
  },
  {
    name: "Academic Village / Ram's Horn",
    focus: "South-campus option",
    schedule: "Use when near Academic Village, Edwards, Summit, or Ingersoll.",
    note: "Good alternate dining center when Braiden is crowded or closed.",
  },
  {
    name: "Durrell Center",
    focus: "Northwest-campus option",
    schedule: "Use when near Moby, Durward, Westfall, or Laurel Village.",
    note: "CSU map lists Durrell Dining Center and Durrell Express.",
  },
  {
    name: "Corbett / Parmelee",
    focus: "North-campus option",
    schedule: "Use when near the Rec Center, Corbett, Parmelee, or north campus.",
    note: "CSU map lists Corbett Marketplace and Parmelee Dining Center.",
  },
  {
    name: "Allison Café",
    focus: "Light meal option",
    schedule: "Use for smaller breakfast or lunch when near Allison and LSC.",
    note: "CSU map lists continental breakfast and Spoons Soups and Salads for lunch.",
  },
];

const robotDeliverySteps = [
  "Open Grubhub and choose the CSU campus dining option.",
  "Pick a campus restaurant that offers robot delivery.",
  "Set the delivery pin outside Braiden Hall or the closest safe outdoor pickup spot.",
  "Watch the order tracker and go outside when the robot arrives.",
  "Use this when going out feels too hard, the weather is bad, or energy is low.",
];

const miniFridgeShoppingList = [
  "Greek yogurt cups",
  "Cheese sticks or Babybel",
  "Hummus cups",
  "Baby carrots or snap peas",
  "Apples, grapes, or berries",
  "Microwave rice or pasta cups",
  "Protein drinks or shelf-stable shakes",
  "Turkey, tuna, or tofu snack packs",
  "Granola bars",
  "Crackers or pretzels",
  "Peanut butter or sunflower butter",
  "Sparkling water or electrolyte drinks",
];

const testingCenterRules = [
  "Schedule in-person exams and quizzes in the SDC student portal.",
  "Regular exams and quizzes must be scheduled at least 7 days before the exam date.",
  "Final exams must be scheduled 1 month before the exam date.",
  "Schedule at the same date and time as class unless the instructor gives written approval.",
  "Ask the Accessible Testing Center if accommodations are missing or unclear.",
];

const accommodationReadinessSteps = [
  "Review approved accommodations in the SDC student portal under My Eligibilities.",
  "Send accommodation letters to instructors at the start of every semester.",
  "Use flexibility accommodations by communicating with instructors when an extension is needed.",
  "Contact SDC quickly if an instructor does not provide an accommodation.",
  "Review the SDC Accommodation Handbook before the semester gets busy.",
];

const communityInterestWatchlist = [
  "Black Student Union",
  "Delta Sigma Theta Sorority",
  "Black/African American Cultural Center events",
];

const socialDecoderChecks = [
  "What is the sender probably asking for directly?",
  "What might be implied but not said out loud?",
  "What tone does it seem to have: friendly, neutral, urgent, frustrated, joking, or unclear?",
  "Does this need a reply now, later, or not at all?",
  "What is a safe, kind response that does not over-share?",
  "What should be checked with a trusted person before replying?",
];

const socialDecoderSources = [
  {
    name: "Email",
    detail:
      "Use with CSU email and Gmail triage so confusing messages get a plain-language social read.",
  },
  {
    name: "Texts",
    detail:
      "Start with copy/paste or share-sheet text Josephine chooses. Do not silently read Mac Messages.",
  },
  {
    name: "Professors and staff",
    detail:
      "Decode formality, hidden deadlines, office-hours invitations, and what reply is expected.",
  },
  {
    name: "Peers and roommates",
    detail:
      "Decode tone, plans, invitations, conflict signals, and when to ask a clarifying question.",
  },
];

const housingAccommodationNotes = [
  "Approved housing accommodation: single room in a suite.",
  "Confirm with SDC or Housing whether the accommodation needs annual renewal.",
  "Track renewal, contract, room assignment, and move-in deadlines in Housing.",
];

const vehicleProfile = {
  name: "2017 Volkswagen Touareg",
  role: "Campus car",
  note: "Use monthly odometer checks so maintenance is based on real miles, not memory.",
};

const vehicleMaintenancePlan = [
  {
    name: "Monthly miles check",
    cadence: "Every month",
    detail:
      "Record odometer, fuel level, warning lights, tire pressure concerns, and any new noises.",
  },
  {
    name: "Fuel check",
    cadence: "Weekly",
    detail:
      "Check before the week starts and refill before the tank drops below one quarter.",
  },
  {
    name: "Wash and clean out",
    cadence: "Monthly",
    detail:
      "Wash exterior, clear trash, check wipers, and refill windshield washer fluid if low.",
  },
  {
    name: "Oil service planning",
    cadence: "Every 10,000 miles or 12 months",
    detail:
      "Use the odometer check to plan oil/filter service before the dashboard reminder becomes stressful.",
  },
];

const vehicleAgentIdeas = [
  "Start with in-app mileage logs and receipt/document reminders.",
  "Later, read service receipts from email and update the next oil-service estimate.",
  "Use official/service-shop guidance before recommending repairs or spending money.",
  "Do not connect insurance, telematics, or location tracking unless Josephine explicitly wants it.",
];

const handshakeUrl = "https://bizcareers.colostate.edu/resources/handshake/";
const workdayStudentEmploymentUrl =
  "https://workday.csusystem.edu/student-employment-faqs/";

const workDocumentFolders = [
  "Resume and cover letters",
  "Offer letters and onboarding paperwork",
  "Work schedule screenshots or PDFs",
  "Timesheets and pay stubs",
  "Tax forms such as W-4 and W-2",
  "Training certificates and workplace policies",
];

const workSupportPlan = [
  {
    name: "Job search",
    cadence: "Weekly while looking",
    detail:
      "Review Handshake, save promising roles, and keep applications in one list.",
  },
  {
    name: "Hours check",
    cadence: "Weekly when employed",
    detail:
      "Record hours worked, compare to the posted schedule, and flag weeks that may overload school.",
  },
  {
    name: "Paycheck check",
    cadence: "Every pay period",
    detail:
      "Confirm the paycheck arrived, hours look right, and money tasks are updated.",
  },
  {
    name: "Work documents",
    cadence: "As needed",
    detail:
      "Store job documents in Google Drive and keep only metadata/reminders in the app.",
  },
];

const workAgentIdeas = [
  "Summarize job postings into schedule, commute, pay, duties, and application steps.",
  "Compare work hours against class workload before accepting extra shifts.",
  "Draft messages to supervisors about availability, schedule questions, or accommodations.",
  "Track pay-period reminders without storing full tax or payroll documents in app code.",
];

const viperCamSetupOptions = [
  {
    name: "Barn Wi-Fi available",
    detail:
      "Use a weather-resistant Wi-Fi or PoE camera and link to the private camera app or secure stream.",
  },
  {
    name: "No reliable Wi-Fi",
    detail:
      "Use a solar LTE camera with a data plan, then open the vendor's authenticated viewer from the app.",
  },
  {
    name: "True embedded feed",
    detail:
      "Choose a camera/NVR with RTSP or WebRTC support and proxy it server-side without exposing credentials.",
  },
];

const viperCamSafetyNotes = [
  "Keep the live feed private and password-protected.",
  "Do not put camera usernames, passwords, or public stream URLs in app code.",
  "Aim the camera at Viper's stall/paddock, not neighboring properties or people-heavy areas.",
  "Start with an Open Viper Cam button; embed video later once the equipment path is confirmed.",
];

const medicalSupportPlan = [
  {
    name: "Insurance stuff",
    cadence: "Before fall and after changes",
    detail:
      "Keep insurance card, pharmacy card, and CSU health requirement status easy to find.",
  },
  {
    name: "Prescriptions",
    cadence: "Monthly",
    detail:
      "Check refill dates, pharmacy location, remaining doses, and who to contact if something runs low.",
  },
  {
    name: "Appointments",
    cadence: "As needed",
    detail:
      "Use the CSU Health Network portal for appointments, secure messages, forms, and immunization items.",
  },
  {
    name: "Urgent care plan",
    cadence: "Set once, review each semester",
    detail:
      "Know where to go for same-day care, after-hours support, and what symptoms mean call now.",
  },
];

const emergencyPlanItems = [
  {
    name: "Emergency",
    contact: "Call or text 911",
    detail: "Use for immediate danger, medical emergency, fire, or suspected stalking/following.",
  },
  {
    name: "CSU Police non-emergency",
    contact: "970-491-6425",
    detail: "Use for non-emergency safety concerns on campus.",
  },
  {
    name: "SafeWalk",
    contact: "970-491-1155",
    detail: "Dusk-to-dawn campus walking escort when she feels unsafe walking alone.",
  },
  {
    name: "Family backup",
    contact: "Trusted people",
    detail: "Keep the people she trusts easy to find without putting phone numbers in code.",
  },
];

const campusLogisticsItems = [
  {
    name: "RamCard",
    detail:
      "Student ID, dining, building access, RamCash, printing, recreation center, and library use.",
    href: ramCardUrl,
  },
  {
    name: "Parking and car",
    detail:
      "Confirm parking permit, license plate rules, campus maps, and where to park on class days.",
    href: parkingUrl,
  },
  {
    name: "Transit",
    detail:
      "Use Around the Horn, Transfort, MAX, and courtesy shuttle info for backup transportation.",
    href: transitUrl,
  },
  {
    name: "Mail and packages",
    detail:
      "Track mailing address, package pickup routine, and package notification emails.",
    href: mailServicesUrl,
  },
  {
    name: "Laundry",
    detail:
      "Know where to go, how to pay, and what to bring before the clean-clothes crisis.",
    href: null,
  },
];

const semesterLaunchItems = [
  "Send accommodation letters and confirm SDC portal access.",
  "Import Canvas assignments and upload syllabi or syllabus links.",
  "Capture exam dates, final exam dates, and SDC testing deadlines.",
  "Buy or rent textbooks and confirm audiobook/accessible format needs.",
  "Save professor office hours, TA contacts, and tutoring resources.",
  "Pick a weekly planning time, study blocks, meal anchors, and sleep anchors.",
];

const calendarRoutineItems = [
  "Weekly reset",
  "Class schedule and room check",
  "Study blocks before due dates",
  "Meals and hydration anchors",
  "Sleep and wake routine",
  "Work shifts and downtime",
  "Appointments and transportation buffers",
];

const importantDocumentFolders = [
  "ID and RamCard backup info",
  "Insurance and medical",
  "SDC accommodations",
  "Housing",
  "Financial aid and billing",
  "Vehicle",
  "Work and tax",
  "Travel",
];

const packingInventoryItems = [
  "Dorm room essentials",
  "Medication and health supplies",
  "Chargers and assistive tech",
  "Laundry and cleaning",
  "Weather gear",
  "Mini-fridge food backups",
  "Car emergency kit",
];

const travelSupportItems = [
  "Plan trips home and Viper visits around due dates.",
  "Keep packing lists for Colorado-to-California travel.",
  "Track flight, shuttle, or driving details in one place.",
  "Add recovery time after long travel days.",
];

const socialBelongingItems = [
  "Try one campus event or community connection each week.",
  "Watch for Black Student Union and Cultural Resource Center announcements.",
  "Track Delta Sigma Theta interest and informational events.",
  "Use Key LLC, OPS, and trusted peers for low-pressure connection.",
];

const supportScriptIdeas = [
  "Professor: ask for clarification, office hours, an extension, or accommodation follow-up.",
  "RA or housing: ask about room, roommate/suitemate, maintenance, or package issues.",
  "Supervisor: ask about schedule, hours, availability, or time-off needs.",
  "SDC: report accommodation problems or ask how to use an approved support.",
  "Caregiver: ask for help choosing the next step when something feels stuck.",
];

const planningAgentIdeas = [
  "Semester setup helper: syllabi, due dates, textbooks, testing, and accommodation letters.",
  "Weekly planning helper: school, food, health, work, friends, money, and travel load.",
  "Document helper: routes PDFs to Drive folders and creates reminders.",
  "Support helper: flags overdue items and suggests who to contact.",
  "Social decoder: explains tone, implied asks, urgency, and safe reply options for selected emails or texts.",
];

const academicSupportResources: AcademicSupportResource[] = [
  {
    name: "Assistive Technology Resource Center",
    shortName: "ATRC",
    useFor:
      "Choosing tools for reading, writing, note-taking, organization, and access.",
    timing: "Request a meeting before assignments pile up.",
    contact: "970-491-6258 · atrc@colostate.edu",
    href: "https://www.chhs.colostate.edu/atrc/student-services/",
  },
  {
    name: "TILT Tutoring",
    shortName: "TILT",
    useFor: "Course tutoring, study strategy, and getting unstuck early.",
    timing: "Schedule several days before a quiz, test, or major due date.",
    contact: "Use CSU TILT tutoring resources.",
    href: "https://tilt.colostate.edu/learning/tutoring/freeacademicsupport/",
  },
  {
    name: "Student Disability Center",
    shortName: "SDC",
    useFor: "Accommodation questions, support planning, and access issues.",
    timing: "Contact as soon as an accommodation problem appears.",
    contact: "970-491-6385",
    href: "https://disabilitycenter.colostate.edu/",
  },
  {
    name: "Accessible Testing Center",
    shortName: "Testing",
    useFor: "Scheduling accommodated exams.",
    timing: "Book regular exams 7 days ahead and finals 1 month ahead.",
    contact: "sdctest@colostate.edu · 970-491-3574",
    href: "https://disabilitycenter.colostate.edu/sdc-student-portal-information/",
    details: testingCenterRules,
  },
  {
    name: "Key Living and Learning Community",
    shortName: "Key LLC",
    useFor: "Peer/community support and help navigating first-year routines.",
    timing: "Use for planning, accountability, and campus connection.",
    contact: "Use Key community staff and programming.",
    href: "https://key.lc.colostate.edu/",
  },
  {
    name: "Opportunities for Postsecondary Success",
    shortName: "OPS",
    useFor: "Structured support for postsecondary success and follow-through.",
    timing: "Use for recurring planning and accountability.",
    contact: "Use Josephine's OPS contact once confirmed.",
    href: "https://www.chhs.colostate.edu/ccp/programs/opportunities-for-postsecondary-success/",
  },
  {
    name: "CSU Health Network",
    shortName: "Wellbeing",
    useFor: "Mental health resources, skill-building, support groups, and HelpCompass.",
    timing: "Use before stress turns into a crisis.",
    contact: "Use CSU Health Network and HelpCompass resources.",
    href: "https://health.colostate.edu/mental-health-resources/",
  },
  {
    name: "Cultural Resource Centers",
    shortName: "Community",
    useFor: "Finding belonging, events, Black Student Union leads, and community support.",
    timing: "Check weekly during the first semester.",
    contact: "Start with CSU Cultural Resource Centers.",
    href: "https://inclusiveexcellence.colostate.edu/cultural-and-resource-centers",
  },
];

function SupportPageLink({ href }: { href: string }) {
  return (
    <Link
      className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
      href={href}
    >
      Open full page
    </Link>
  );
}

function daysAgo(count: number) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() - count);
  return date.toISOString();
}

function createStarterTasks(): SupportTask[] {
  return [
    {
      id: "shower",
      title: "Shower",
      category: "health",
      description:
        "Shows up every couple of days. If it slips a week, it moves into backup-check mode.",
      normalIntervalDays: 2,
      maxGapDays: 7,
      lastCompletedAt: daysAgo(3),
      status: "due",
    },
    {
      id: "brush-teeth-night",
      title: "Brush teeth at night",
      category: "health",
      description:
        "Small night reset. If it gets skipped, the app brings it back gently.",
      normalIntervalDays: 1,
      maxGapDays: 2,
      lastCompletedAt: daysAgo(1),
      status: "due",
    },
    {
      id: "laundry",
      title: "Laundry",
      category: "life",
      description:
        "Weekly-ish clothes reset so laundry does not become an emergency.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(5),
      status: "ok",
    },
    {
      id: "money-bills-check",
      title: "Money check-in",
      category: "financial",
      description:
        "Quick look at balance, bills, and anything that needs backup before it gets stressful.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(6),
      status: "ok",
    },
    {
      id: "housing-documents-check",
      title: "Housing paperwork check",
      category: "housing",
      description:
        "Keep contracts, move-in notes, room info, and housing dates from getting buried.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(10),
      status: "ok",
    },
    {
      id: "mini-fridge-restock",
      title: "Mini-fridge restock",
      category: "food",
      description:
        "Restock easy snacks, backup meals, and drinks for low-energy days.",
      normalIntervalDays: 14,
      maxGapDays: 21,
      lastCompletedAt: daysAgo(12),
      status: "due",
    },
    {
      id: "monthly-mileage-check",
      title: "Monthly mileage check",
      category: "vehicle",
      description:
        "Record the Touareg odometer, fuel level, warning lights, tire pressure concerns, and any new noises.",
      normalIntervalDays: 30,
      maxGapDays: 45,
      lastCompletedAt: daysAgo(34),
      status: "due",
    },
    {
      id: "fuel-check",
      title: "Check gas level",
      category: "vehicle",
      description:
        "Look at the tank before the week starts and refill before it gets below one quarter.",
      normalIntervalDays: 7,
      maxGapDays: 10,
      lastCompletedAt: daysAgo(6),
      status: "ok",
    },
    {
      id: "car-wash-cleanout",
      title: "Wash and clean out car",
      category: "vehicle",
      description:
        "Monthly reset for the Touareg: wash exterior, clear trash, check wipers, and refill washer fluid if low.",
      normalIntervalDays: 30,
      maxGapDays: 45,
      lastCompletedAt: daysAgo(32),
      status: "due",
    },
    {
      id: "oil-service-plan",
      title: "Plan oil service",
      category: "vehicle",
      description:
        "Use odometer notes to schedule oil and filter service around every 10,000 miles or 12 months.",
      normalIntervalDays: 90,
      maxGapDays: 180,
      lastCompletedAt: daysAgo(96),
      status: "due",
    },
    {
      id: "work-job-search-check",
      title: "Check job options",
      category: "work",
      description:
        "Review Handshake for part-time roles and save anything that fits school schedule, transportation, and energy.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(8),
      status: "due",
    },
    {
      id: "work-hours-check",
      title: "Track work hours",
      category: "work",
      description:
        "When employed, record weekly hours and flag any schedule that crowds assignments, sleep, meals, or accommodations.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(6),
      status: "ok",
    },
    {
      id: "work-documents-check",
      title: "Store work documents",
      category: "work",
      description:
        "Put resumes, offer letters, onboarding forms, schedules, pay stubs, and tax forms in the Work folder in Google Drive.",
      normalIntervalDays: 30,
      maxGapDays: 60,
      lastCompletedAt: daysAgo(31),
      status: "due",
    },
    {
      id: "medical-insurance-check",
      title: "Health insurance check",
      category: "medical",
      description:
        "Confirm insurance requirement status, insurance card, pharmacy card, and CSU Health Network portal access.",
      normalIntervalDays: 120,
      maxGapDays: 180,
      lastCompletedAt: daysAgo(130),
      status: "due",
    },
    {
      id: "prescription-refill-check",
      title: "Medication refill check",
      category: "medical",
      description:
        "Check refill dates, remaining doses, pharmacy location, and whether support is needed before anything runs low.",
      normalIntervalDays: 30,
      maxGapDays: 40,
      lastCompletedAt: daysAgo(28),
      status: "ok",
    },
    {
      id: "emergency-plan-review",
      title: "Review emergency plan",
      category: "emergency",
      description:
        "Confirm emergency contacts, CSU Police, SafeWalk, RA/front desk, and what to do when help is needed now.",
      normalIntervalDays: 90,
      maxGapDays: 120,
      lastCompletedAt: daysAgo(95),
      status: "due",
    },
    {
      id: "campus-alerts-check",
      title: "Check campus safety alerts",
      category: "emergency",
      description:
        "Confirm CSU safety alerts are set up and the SafeWalk number is easy to find.",
      normalIntervalDays: 120,
      maxGapDays: 180,
      lastCompletedAt: daysAgo(122),
      status: "due",
    },
    {
      id: "campus-logistics-check",
      title: "Campus basics check",
      category: "logistics",
      description:
        "Check RamCard, parking permit, transit backup, laundry, mail/packages, and package pickup routine.",
      normalIntervalDays: 30,
      maxGapDays: 45,
      lastCompletedAt: daysAgo(33),
      status: "due",
    },
    {
      id: "weekly-planning-review",
      title: "Weekly reset",
      category: "calendar",
      description:
        "Balance assignments, meals, sleep, work, appointments, transportation, and social plans for the week.",
      normalIntervalDays: 7,
      maxGapDays: 10,
      lastCompletedAt: daysAgo(7),
      status: "due",
    },
    {
      id: "semester-launch-checklist",
      title: "Semester launch",
      category: "school",
      description:
        "Review syllabi, textbooks, accommodation letters, exam dates, office hours, and Canvas imports at the start of term.",
      normalIntervalDays: 120,
      maxGapDays: 150,
      lastCompletedAt: daysAgo(125),
      status: "due",
    },
    {
      id: "important-documents-check",
      title: "Organize docs",
      category: "documents",
      description:
        "Make sure IDs, insurance, SDC, housing, financial, vehicle, work, and travel documents are in the right Drive folders.",
      normalIntervalDays: 30,
      maxGapDays: 60,
      lastCompletedAt: daysAgo(37),
      status: "due",
    },
    {
      id: "room-inventory-check",
      title: "Room inventory",
      category: "logistics",
      description:
        "Update what she has, what she needs, what is stored at home, and what should travel back to school.",
      normalIntervalDays: 60,
      maxGapDays: 90,
      lastCompletedAt: daysAgo(66),
      status: "due",
    },
    {
      id: "travel-home-plan",
      title: "Plan travel home or Viper visit",
      category: "travel",
      description:
        "Plan travel around deadlines, transportation, packing, recovery time, and Viper visit hopes.",
      normalIntervalDays: 60,
      maxGapDays: 90,
      lastCompletedAt: daysAgo(61),
      status: "due",
    },
    {
      id: "social-belonging-check",
      title: "Try one social connection",
      category: "social",
      description:
        "Pick one low-pressure event, Key LLC activity, club, or community connection to try this week.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(9),
      status: "due",
    },
    {
      id: "help-script-check",
      title: "Draft one help message",
      category: "communications",
      description:
        "Use a plain-language script for a professor, RA, SDC, supervisor, caregiver, or support person when stuck.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(16),
      status: "due",
    },
    {
      id: "social-decoder-review",
      title: "Decode one confusing message",
      category: "social",
      description:
        "Use the Social Decoder on a text or email that feels unclear before replying or ignoring it.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(8),
      status: "due",
    },
    {
      id: "request-atrc-meeting",
      title: "Request ATRC meeting",
      category: "school",
      description:
        "Follow up on the assistive technology referral before assignments get busy.",
      normalIntervalDays: 7,
      maxGapDays: 14,
      lastCompletedAt: daysAgo(8),
      status: "due",
    },
    {
      id: "send-accommodation-letters",
      title: "Send accommodation letters",
      category: "school",
      description:
        "Send letters through the SDC portal early so support is ready before it is needed.",
      normalIntervalDays: 120,
      maxGapDays: 150,
      lastCompletedAt: daysAgo(130),
      status: "due",
    },
    {
      id: "review-sdc-eligibilities",
      title: "Review SDC eligibilities",
      category: "school",
      description:
        "Check My Eligibilities in the SDC portal and make sure the support system reflects current approved accommodations.",
      normalIntervalDays: 120,
      maxGapDays: 150,
      lastCompletedAt: daysAgo(118),
      status: "ok",
    },
    {
      id: "schedule-sdc-exams",
      title: "Schedule accommodated exams",
      category: "school",
      description:
        "Use the SDC portal when accommodation letters and exam dates are available. Regular exams need 7 days notice; finals need 1 month.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(16),
      status: "due",
    },
    {
      id: "confirm-housing-accommodation",
      title: "Confirm housing accommodation",
      category: "housing",
      description:
        "Single room in a suite is approved. Confirm whether SDC or Housing needs annual follow-up before room selection or renewal.",
      normalIntervalDays: 180,
      maxGapDays: 365,
      lastCompletedAt: daysAgo(210),
      status: "due",
    },
    {
      id: "community-interest-alerts",
      title: "Set community interest alerts",
      category: "communications",
      description:
        "Watch CSU email, campus announcements, and cultural center updates for Black Student Union and Delta Sigma Theta opportunities.",
      normalIntervalDays: 14,
      maxGapDays: 30,
      lastCompletedAt: daysAgo(18),
      status: "due",
    },
  ];
}

function createInitialHistory(): HistoryEntry[] {
  return [
    {
      id: "initial-shower",
      taskId: "shower",
      taskTitle: "Shower",
      type: "done",
      createdAt: daysAgo(3),
    },
  ];
}

function addDays(isoDate: string, days: number) {
  return new Date(new Date(isoDate).getTime() + days * dayMs);
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getTaskSchedule(task: SupportTask) {
  const nextDueAt = addDays(task.lastCompletedAt, task.normalIntervalDays);
  const escalateAfterAt = addDays(task.lastCompletedAt, task.maxGapDays);
  const now = new Date();

  let status: TaskStatus = "ok";
  if (escalateAfterAt <= now) {
    status = "escalated";
  } else if (
    nextDueAt <= startOfToday() ||
    task.status === "snoozed" ||
    task.status === "needs_help"
  ) {
    status = task.status === "needs_help" ? "needs_help" : "due";
  }

  return { nextDueAt, escalateAfterAt, status };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(isoDate: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function formatCurrency(value: number | null, currencyCode: string | null) {
  if (value === null) return "Not available";

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: currencyCode ?? "USD",
  }).format(value);
}

function statusLabel(status: TaskStatus) {
  return {
    ok: "On track",
    due: "Ready",
    snoozed: "Snoozed",
    needs_help: "Needs help",
    escalated: "Backup check",
  }[status];
}

function historyLabel(type: ActionType) {
  return {
    done: "marked done",
    already_did_it: "already did it",
    snooze: "snoozed",
    need_help: "asked for help",
    created: "created",
  }[type];
}

function actionClasses(type: ActionType) {
  return {
    done: "bg-teal-700 hover:bg-teal-800",
    already_did_it: "bg-blue-700 hover:bg-blue-800",
    snooze: "bg-amber-700 hover:bg-amber-800",
    need_help: "bg-orange-900 hover:bg-orange-950",
    created: "bg-teal-700 hover:bg-teal-800",
  }[type];
}

function statusClasses(status: TaskStatus) {
  if (status === "escalated") return "bg-red-100 text-red-800";
  if (status === "due" || status === "needs_help" || status === "snoozed") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-blue-100 text-blue-800";
}

function normalizeTaskCategory(category: string): TaskCategory {
  if (category === "hygiene") return "health";
  if (
    category === "school" ||
    category === "communications" ||
    category === "financial" ||
    category === "housing" ||
    category === "food" ||
    category === "vehicle" ||
    category === "work" ||
    category === "medical" ||
    category === "emergency" ||
    category === "logistics" ||
    category === "calendar" ||
    category === "documents" ||
    category === "travel" ||
    category === "social" ||
    category === "admin" ||
    category === "health" ||
    category === "life"
  ) {
    return category;
  }

  return "health";
}

function categoryLabel(category: TaskCategory) {
  return {
    school: "School",
    communications: "Communications",
    financial: "Financial",
    housing: "Housing",
    food: "Food",
    vehicle: "Vehicle",
    work: "Work",
    medical: "Medical",
    emergency: "Emergency",
    logistics: "Logistics",
    calendar: "Calendar",
    documents: "Documents",
    travel: "Travel",
    social: "Social",
    admin: "Admin",
    health: "Health",
    life: "Life",
  }[category];
}

function taskFromRow(row: TaskRow): SupportTask {
  return {
    id: row.id,
    title: row.title,
    category: normalizeTaskCategory(row.category),
    description: row.description,
    normalIntervalDays: row.normal_interval_days,
    maxGapDays: row.max_gap_days,
    lastCompletedAt: row.last_completed_at,
    status: row.status,
  };
}

function taskToRow(task: SupportTask, userId: string): TaskRow {
  return {
    id: task.id,
    assigned_user_id: userId,
    created_by: userId,
    title: task.title,
    category: normalizeTaskCategory(task.category),
    description: task.description,
    normal_interval_days: task.normalIntervalDays,
    max_gap_days: task.maxGapDays,
    last_completed_at: task.lastCompletedAt,
    status: task.status,
    updated_at: new Date().toISOString(),
  };
}

function historyFromRow(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    taskId: row.task_id,
    taskTitle: row.task_title,
    type: row.action_type,
    createdAt: row.created_at,
  };
}

function historyToRow(entry: HistoryEntry, userId: string): HistoryRow {
  return {
    id: entry.id,
    user_id: userId,
    task_id: entry.taskId,
    task_title: entry.taskTitle,
    action_type: entry.type,
    created_at: entry.createdAt,
  };
}

function assignmentFromRow(row: SchoolAssignmentRow): SchoolAssignment {
  return {
    id: row.id,
    courseName: row.course_name,
    title: row.title,
    dueAt: row.due_at,
    url: row.url,
    pointsPossible: row.points_possible,
    workflowState: row.workflow_state,
  };
}

function emailDraftFromRow(row: EmailDraftRow): EmailDraft {
  return {
    id: row.id,
    source: row.source,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    body: row.body,
    status: row.status,
    createdByAgent: row.created_by_agent,
    updatedAt: row.updated_at,
  };
}

function housingDocumentFromRow(row: HousingDocumentRow): HousingDocument {
  return {
    id: row.id,
    title: row.title,
    documentType: row.document_type,
    status: row.status,
    storagePath: row.storage_path,
    fileUrl: row.file_url,
    importantDate: row.important_date,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

function financialAccountFromRow(row: FinancialAccountRow): FinancialAccount {
  return {
    plaidAccountId: row.plaid_account_id,
    name: row.name,
    officialName: row.official_name,
    mask: row.mask,
    accountType: row.account_type,
    accountSubtype: row.account_subtype,
    availableBalance: row.available_balance,
    currentBalance: row.current_balance,
    isoCurrencyCode: row.iso_currency_code,
    updatedAt: row.updated_at,
  };
}

function schoolYearExpiration() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  date.setHours(23, 59, 59, 999);
  return date.toISOString().slice(0, 10);
}

export default function Home() {
  const [tasks, setTasks] = useState(createStarterTasks);
  const [history, setHistory] = useState(createInitialHistory);
  const [assignments, setAssignments] = useState<SchoolAssignment[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [housingDocuments, setHousingDocuments] = useState<HousingDocument[]>([]);
  const [financialAccounts, setFinancialAccounts] = useState<FinancialAccount[]>([]);
  const [financialInstitutionName, setFinancialInstitutionName] = useState<string | null>(null);
  const [financialLastSyncedAt, setFinancialLastSyncedAt] = useState<string | null>(null);
  const [plaidLinkToken, setPlaidLinkToken] = useState<string | null>(null);
  const shouldOpenPlaidRef = useRef(false);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("loading");
  const [syncMessage, setSyncMessage] = useState("Checking your saved setup...");
  const [passkeyStatus, setPasskeyStatus] = useState(
    "This MacBook can become the primary access device after one secure email sign-in.",
  );
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);
  const [canvasBaseUrl, setCanvasBaseUrl] = useState(defaultCanvasBaseUrl);
  const [canvasAccessToken, setCanvasAccessToken] = useState("");
  const [canvasTokenExpiresAt, setCanvasTokenExpiresAt] = useState(schoolYearExpiration);
  const [canvasConnection, setCanvasConnection] = useState<CanvasConnection | null>(null);
  const [canvasMessage, setCanvasMessage] = useState(
    "Canvas is ready when you are. Save it once, then pull assignments without doing the setup again.",
  );
  const [isCanvasImporting, setIsCanvasImporting] = useState(false);
  const [isCanvasConnectionSaving, setIsCanvasConnectionSaving] = useState(false);
  const [emailDraftMessage, setEmailDraftMessage] = useState(
    "Once email is connected, drafts and social read-throughs will stay here for review.",
  );
  const [isEmailDrafting, setIsEmailDrafting] = useState(false);
  const [housingMessage, setHousingMessage] = useState(
    "Housing docs can stay tucked away safely, with reminders for the dates that matter.",
  );
  const [financialMessage, setFinancialMessage] = useState(
    "Connect Canvas Credit Union when you want a quick, read-only money check.",
  );
  const [isPlaidLoading, setIsPlaidLoading] = useState(false);

  const userId = session?.user.id;

  useEffect(() => {
    if (isSupabaseConfigured) return;

    const storedState = window.localStorage.getItem(storageKey);
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState) as {
          tasks?: SupportTask[];
          history?: HistoryEntry[];
        };

        window.queueMicrotask(() => {
          if (Array.isArray(parsedState.tasks)) {
            setTasks(
              parsedState.tasks.map((task: SupportTask) => ({
                ...task,
                category: normalizeTaskCategory(task.category),
              })),
            );
          }
          if (Array.isArray(parsedState.history)) setHistory(parsedState.history);
        });
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    window.queueMicrotask(() => {
      setSyncStatus("local");
      setSyncMessage("Saved in this browser. Supabase is not configured yet.");
    });
  }, []);

  useEffect(() => {
    if (isSupabaseConfigured || syncStatus !== "local") return;

    window.localStorage.setItem(storageKey, JSON.stringify({ tasks, history }));
  }, [history, syncStatus, tasks]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let ignore = false;

    async function loadAuth() {
      const {
        data: { session: currentSession },
      } = await supabase!.auth.getSession();

      if (!ignore) {
        setSession(currentSession);
        setAuthReady(true);
      }
    }

    loadAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !authReady || !userId) return;

    let ignore = false;
    const activeUserId = userId;

    async function loadUserData() {
      setSyncStatus("loading");
      setSyncMessage("Loading your dashboard...");
      window.localStorage.removeItem(storageKey);

      const { error: profileError } = await supabase!.from("profiles").upsert({
        id: activeUserId,
        email: session?.user.email ?? null,
        display_name: session?.user.email?.split("@")[0] ?? "Josephine",
      });

      if (profileError && !ignore) {
        setSyncStatus("error");
        setSyncMessage("Sign-in works. The database setup still needs one update.");
        return;
      }

      const { data: savedTasks, error: tasksError } = await supabase!
        .from("support_tasks")
        .select("*")
        .order("title");

      if (ignore) return;

      if (tasksError) {
        setSyncStatus("error");
        setSyncMessage("Sign-in works, but support_tasks needs the secure schema.");
        return;
      }

      const { data: savedHistory, error: historyError } = await supabase!
        .from("support_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);

      if (ignore) return;

      if (historyError) {
        setSyncStatus("error");
        setSyncMessage("Sign-in works, but support_history needs the secure schema.");
        return;
      }

      if ((savedTasks ?? []).length > 0) {
        setTasks(savedTasks.map(taskFromRow));
      } else {
        const starterTasks = createStarterTasks();
        setTasks(starterTasks);
        await supabase!
          .from("support_tasks")
          .upsert(starterTasks.map((task) => taskToRow(task, activeUserId)));
      }

      if ((savedHistory ?? []).length > 0) {
        setHistory(savedHistory.map(historyFromRow));
      } else {
        const starterHistory = createInitialHistory();
        setHistory(starterHistory);
        await supabase!
          .from("support_history")
          .upsert(
            starterHistory.map((entry) => historyToRow(entry, activeUserId)),
          );
      }

      const { data: savedAssignments, error: assignmentsError } = await supabase!
        .from("school_assignments")
        .select("id,course_name,title,due_at,url,points_possible,workflow_state")
        .order("due_at", { ascending: true, nullsFirst: false })
        .limit(8);

      if (!ignore && assignmentsError) {
        setCanvasMessage("Canvas table needs the latest Supabase schema before assignments can load.");
      }

      if (!ignore && savedAssignments) {
        setAssignments(savedAssignments.map((row) => assignmentFromRow(row as SchoolAssignmentRow)));
      }

      const { data: savedEmailDrafts, error: emailDraftsError } =
        await supabase!
          .from("school_email_drafts")
          .select("id,source,recipient_email,subject,body,status,created_by_agent,updated_at")
          .order("updated_at", { ascending: false })
          .limit(5);

      if (!ignore && emailDraftsError) {
        setEmailDraftMessage("Email drafting needs the latest Supabase schema.");
      }

      if (!ignore && savedEmailDrafts) {
        setEmailDrafts(savedEmailDrafts.map((row) => emailDraftFromRow(row as EmailDraftRow)));
      }

      const { data: savedHousingDocuments, error: housingDocumentsError } =
        await supabase!
          .from("housing_documents")
          .select("id,title,document_type,status,storage_path,file_url,important_date,notes,updated_at")
          .order("important_date", { ascending: true, nullsFirst: false })
          .limit(10);

      if (!ignore && housingDocumentsError) {
        setHousingMessage("Housing documents need the latest Supabase schema.");
      }

      if (!ignore && savedHousingDocuments) {
        setHousingDocuments(
          savedHousingDocuments.map((row) =>
            housingDocumentFromRow(row as HousingDocumentRow),
          ),
        );
      }

      const { data: savedFinancialConnection, error: financialConnectionError } =
        await supabase!
          .from("financial_connections")
          .select("institution_name,last_synced_at")
          .eq("user_id", activeUserId)
          .eq("provider", "plaid")
          .maybeSingle();

      if (!ignore && financialConnectionError) {
        setFinancialMessage("Financial connection needs the latest Supabase schema.");
      }

      if (!ignore && !financialConnectionError && savedFinancialConnection) {
        setFinancialInstitutionName(
          (savedFinancialConnection as { institution_name: string | null })
            .institution_name,
        );
        setFinancialLastSyncedAt(
          (savedFinancialConnection as { last_synced_at: string | null })
            .last_synced_at,
        );
      }

      const { data: savedFinancialAccounts, error: financialAccountsError } =
        await supabase!
          .from("financial_accounts")
          .select("plaid_account_id,name,official_name,mask,account_type,account_subtype,available_balance,current_balance,iso_currency_code,updated_at")
          .order("updated_at", { ascending: false });

      if (!ignore && financialAccountsError) {
        setFinancialMessage("Financial accounts need the latest Supabase schema.");
      }

      if (!ignore && savedFinancialAccounts) {
        setFinancialAccounts(
          savedFinancialAccounts.map((row) =>
            financialAccountFromRow(row as FinancialAccountRow),
          ),
        );
      }

      const { data: savedCanvasConnection, error: canvasConnectionError } =
        await supabase!
          .from("canvas_connections")
          .select("canvas_base_url,expires_at,last_imported_at,updated_at")
          .eq("user_id", activeUserId)
          .maybeSingle();

      if (!ignore && canvasConnectionError) {
        setCanvasMessage("Canvas saved connection needs the latest Supabase schema.");
      }

      if (!ignore && !canvasConnectionError) {
        const connection = savedCanvasConnection as CanvasConnectionStatusRow | null;
        setCanvasConnection({
          connected: Boolean(connection),
          canvasBaseUrl: connection?.canvas_base_url ?? null,
          expiresAt: connection?.expires_at ?? null,
          lastImportedAt: connection?.last_imported_at ?? null,
          updatedAt: connection?.updated_at ?? null,
        });
        if (connection?.canvas_base_url) setCanvasBaseUrl(connection.canvas_base_url);
        if (connection?.expires_at) setCanvasTokenExpiresAt(connection.expires_at.slice(0, 10));
      }

      setSyncStatus("supabase");
      setSyncMessage("Saved.");
    }

    loadUserData();

    return () => {
      ignore = true;
    };
  }, [authReady, session?.user.email, userId]);

  const getCurrentAppAccessToken = useCallback(async () => {
    if (!supabase) return null;

    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    return currentSession?.access_token ?? null;
  }, []);

  const applyPlaidPayload = useCallback((payload: PlaidConnectionPayload) => {
    setFinancialInstitutionName(payload.institutionName);
    setFinancialLastSyncedAt(payload.lastSyncedAt);
    setFinancialAccounts(payload.accounts.map(financialAccountFromRow));
  }, []);

  const refreshFinancialBalances = useCallback(async () => {
    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setFinancialMessage("Sign in before refreshing credit union balances.");
      return;
    }

    setIsPlaidLoading(true);
    setFinancialMessage("Refreshing credit union balances...");

    const response = await fetch("/api/financial/plaid/balances", {
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });

    const payload = (await response.json()) as PlaidConnectionPayload;
    setIsPlaidLoading(false);

    if (!response.ok) {
      setFinancialMessage(payload.error ?? "Credit union balances could not be refreshed.");
      return;
    }

    applyPlaidPayload(payload);
    setFinancialMessage(
      payload.connected
        ? "Credit union balances refreshed. Amounts are read-only."
        : "Connect Canvas Credit Union with Plaid to show masked accounts and balances.",
    );
  }, [applyPlaidPayload, getCurrentAppAccessToken]);

  const exchangePlaidPublicToken = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      const appAccessToken = await getCurrentAppAccessToken();
      if (!appAccessToken) {
        setFinancialMessage("App session expired. Sign in again before connecting Plaid.");
        return;
      }

      setIsPlaidLoading(true);
      setFinancialMessage("Saving encrypted Plaid connection...");

      const response = await fetch("/api/financial/plaid/exchange", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          publicToken,
          metadata,
        }),
      });

      const payload = (await response.json()) as PlaidConnectionPayload;
      setIsPlaidLoading(false);

      if (!response.ok) {
        setFinancialMessage(payload.error ?? "Plaid connection could not be saved.");
        return;
      }

      applyPlaidPayload(payload);
      setFinancialMessage("Canvas Credit Union connected. Balances are read-only.");
    },
    [applyPlaidPayload, getCurrentAppAccessToken],
  );

  const plaidConfig: PlaidLinkOptions = {
    token: plaidLinkToken,
    onSuccess: (publicToken, metadata) => {
      void exchangePlaidPublicToken(publicToken, metadata);
    },
    onExit: (error) => {
      if (error) {
        setFinancialMessage(error.display_message || error.error_message);
      }
    },
  };

  const { open: openPlaid, ready: isPlaidReady } = usePlaidLink(plaidConfig);

  useEffect(() => {
    if (!shouldOpenPlaidRef.current || !plaidLinkToken || !isPlaidReady) return;

    openPlaid();
    shouldOpenPlaidRef.current = false;
  }, [isPlaidReady, openPlaid, plaidLinkToken]);

  async function startPlaidConnection() {
    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setFinancialMessage("Sign in before connecting Canvas Credit Union.");
      return;
    }

    setIsPlaidLoading(true);
    setFinancialMessage("Starting secure Plaid connection...");

    const response = await fetch("/api/financial/plaid/link-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });

    const payload = (await response.json()) as {
      linkToken?: string;
      error?: string;
    };

    setIsPlaidLoading(false);

    if (!response.ok || !payload.linkToken) {
      setFinancialMessage(payload.error ?? "Plaid link could not start.");
      return;
    }

    setPlaidLinkToken(payload.linkToken);
    shouldOpenPlaidRef.current = true;
  }

  async function disconnectPlaidConnection() {
    if (!window.confirm("Remove the saved Canvas Credit Union connection from this app?")) {
      return;
    }

    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setFinancialMessage("Sign in before removing the credit union connection.");
      return;
    }

    setIsPlaidLoading(true);
    setFinancialMessage("Removing credit union connection...");

    const response = await fetch("/api/financial/plaid/balances", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });

    const payload = (await response.json()) as { error?: string };
    setIsPlaidLoading(false);

    if (!response.ok) {
      setFinancialMessage(payload.error ?? "Credit union connection could not be removed.");
      return;
    }

    setFinancialAccounts([]);
    setFinancialInstitutionName(null);
    setFinancialLastSyncedAt(null);
    setFinancialMessage("Credit union connection removed.");
  }

  const loadCanvasConnection = useCallback(async () => {
    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) return;

    const response = await fetch("/api/canvas/connection", {
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });

    const payload = (await response.json()) as CanvasConnection & {
      error?: string;
    };

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas connection status could not be loaded.");
      return;
    }

    setCanvasConnection(payload);
    if (payload.canvasBaseUrl) setCanvasBaseUrl(payload.canvasBaseUrl);
    if (payload.expiresAt) setCanvasTokenExpiresAt(payload.expiresAt.slice(0, 10));
  }, [getCurrentAppAccessToken]);

  async function refreshAssignments() {
    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    const { data, error } = await supabase
      .from("school_assignments")
      .select("id,course_name,title,due_at,url,points_possible,workflow_state")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8);

    if (error) {
      setCanvasMessage("Imported, but assignments could not be refreshed from Supabase.");
      return;
    }

    setAssignments((data ?? []).map((row) => assignmentFromRow(row as SchoolAssignmentRow)));
  }

  async function refreshEmailDrafts() {
    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    const { data, error } = await supabase
      .from("school_email_drafts")
      .select("id,source,recipient_email,subject,body,status,created_by_agent,updated_at")
      .order("updated_at", { ascending: false })
      .limit(5);

    if (error) {
      setEmailDraftMessage("Email drafts could not be refreshed from Supabase.");
      return;
    }

    setEmailDrafts((data ?? []).map((row) => emailDraftFromRow(row as EmailDraftRow)));
  }

  async function generateEmailDrafts() {
    if (!supabase || !userId) {
      setEmailDraftMessage("Sign in before generating email drafts.");
      return;
    }

    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setEmailDraftMessage("App session expired. Sign in again before drafting email.");
      return;
    }

    setIsEmailDrafting(true);
    setEmailDraftMessage("Drafting replies from triaged communications...");

    const response = await fetch("/api/email/drafts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit: 5 }),
    });

    const payload = (await response.json()) as {
      drafted?: number;
      drafts?: EmailDraftRow[];
      message?: string;
      error?: string;
    };

    setIsEmailDrafting(false);

    if (!response.ok) {
      setEmailDraftMessage(payload.error ?? "Email drafts could not be generated.");
      return;
    }

    if (payload.drafts) {
      setEmailDrafts(payload.drafts.map(emailDraftFromRow));
    } else {
      await refreshEmailDrafts();
    }

    setEmailDraftMessage(
      payload.message ??
        `Prepared ${payload.drafted ?? 0} email draft${payload.drafted === 1 ? "" : "s"} for review. Nothing was sent.`,
    );
  }

  async function saveTaskToSupabase(task: SupportTask) {
    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    setSyncStatus("syncing");
    const { error } = await supabase
      .from("support_tasks")
      .upsert(taskToRow(task, userId));
    if (error) {
      setSyncStatus("error");
      setSyncMessage("Saved here. Cloud sync needs a quick look.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved.");
  }

  async function saveHistoryToSupabase(entry: HistoryEntry) {
    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    setSyncStatus("syncing");
    const { error } = await supabase
      .from("support_history")
      .insert(historyToRow(entry, userId));
    if (error) {
      setSyncStatus("error");
      setSyncMessage("Saved here. Cloud sync needs a quick look.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved.");
  }

  const summary = useMemo(() => {
    return tasks.reduce(
      (counts, task) => {
        const { status } = getTaskSchedule(task);
        if (status === "due" || status === "needs_help") counts.ready += 1;
        if (status === "escalated") counts.failsafe += 1;
        return counts;
      },
      { ready: 0, failsafe: 0 },
    );
  }, [tasks]);

  function recordAction(taskId: string, type: ActionType) {
    const now = new Date().toISOString();
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const updatedTask =
      type === "done" || type === "already_did_it"
        ? { ...task, lastCompletedAt: now, status: "ok" as TaskStatus }
        : type === "snooze"
          ? { ...task, status: "snoozed" as TaskStatus }
          : type === "need_help"
            ? { ...task, status: "needs_help" as TaskStatus }
            : task;

    setTasks((currentTasks) =>
      currentTasks.map((item) => (item.id === taskId ? updatedTask : item)),
    );

    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      taskId,
      taskTitle: task.title,
      type,
      createdAt: now,
    };

    setHistory((currentHistory) => [historyEntry, ...currentHistory]);
    void saveTaskToSupabase(updatedTask);
    void saveHistoryToSupabase(historyEntry);
  }

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    if (!title) return;

    const normalIntervalDays = Number(form.get("normalDays"));
    const maxGapDays = Math.max(Number(form.get("maxDays")), normalIntervalDays);
    const now = new Date().toISOString();

    const task: SupportTask = {
      id: crypto.randomUUID(),
      title,
      category: String(form.get("category")) as TaskCategory,
      description: `Comes back ${normalIntervalDays} day(s) after it is done. Backup check at ${maxGapDays} day(s).`,
      normalIntervalDays,
      maxGapDays,
      lastCompletedAt: now,
      status: "ok",
    };

    const historyEntry: HistoryEntry = {
      id: crypto.randomUUID(),
      taskId: task.id,
      taskTitle: title,
      type: "created",
      createdAt: now,
    };

    setTasks((currentTasks) => [...currentTasks, task]);
    setHistory((currentHistory) => [historyEntry, ...currentHistory]);
    void saveTaskToSupabase(task);
    void saveHistoryToSupabase(historyEntry);
    event.currentTarget.reset();
  }

  async function resetDemoData() {
    const starterTasks = createStarterTasks();
    const starterHistory = createInitialHistory();

    setTasks(starterTasks);
    setHistory(starterHistory);

    if (!supabase || !userId || syncStatus === "local" || syncStatus === "error") {
      return;
    }

    setSyncStatus("syncing");
    const { error: deleteHistoryError } = await supabase
      .from("support_history")
      .delete()
      .eq("user_id", userId);
    const { error: deleteTasksError } = await supabase
      .from("support_tasks")
      .delete()
      .eq("assigned_user_id", userId);
    const { error: taskError } = await supabase
      .from("support_tasks")
      .upsert(starterTasks.map((task) => taskToRow(task, userId)));
    const { error: historyError } = await supabase
      .from("support_history")
      .upsert(starterHistory.map((entry) => historyToRow(entry, userId)));

    if (deleteHistoryError || deleteTasksError || taskError || historyError) {
      setSyncStatus("error");
      setSyncMessage("Reset here. Cloud sync needs a quick look.");
      return;
    }

    setSyncStatus("supabase");
    setSyncMessage("Saved.");
  }

  async function setUpDevicePasskey() {
    setIsPasskeySubmitting(true);
    setPasskeyStatus("Starting Touch ID passkey setup...");

    const { error } = await registerDevicePasskey(devicePasskeyName);

    setIsPasskeySubmitting(false);
    setPasskeyStatus(
      error?.message
        ? error.message
        : "Touch ID passkey is ready on this MacBook. Keep the secure email link as backup.",
    );
  }

  async function importCanvasAssignments(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase || !userId) {
      setCanvasMessage("Sign in before importing Canvas assignments.");
      return;
    }

    const trimmedBaseUrl = canvasBaseUrl.trim();
    const trimmedToken = canvasAccessToken.trim();
    const hasSavedConnection = Boolean(canvasConnection?.connected);

    if (!trimmedBaseUrl || (!trimmedToken && !hasSavedConnection)) {
      setCanvasMessage("Save a Canvas token once, or enter one for this import.");
      return;
    }

    setIsCanvasImporting(true);
    setCanvasMessage(
      trimmedToken
        ? "Saving Canvas connection and importing assignments..."
        : "Importing upcoming Canvas assignments with the saved connection...",
    );

    const appAccessToken = await getCurrentAppAccessToken();

    if (!appAccessToken) {
      setIsCanvasImporting(false);
      setCanvasMessage("App session expired. Sign in again before importing Canvas.");
      return;
    }

    if (trimmedToken) {
      const saveResponse = await fetch("/api/canvas/connection", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${appAccessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canvasBaseUrl: trimmedBaseUrl,
          canvasAccessToken: trimmedToken,
          expiresAt: canvasTokenExpiresAt,
        }),
      });

      const savePayload = (await saveResponse.json()) as CanvasConnection & {
        error?: string;
      };

      if (!saveResponse.ok) {
        setIsCanvasImporting(false);
        setCanvasMessage(savePayload.error ?? "Canvas connection could not be saved.");
        return;
      }

      setCanvasConnection(savePayload);
      setCanvasAccessToken("");
    }

    const savedUntil = trimmedToken
      ? canvasTokenExpiresAt
      : (canvasConnection?.expiresAt?.slice(0, 10) ?? canvasTokenExpiresAt);

    const response = await fetch("/api/canvas/import", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        canvasBaseUrl: trimmedBaseUrl,
      }),
    });

    const payload = (await response.json()) as {
      imported?: number;
      coursesChecked?: number;
      usedSavedConnection?: boolean;
      error?: string;
    };

    setIsCanvasImporting(false);

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas import failed.");
      return;
    }

    setCanvasAccessToken("");
    setCanvasMessage(
      `Imported ${payload.imported ?? 0} assignments from ${payload.coursesChecked ?? 0} Canvas courses. Canvas connection is saved until ${formatDate(new Date(savedUntil))}.`,
    );
    await loadCanvasConnection();
    await refreshAssignments();
  }

  async function saveCanvasConnection() {
    if (!supabase || !userId) {
      setCanvasMessage("Sign in before saving Canvas.");
      return;
    }

    const trimmedBaseUrl = canvasBaseUrl.trim();
    const trimmedToken = canvasAccessToken.trim();

    if (!trimmedBaseUrl || !trimmedToken) {
      setCanvasMessage("Enter the Canvas URL and token before saving.");
      return;
    }

    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setCanvasMessage("App session expired. Sign in again before saving Canvas.");
      return;
    }

    setIsCanvasConnectionSaving(true);
    setCanvasMessage("Saving encrypted Canvas connection...");

    const response = await fetch("/api/canvas/connection", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        canvasBaseUrl: trimmedBaseUrl,
        canvasAccessToken: trimmedToken,
        expiresAt: canvasTokenExpiresAt,
      }),
    });

    const payload = (await response.json()) as CanvasConnection & {
      error?: string;
    };

    setIsCanvasConnectionSaving(false);

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas connection could not be saved.");
      return;
    }

    setCanvasConnection(payload);
    setCanvasAccessToken("");
    setCanvasMessage(
      `Canvas connection saved until ${formatDate(new Date(payload.expiresAt ?? canvasTokenExpiresAt))}.`,
    );
  }

  async function revokeCanvasConnection() {
    if (!window.confirm("Remove the saved Canvas connection from this app?")) {
      return;
    }

    const appAccessToken = await getCurrentAppAccessToken();
    if (!appAccessToken) {
      setCanvasMessage("App session expired. Sign in again before removing Canvas.");
      return;
    }

    const response = await fetch("/api/canvas/connection", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${appAccessToken}`,
      },
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setCanvasMessage(payload.error ?? "Canvas connection could not be removed.");
      return;
    }

    setCanvasConnection({
      connected: false,
      canvasBaseUrl: null,
      expiresAt: null,
      lastImportedAt: null,
      updatedAt: null,
    });
    setCanvasMessage("Saved Canvas connection removed.");
  }

  if (isSupabaseConfigured && !authReady) {
    return <LoadingScreen />;
  }

  if (isSupabaseConfigured && !session) {
    return <AuthGate />;
  }

  return (
    <main className="min-h-screen bg-stone-100 text-stone-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="grid gap-4 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-teal-800">
              My Campus Hub
            </p>
            <h1 className="text-5xl font-black leading-none sm:text-7xl">
              Josephine
            </h1>
          </div>
          <div className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm sm:min-w-64 sm:text-right">
            <span className="block text-sm text-stone-600">
              {new Intl.DateTimeFormat(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              }).format(new Date())}
            </span>
            <strong className="mt-1 block text-teal-800">
              {summary.ready + summary.failsafe} to review
            </strong>
            {session ? (
              <div className="mt-3 grid gap-3 border-t border-stone-200 pt-3">
                <div className="text-sm text-stone-600">
                  <strong className="block text-stone-950">
                    This MacBook
                  </strong>
                  <span>{passkeyStatus}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    className="min-h-9 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                    type="button"
                    onClick={setUpDevicePasskey}
                    disabled={isPasskeySubmitting}
                  >
                    {isPasskeySubmitting ? "Starting" : "Set Up Touch ID"}
                  </button>
                  <button
                    className="min-h-9 rounded-md border border-stone-300 px-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
                    type="button"
                    onClick={() => supabase?.auth.signOut()}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <section
          className="grid overflow-hidden rounded-lg border border-stone-300 bg-white sm:grid-cols-3"
          aria-label="Task summary"
        >
          <SummaryMetric value={summary.ready} label="Ready today" />
          <SummaryMetric
            value={summary.failsafe}
            label="Backup checks"
            danger
          />
          <SummaryMetric value={history.length} label="Done log" />
        </section>

        <section className="rounded-lg border border-stone-300 bg-white px-4 py-3 text-sm text-stone-700">
          <span className="font-semibold text-stone-950">
            {syncStatus === "supabase"
              ? "Private mode"
              : syncStatus === "syncing"
                ? "Syncing"
                : syncStatus === "loading"
                  ? "Loading"
                  : syncStatus === "error"
                    ? "Needs setup"
                    : "Local mode"}
          </span>
          <span className="ml-2">{syncMessage}</span>
        </section>

        <section className="rounded-lg border border-stone-300 bg-white p-3">
          <form
            className="grid gap-2 lg:grid-cols-[1fr_150px_100px_100px_80px]"
            onSubmit={addTask}
          >
            <input
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="title"
              placeholder="Add something to remember"
              required
            />
            <select
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="category"
              aria-label="Task category"
              defaultValue="health"
            >
              <option value="health">Health</option>
              <option value="school">School</option>
              <option value="communications">Communications</option>
              <option value="financial">Financial</option>
              <option value="housing">Housing</option>
              <option value="food">Food</option>
              <option value="vehicle">Vehicle</option>
              <option value="work">Work</option>
              <option value="medical">Medical</option>
              <option value="emergency">Emergency</option>
              <option value="logistics">Logistics</option>
              <option value="calendar">Calendar</option>
              <option value="documents">Documents</option>
              <option value="travel">Travel</option>
              <option value="social">Social</option>
              <option value="admin">Admin</option>
              <option value="life">Life</option>
            </select>
            <input
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="normalDays"
              type="number"
              min="1"
              defaultValue="1"
              aria-label="Reminder interval in days"
            />
            <input
              className="min-h-10 rounded-md border border-stone-300 px-3"
              name="maxDays"
              type="number"
              min="1"
              defaultValue="3"
              aria-label="Backup check interval in days"
            />
            <button
              className="min-h-10 rounded-md bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800"
              type="submit"
            >
              Add
            </button>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Today&apos;s List</h2>
              <button
                className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-teal-800 hover:bg-stone-200"
                type="button"
                onClick={resetDemoData}
              >
                Reset starter list
              </button>
            </div>

            <div className="grid gap-3">
              {tasks.map((task) => {
                const schedule = getTaskSchedule(task);

                return (
                  <article
                    className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm"
                    key={task.id}
                  >
                    <div className="grid gap-3 sm:flex sm:items-start sm:justify-between">
                      <div>
                        <span className="inline-flex min-h-6 items-center rounded-full bg-teal-50 px-3 text-xs font-bold capitalize text-teal-800">
                          {categoryLabel(task.category)}
                        </span>
                        <h3 className="mt-3 text-2xl font-bold">{task.title}</h3>
                        <p className="mt-1 text-stone-600">
                          {task.description}
                        </p>
                      </div>
                      <span
                        className={`inline-flex min-h-6 w-max items-center rounded-full px-3 text-xs font-bold ${statusClasses(schedule.status)}`}
                      >
                        {statusLabel(schedule.status)}
                      </span>
                    </div>

                    <p className="mt-4 border-t border-stone-200 pt-4 text-sm text-stone-600">
                      Comes back {formatDate(schedule.nextDueAt)} · backup check{" "}
                      {formatDate(schedule.escalateAfterAt)}
                    </p>

                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {(["done", "already_did_it", "snooze", "need_help"] as ActionType[]).map(
                        (action) => (
                          <button
                            className={`min-h-10 rounded-md px-3 text-sm font-semibold text-white ${actionClasses(action)}`}
                            key={action}
                            type="button"
                            onClick={() => recordAction(task.id, action)}
                          >
                            {action === "already_did_it"
                              ? "Already Did It"
                              : action === "need_help"
                                ? "Need Help"
                                : action === "snooze"
                                  ? "Snooze"
                                  : "Done"}
                          </button>
                        ),
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="grid content-start gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <h2 className="text-lg font-bold">Life Stuff</h2>
              <p className="mt-1 text-sm text-stone-600">
                School, food, money, friends, documents, safety, Viper, and the
                things that make college easier to keep track of.
              </p>
            </div>
            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Messages</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Sort email, draft replies, and decode confusing tone before
                    anything gets sent.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  Review first
                </span>
              </div>
              <button
                className="mt-4 min-h-10 w-full rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                type="button"
                onClick={generateEmailDrafts}
                disabled={isEmailDrafting}
              >
                {isEmailDrafting ? "Drafting" : "Draft Replies"}
              </button>
              <SupportPageLink href="/support/messages" />
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <strong className="text-sm text-stone-950">
                  Stuff to watch for
                </strong>
                <p className="mt-1 text-xs text-stone-600">
                  Pull these out of the noise when they show up.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                  {communityInterestWatchlist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3">
                <strong className="text-sm text-teal-950">Social Decoder</strong>
                <p className="mt-1 text-xs text-teal-950">
                  Use this for emails or texts that feel confusing, loaded, or
                  hard to answer.
                </p>
                <div className="mt-3 grid gap-2">
                  {socialDecoderSources.map((source) => (
                    <article
                      className="rounded-md bg-white p-2 text-sm text-stone-700"
                      key={source.name}
                    >
                      <strong className="block text-stone-950">{source.name}</strong>
                      <span>{source.detail}</span>
                    </article>
                  ))}
                </div>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-teal-950">
                  {socialDecoderChecks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-sm text-stone-600">{emailDraftMessage}</p>
              {emailDrafts.length > 0 ? (
                <ol className="mt-4 grid gap-3">
                  {emailDrafts.map((draft) => (
                    <li
                      className="rounded-md border border-stone-200 bg-stone-50 p-3"
                      key={draft.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm">{draft.subject}</strong>
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                          {draft.status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="mt-1 block text-xs text-stone-500">
                        To {draft.recipientEmail ?? "sender"} ·{" "}
                        {draft.source === "google_gmail" ? "Gmail" : "CSU email"}
                      </span>
                      <p className="mt-3 whitespace-pre-line text-sm text-stone-700">
                        {draft.body}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : null}
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">School Help</h2>
              <p className="mt-2 text-sm text-stone-600">
                Match assignments with the right people and tools before a due
                date gets too close.
              </p>
              <SupportPageLink href="/support/school" />
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                <strong className="text-sm text-amber-950">
                  SDC testing deadlines
                </strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                  {testingCenterRules.slice(1, 4).map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 p-3">
                <strong className="text-sm text-teal-950">
                  Start-of-semester setup
                </strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-teal-950">
                  {accommodationReadinessSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
                  <a
                    className="text-teal-800 hover:text-teal-950"
                    href="https://disabilitycenter.colostate.edu/sdc-student-portal-information/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    SDC Portal Help
                  </a>
                  <a
                    className="text-teal-800 hover:text-teal-950"
                    href="https://disabilitycenter.colostate.edu/accommodations-handbook/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Accommodation Handbook
                  </a>
                  <a
                    className="text-teal-800 hover:text-teal-950"
                    href="https://disabilitycenter.colostate.edu/policies-and-procedures/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Policies
                  </a>
                </div>
              </div>
              <div className="mt-4 grid gap-3">
                {academicSupportResources.map((resource) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={resource.shortName}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">{resource.shortName}</strong>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                        {resource.name}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">{resource.useFor}</p>
                    <p className="mt-1 text-xs text-stone-500">{resource.timing}</p>
                    <p className="mt-1 text-xs text-stone-500">{resource.contact}</p>
                    {resource.details ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-stone-600">
                        {resource.details.map((detail) => (
                          <li key={detail}>{detail}</li>
                        ))}
                      </ul>
                    ) : null}
                    {resource.href ? (
                      <a
                        className="mt-2 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                        href={resource.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
              <p className="mt-3 text-xs text-stone-500">
                Private referral codes, student IDs, and accommodation files
                should stay in secure notes or private Drive storage.
              </p>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Health</h2>
              <p className="mt-2 text-sm text-stone-600">
                Appointments, insurance, refills, and the boring-but-important
                health stuff in one place.
              </p>
              <SupportPageLink href="/support/health" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                  href={healthPortalUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Health Portal
                </a>
                <a
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                  href={studentInsuranceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Insurance Info
                </a>
              </div>
              <div className="mt-4 grid gap-3">
                {medicalSupportPlan.map((item) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={item.name}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">{item.name}</strong>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                        {item.cadence}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">{item.detail}</p>
                  </article>
                ))}
              </div>
              <a
                className="mt-3 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                href={healthNetworkUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open CSU Health Network
              </a>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Help Now</h2>
              <p className="mt-2 text-sm text-stone-600">
                The numbers and next steps to use when something feels urgent,
                unsafe, or too big to handle alone.
              </p>
              <SupportPageLink href="/support/safety" />
              <div className="mt-4 grid gap-3">
                {emergencyPlanItems.map((item) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={item.name}
                  >
                    <strong className="block text-sm">{item.name}</strong>
                    <span className="mt-1 block text-xs font-bold text-red-800">
                      {item.contact}
                    </span>
                    <p className="mt-2 text-sm text-stone-700">{item.detail}</p>
                  </article>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <a
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                  href={csuPoliceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  CSU Police
                </a>
                <a
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                  href={safeWalkUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  SafeWalk
                </a>
                <a
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                  href={csuSafetyUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Safety
                </a>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Campus Basics</h2>
              <p className="mt-2 text-sm text-stone-600">
                RamCard, parking, buses, laundry, mail, and the everyday systems
                that are annoying when they disappear.
              </p>
              <SupportPageLink href="/support/campus" />
              <div className="mt-4 grid gap-3">
                {campusLogisticsItems.map((item) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={item.name}
                  >
                    <strong className="text-sm">{item.name}</strong>
                    <p className="mt-2 text-sm text-stone-700">{item.detail}</p>
                    {item.href ? (
                      <a
                        className="mt-2 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Semester Start</h2>
              <p className="mt-2 text-sm text-stone-600">
                A first-week checklist so the semester starts with fewer
                surprises.
              </p>
              <ol className="mt-4 grid gap-2 text-sm text-stone-700">
                {semesterLaunchItems.map((item) => (
                  <li className="rounded-md bg-stone-50 p-2" key={item}>
                    {item}
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Weekly Rhythm</h2>
              <p className="mt-2 text-sm text-stone-600">
                Class, meals, sleep, study time, work, appointments, and actual
                breathing room.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
                {calendarRoutineItems.map((item) => (
                  <span className="rounded-md bg-stone-50 p-2" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Docs & Packing</h2>
              <p className="mt-2 text-sm text-stone-600">
                Drive holds the files. This keeps the folders and reminders
                from becoming a mystery.
              </p>
              <SupportPageLink href="/support/docs" />
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <strong className="text-sm text-stone-950">
                  Important folders
                </strong>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
                  {importantDocumentFolders.map((folder) => (
                    <span className="rounded-md bg-white p-2" key={folder}>
                      {folder}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <strong className="text-sm text-stone-950">
                  Room inventory
                </strong>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
                  {packingInventoryItems.map((item) => (
                    <span className="rounded-md bg-white p-2" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Home & Viper Visits</h2>
              <p className="mt-2 text-sm text-stone-600">
                Trips home, holidays, and Viper time planned around due dates
                and recovery time.
              </p>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-stone-700">
                {travelSupportItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">People & Belonging</h2>
              <p className="mt-2 text-sm text-stone-600">
                Low-pressure ways to find her people without needing a perfect
                social-energy day.
              </p>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-stone-700">
                {socialBelongingItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Scripts & Helpers</h2>
              <p className="mt-2 text-sm text-stone-600">
                Drafts and planning helpers give her a starting point. Nothing
                speaks for her or sends itself.
              </p>
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <strong className="text-sm text-stone-950">Help scripts</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-stone-700">
                  {supportScriptIdeas.map((idea) => (
                    <li key={idea}>{idea}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                <strong className="text-sm text-amber-950">Helper roadmap</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                  {planningAgentIdeas.map((idea) => (
                    <li key={idea}>{idea}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Canvas</h2>
              <p className="mt-2 text-sm text-stone-600">
                Save Canvas once, then pull assignments without hunting through
                the portal every time.
              </p>
              <div className="mt-3 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">
                  {canvasConnection?.connected
                    ? "Canvas is connected"
                    : "Canvas is not connected yet"}
                </strong>
                {canvasConnection?.connected ? (
                  <span>
                    Expires{" "}
                    {canvasConnection.expiresAt
                      ? formatDate(new Date(canvasConnection.expiresAt))
                      : "later"}
                    {canvasConnection.lastImportedAt
                      ? ` · Last import ${formatDateTime(canvasConnection.lastImportedAt)}`
                      : ""}
                  </span>
                ) : (
                  <span>
                    Paste a Canvas token once, pick an expiration, then save or
                    import.
                  </span>
                )}
              </div>
              <form className="mt-4 grid gap-3" onSubmit={importCanvasAssignments}>
                <label className="grid gap-1 text-sm font-semibold text-stone-700">
                  Canvas URL
                  <input
                    className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
                    value={canvasBaseUrl}
                    onChange={(event) => setCanvasBaseUrl(event.target.value)}
                    inputMode="url"
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-stone-700">
                  Canvas API token {canvasConnection?.connected ? "(only to replace saved token)" : ""}
                  <input
                    className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
                    value={canvasAccessToken}
                    onChange={(event) => setCanvasAccessToken(event.target.value)}
                    type="password"
                    autoComplete="off"
                    placeholder={
                      canvasConnection?.connected
                        ? "Leave blank to use saved token"
                        : "Paste token to save"
                    }
                  />
                </label>
                <label className="grid gap-1 text-sm font-semibold text-stone-700">
                  Save until
                  <input
                    className="min-h-10 rounded-md border border-stone-300 px-3 font-normal"
                    value={canvasTokenExpiresAt}
                    onChange={(event) => setCanvasTokenExpiresAt(event.target.value)}
                    type="date"
                  />
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    className="min-h-10 rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
                    type="button"
                    onClick={saveCanvasConnection}
                    disabled={isCanvasConnectionSaving || !canvasAccessToken.trim()}
                  >
                    {isCanvasConnectionSaving ? "Saving" : "Save Canvas"}
                  </button>
                  <button
                    className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                    type="button"
                    onClick={revokeCanvasConnection}
                    disabled={!canvasConnection?.connected}
                  >
                    Remove
                  </button>
                </div>
                <button
                  className="min-h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  type="submit"
                  disabled={isCanvasImporting}
                >
                  {isCanvasImporting
                    ? "Importing"
                    : canvasConnection?.connected && !canvasAccessToken.trim()
                      ? "Import Assignments"
                      : "Save Canvas & Import"}
                </button>
              </form>
              <p className="mt-3 text-xs text-stone-500">
                Canvas QR login is still only for the mobile app. This connection
                uses a Canvas API token and should be revoked in Canvas if the
                token is ever pasted somewhere unsafe.
              </p>
              <p className="mt-3 text-sm text-stone-600">{canvasMessage}</p>

              <div className="mt-5 border-t border-stone-200 pt-4">
                <h3 className="text-sm font-bold uppercase text-stone-500">
                  Coming Up From Canvas
                </h3>
                {assignments.length > 0 ? (
                  <ol className="mt-3 grid gap-3">
                    {assignments.map((assignment) => (
                      <li
                        className="border-b border-stone-200 pb-3 last:border-0 last:pb-0"
                        key={assignment.id}
                      >
                        <strong className="block">{assignment.title}</strong>
                        <span className="block text-sm text-stone-600">
                          {assignment.courseName}
                        </span>
                        <span className="block text-sm text-stone-500">
                          {assignment.dueAt
                            ? `Due ${formatDateTime(assignment.dueAt)}`
                            : "No due date listed"}
                        </span>
                        {assignment.url ? (
                          <a
                            className="mt-1 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                            href={assignment.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Canvas
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-stone-600">
                    No assignments imported yet.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Viper Cam</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    A quick check-in on Viper when Colorado feels far away from
                    California.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  California
                </span>
              </div>
              <SupportPageLink href="/support/viper" />

              {viperCamUrl ? (
                <a
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                  href={viperCamUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Viper Cam
                </a>
              ) : (
                <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                  <strong className="block text-stone-950">
                    Camera link coming later
                  </strong>
                  <span>
                    After equipment is chosen, set `NEXT_PUBLIC_VIPER_CAM_URL`
                    to a private viewer link or app-safe stream URL.
                  </span>
                </div>
              )}

              <div className="mt-4 grid gap-3">
                {viperCamSetupOptions.map((option) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={option.name}
                  >
                    <strong className="text-sm">{option.name}</strong>
                    <p className="mt-2 text-sm text-stone-700">{option.detail}</p>
                  </article>
                ))}
              </div>

              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                <strong className="text-sm text-amber-950">
                  Privacy and placement
                </strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                  {viperCamSafetyNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Food</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Braiden first, backups ready, robot delivery when going out
                    is not happening.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  Braiden first
                </span>
              </div>
              <SupportPageLink href="/support/food" />

              <div className="mt-4 grid gap-3">
                {campusDiningLocations.map((location) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={location.name}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">{location.name}</strong>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                        {location.focus}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">{location.schedule}</p>
                    <p className="mt-1 text-xs text-stone-500">{location.note}</p>
                  </article>
                ))}
              </div>

              <a
                className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                href={diningHoursUrl}
                target="_blank"
                rel="noreferrer"
              >
                Check Today&apos;s Dining Hours
              </a>

              <div className="mt-5 border-t border-stone-200 pt-4">
                <h3 className="text-sm font-bold uppercase text-stone-500">
                  Robot Delivery
                </h3>
                <ol className="mt-3 grid gap-2 text-sm text-stone-700">
                  {robotDeliverySteps.map((step) => (
                    <li className="rounded-md bg-stone-50 p-2" key={step}>
                      {step}
                    </li>
                  ))}
                </ol>
                <a
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                  href={grubhubCampusUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Grubhub Campus
                </a>
              </div>

              <div className="mt-5 border-t border-stone-200 pt-4">
                <h3 className="text-sm font-bold uppercase text-stone-500">
                  Mini-fridge List
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
                  {miniFridgeShoppingList.map((item) => (
                    <span className="rounded-md bg-stone-50 p-2" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Money</h2>
              <p className="mt-2 text-sm text-stone-600">
                Quick balance check here. Transfers and bill pay still happen
                directly at the credit union.
              </p>
              <SupportPageLink href="/support/money" />
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">
                  {financialInstitutionName ?? "Canvas Credit Union"}
                </strong>
                <span>
                  {financialLastSyncedAt
                    ? `Last updated ${formatDateTime(financialLastSyncedAt)}`
                    : "Not connected yet"}
                </span>
              </div>
              {financialAccounts.length > 0 ? (
                <ol className="mt-4 grid gap-3">
                  {financialAccounts.map((account) => (
                    <li
                      className="rounded-md border border-stone-200 bg-stone-50 p-3"
                      key={account.plaidAccountId}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm">{account.name}</strong>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                          {account.accountSubtype ?? account.accountType}
                        </span>
                      </div>
                      <span className="mt-1 block text-xs text-stone-500">
                        {account.mask ? `•••• ${account.mask}` : "Masked account"}
                      </span>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <span>
                          <strong className="block text-stone-950">
                            {formatCurrency(account.availableBalance, account.isoCurrencyCode)}
                          </strong>
                          Available
                        </span>
                        <span>
                          <strong className="block text-stone-950">
                            {formatCurrency(account.currentBalance, account.isoCurrencyCode)}
                          </strong>
                          Current
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : null}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button
                  className="min-h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
                  type="button"
                  onClick={startPlaidConnection}
                  disabled={isPlaidLoading || (Boolean(plaidLinkToken) && !isPlaidReady)}
                >
                  {financialAccounts.length > 0 ? "Reconnect Plaid" : "Connect Plaid"}
                </button>
                <button
                  className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                  type="button"
                  onClick={refreshFinancialBalances}
                  disabled={isPlaidLoading || financialAccounts.length === 0}
                >
                  Refresh Balances
                </button>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {creditUnionUrl ? (
                  <a
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                    href={creditUnionUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Credit Union
                  </a>
                ) : (
                  <button
                    className="min-h-10 cursor-not-allowed rounded-md bg-stone-300 px-4 text-sm font-semibold text-stone-600"
                    type="button"
                    disabled
                  >
                    Credit Union Link Missing
                  </button>
                )}
                <button
                  className="min-h-10 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:text-stone-400"
                  type="button"
                  onClick={disconnectPlaidConnection}
                  disabled={isPlaidLoading || financialAccounts.length === 0}
                >
                  Remove Plaid
                </button>
              </div>
              <p className="mt-3 text-sm text-stone-600">{financialMessage}</p>
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">Weekly money reset</strong>
                <span>
                  Check balance, look for upcoming bills, and get backup before
                  moving money or changing payment settings.
                </span>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Vehicle</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Keep the Touareg campus-ready without having to remember
                    every maintenance detail.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  {vehicleProfile.role}
                </span>
              </div>
              <SupportPageLink href="/support/vehicle" />
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">{vehicleProfile.name}</strong>
                <span>{vehicleProfile.note}</span>
              </div>
              <div className="mt-4 grid gap-3">
                {vehicleMaintenancePlan.map((item) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={item.name}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">{item.name}</strong>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                        {item.cadence}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">{item.detail}</p>
                  </article>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                <strong className="text-sm text-amber-950">
                  Maintenance helper path
                </strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                  {vehicleAgentIdeas.map((idea) => (
                    <li key={idea}>{idea}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">Work</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    For future job searching, schedules, paychecks, and keeping
                    work from taking over school.
                  </p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                  Future job
                </span>
              </div>
              <SupportPageLink href="/support/work" />

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  className="inline-flex min-h-10 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                  href={handshakeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Handshake
                </a>
                <a
                  className="inline-flex min-h-10 items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50"
                  href={workdayStudentEmploymentUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Student Employment Info
                </a>
              </div>

              <div className="mt-4 grid gap-3">
                {workSupportPlan.map((item) => (
                  <article
                    className="rounded-md border border-stone-200 bg-stone-50 p-3"
                    key={item.name}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">{item.name}</strong>
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                        {item.cadence}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">{item.detail}</p>
                  </article>
                ))}
              </div>

              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <strong className="text-sm text-stone-950">
                  Google Drive work folder
                </strong>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
                  {workDocumentFolders.map((folder) => (
                    <span className="rounded-md bg-white p-2" key={folder}>
                      {folder}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                <strong className="text-sm text-amber-950">Work helper path</strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950">
                  {workAgentIdeas.map((idea) => (
                    <li key={idea}>{idea}</li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold">Housing</h2>
              <p className="mt-2 text-sm text-stone-600">
                Room info, move-in details, contracts, billing, maintenance, and
                renewal dates together.
              </p>
              <SupportPageLink href="/support/housing" />
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">
                <strong className="block text-stone-950">Housing files</strong>
                <span>
                  Store PDFs in private Drive or secure storage. This app keeps
                  the reminders and links, not public copies.
                </span>
              </div>
              <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 p-3">
                <strong className="text-sm text-teal-950">
                  Housing accommodation
                </strong>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-teal-950">
                  {housingAccommodationNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
              <p className="mt-3 text-sm text-stone-600">{housingMessage}</p>
              {housingDocuments.length > 0 ? (
                <ol className="mt-4 grid gap-3">
                  {housingDocuments.map((document) => (
                    <li
                      className="rounded-md border border-stone-200 bg-stone-50 p-3"
                      key={document.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-sm">{document.title}</strong>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold capitalize text-blue-800">
                          {document.status.replace("_", " ")}
                        </span>
                      </div>
                      <span className="mt-1 block text-xs capitalize text-stone-500">
                        {document.documentType.replace("_", " ")}
                        {document.importantDate
                          ? ` · Date ${formatDate(new Date(document.importantDate))}`
                          : ""}
                      </span>
                      {document.notes ? (
                        <p className="mt-2 text-sm text-stone-700">{document.notes}</p>
                      ) : null}
                      {document.fileUrl ? (
                        <a
                          className="mt-2 inline-block text-sm font-semibold text-teal-800 hover:text-teal-950"
                          href={document.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Document
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm text-stone-600">
                  No housing docs linked yet. Upload the CSU contract through
                  private storage when ready.
                </p>
              )}
            </section>

            <section className="rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold">Done Log</h2>
              <ol className="grid gap-3">
                {history.slice(0, 12).map((entry) => (
                  <li
                    className="border-b border-stone-200 pb-3 last:border-0 last:pb-0"
                    key={entry.id}
                  >
                    <strong className="block">{entry.taskTitle}</strong>
                    <span className="block text-stone-600">
                      {historyLabel(entry.type)}
                    </span>
                    <span className="block text-sm text-stone-500">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function AuthGate() {
  const [email, setEmail] = useState(primaryAccessEmail);
  const [message, setMessage] = useState("Sign in to open Josephine's dashboard.");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasskeySubmitting, setIsPasskeySubmitting] = useState(false);

  async function requestMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setIsSubmitting(true);
    setMessage("Sending secure sign-in link...");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: window.location.origin,
        },
      });

      setMessage(
        error
          ? error.message
          : "Check your email for a secure sign-in link, then return here.",
      );
    } catch (error) {
      setMessage(
        error instanceof TypeError
          ? authNetworkErrorMessage
          : "Sign-in failed. Check Supabase Auth settings and try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function signInWithPasskey() {
    setIsPasskeySubmitting(true);
    setMessage("Checking for a passkey on this device...");

    const { error } = await signInWithDevicePasskey(email.trim() || undefined);

    setIsPasskeySubmitting(false);
    setMessage(
      error?.message
        ? error.message
        : "Passkey accepted. Opening Josephine's dashboard...",
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-stone-950">
      <section className="w-full max-w-md rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase text-teal-800">
          Josephine&apos;s Dashboard
        </p>
        <h1 className="mt-2 text-3xl font-black">Sign in</h1>
        <p className="mt-2 text-stone-600">{message}</p>
        <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-950">
          <strong className="block">MacBook-first access</strong>
          <span>
            Josephine&apos;s MacBook with Touch ID should be the easy way back in.
            Use the secure email link once, then set up a passkey here. School
            passwords are never stored.
          </span>
        </div>
        <button
          className="mt-5 min-h-11 w-full rounded-md border border-teal-700 px-4 font-semibold text-teal-800 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400"
          type="button"
          onClick={signInWithPasskey}
          disabled={isPasskeySubmitting}
        >
          {isPasskeySubmitting ? "Checking" : "Use Touch ID passkey"}
        </button>
        <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase text-stone-500">
          <span className="h-px flex-1 bg-stone-200" />
          Secure email backup
          <span className="h-px flex-1 bg-stone-200" />
        </div>
        <form className="mt-5 grid gap-3" onSubmit={requestMagicLink}>
          <input
            className="min-h-11 rounded-md border border-stone-300 px-3"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={primaryAccessEmail}
            required
          />
          <button
            className="min-h-11 rounded-md bg-teal-700 px-4 font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Sending" : "Send secure sign-in link"}
          </button>
        </form>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 px-4 text-stone-950">
      <section className="rounded-lg border border-stone-300 bg-white p-6 shadow-sm">
        <p className="font-semibold">Opening Josephine&apos;s dashboard...</p>
      </section>
    </main>
  );
}

function SummaryMetric({
  value,
  label,
  danger = false,
}: {
  value: number;
  label: string;
  danger?: boolean;
}) {
  return (
    <div className="border-b border-stone-300 p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <span
        className={`block text-4xl font-black ${danger ? "text-red-700" : "text-teal-800"}`}
      >
        {value}
      </span>
      <p className="mt-1 text-stone-600">{label}</p>
    </div>
  );
}
