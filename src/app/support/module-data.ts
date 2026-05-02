export type SupportModule = {
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  sections: {
    title: string;
    items: string[];
  }[];
  links?: {
    label: string;
    href: string;
  }[];
};

export const supportModules: SupportModule[] = [
  {
    slug: "messages",
    title: "Messages",
    eyebrow: "Communications",
    summary:
      "Email, texts, drafts, and social-context help in one review-first space.",
    sections: [
      {
        title: "What This Page Is For",
        items: [
          "Connecting school email through Microsoft OAuth and personal Gmail through Google OAuth.",
          "Keeping imported messages, triage, Social Decoder, and draft review on this page.",
          "Drafting replies to CSU email and Gmail without sending automatically.",
          "Decoding messages that feel confusing, tense, indirect, or hard to answer.",
          "Watching for Black Student Union, Delta Sigma Theta, and campus community updates.",
        ],
      },
      {
        title: "Social Decoder",
        items: [
          "What is the sender probably asking for directly?",
          "What might be implied but not said out loud?",
          "What tone does it seem to have: friendly, neutral, urgent, frustrated, joking, or unclear?",
          "What is a safe, kind reply that does not over-share?",
          "Should this be checked with a trusted person before replying?",
          "Can the reply be drafted here without leaving the Messages page?",
        ],
      },
      {
        title: "Privacy Rule",
        items: [
          "Start with selected emails or pasted/shared texts only.",
          "Do not silently read Mac Messages, iMessage databases, or full message history.",
          "Nothing sends, archives, deletes, or marks messages read without review.",
        ],
      },
    ],
  },
  {
    slug: "school",
    title: "School Help",
    eyebrow: "Academic",
    summary:
      "Assignments, Canvas, accommodations, testing, tutoring, and resource matching.",
    sections: [
      {
        title: "Semester Setup",
        items: [
          "Send accommodation letters through the SDC portal at the start of each semester.",
          "Import Canvas assignments and collect syllabus links.",
          "Capture exam dates, final exam dates, and testing-center scheduling deadlines.",
          "Save professor office hours, TA contacts, tutoring resources, and textbook needs.",
          "Use fixed focus blocks while working through assignments so starting feels smaller.",
          "Add the weekly class schedule at the bottom of this page once course times are known.",
        ],
      },
      {
        title: "SDC Student Agreement Reminders",
        items: [
          "Request accommodations every semester that Josephine wants to use them.",
          "Read and respond to SDC messages in CSU email because SDC uses that as official communication.",
          "Talk with instructors about accommodation logistics before support is needed.",
          "Contact SDC quickly if an access barrier or accommodation problem comes up.",
          "Remember accommodations start from the letter or approval date and are not retroactive.",
          "Use accommodations only for disability-related needs and follow CSU and SDC procedures.",
        ],
      },
      {
        title: "Testing Rules",
        items: [
          "Regular in-person exams and quizzes need to be scheduled with SDC at least 7 days ahead.",
          "Final exams need to be scheduled 1 month ahead.",
          "Exams should match the class date/time unless the instructor gives written approval.",
        ],
      },
      {
        title: "Resources To Match",
        items: [
          "ATRC for reading, writing, note-taking, organization, and assistive tech.",
          "TILT for tutoring and academic support.",
          "SDC for accommodation issues or instructor problems.",
          "Testing Center for accommodated exams.",
          "Key LLC and OPS for accountability and college-life support.",
        ],
      },
    ],
    links: [
      {
        label: "SDC Portal Help",
        href: "https://disabilitycenter.colostate.edu/sdc-student-portal-information/",
      },
      {
        label: "Accommodation Handbook",
        href: "https://disabilitycenter.colostate.edu/accommodations-handbook/",
      },
      {
        label: "TILT Tutoring",
        href: "https://tilt.colostate.edu/learning/tutoring/freeacademicsupport/",
      },
    ],
  },
  {
    slug: "adulting",
    title: "Adulting",
    eyebrow: "Time Sensitive",
    summary:
      "The practical life stuff with dates: health, car, housing, documents, money, food, and campus logistics.",
    sections: [
      {
        title: "Connected Modules",
        items: [
          "Health & Wellness: body-care routines, sleep, Oura, Apple Health summaries, refills, and appointments.",
          "Housing: room reset, supplies, move-in details, contracts, maintenance, and housing accommodation follow-up.",
          "Food: dining schedules, robot delivery instructions, mini-fridge restock, and backup meals.",
          "Money: read-only balance checks, bills, subscriptions, and caregiver-approved reward payouts.",
          "Campus Basics: RamCard, parking, transit, bus trackers, mail/packages, and campus logistics.",
          "Docs & Packing: Drive folders, IDs, insurance cards, housing docs, packing, and room inventory.",
          "Vehicle: gas, mileage checks, oil-service planning, wash, cleanout, and warning-light notes.",
          "Home & Visits: trips home, holidays, Viper visits, packing, transportation, and recovery time.",
          "Work: Handshake, applications, onboarding docs, schedules, hours, paychecks, and school/work fit.",
        ],
      },
      {
        title: "What Surfaces On The Dashboard",
        items: [
          "Health routines, refills, appointments, and sleep-related follow-up when they are due.",
          "Vehicle mileage, gas, wash, cleanout, and oil-service checks.",
          "Housing dates, document dates, and room reset reminders.",
          "Food, money, campus, travel, and daily-life items when timing matters.",
        ],
      },
      {
        title: "What Stays On Dedicated Pages",
        items: [
          "Reference lists, setup notes, resource links, and non-urgent planning.",
          "Use the specific pages for deeper details: Health, Vehicle, Housing, Food, Money, Campus, Docs, and Travel.",
          "Keep private documents in secure storage and link to them only when Josephine chooses.",
        ],
      },
    ],
  },
  {
    slug: "health",
    title: "Health & Wellness",
    eyebrow: "Medical",
    summary:
      "Sleep, appointments, insurance, prescriptions, urgent care, and health logistics.",
    sections: [
      {
        title: "Sleep",
        items: [
          "Track bedtime, wake time, sleep duration, and how hard it was to get going.",
          "Use rough-sleep days to make the day easier: simpler food, fewer optional tasks, and earlier assignment starts.",
          "If several nights are short, restless, or shifted very late, make sleep part of the weekly caregiver or health check-in.",
        ],
      },
      {
        title: "Oura Ring",
        items: [
          "Oura can be connected through its API with Josephine's permission.",
          "The useful scopes are daily summaries and sleep data, with readiness as a possible recovery signal.",
          "Use OAuth for production so the connection can refresh without asking Josephine for a token repeatedly.",
          "Charge the ring once a week so overnight data does not drop out.",
          "Do not store Oura tokens in browser storage; keep them encrypted server-side.",
        ],
      },
      {
        title: "Apple Health",
        items: [
          "Apple Health data is accessed through HealthKit permissions in a native Apple app, not directly from this web app.",
          "A future iOS/macOS helper could request permission and send only high-level sleep summaries to this app.",
          "A lower-tech fallback is Apple Health export, Shortcuts automation, or file import that Josephine chooses.",
          "Only ask for the sleep fields this support system truly needs.",
        ],
      },
      {
        title: "Scrub It!",
        items: [
          "Shower reset: hair, face, underarms, body, feet, and clean clothes after.",
          "If the whole shower feels too big, start with getting into the bathroom and turning on the water.",
          "Use the backup-check reminder if it slips too long, without making it a shame spiral.",
        ],
      },
      {
        title: "Brush It!",
        items: [
          "Dentist reminder: brush for two minutes with fluoride toothpaste.",
          "Aim at the gumline, get the back teeth, and brush the tongue.",
          "Spit after brushing, but do not rinse all the fluoride away right after.",
          "Night brushing matters because teeth sit with whatever is left on them while sleeping.",
        ],
      },
      {
        title: "Wash It!",
        items: [
          "Laundry reset: clothes, towels, and sheets when needed.",
          "Use detergent, dry completely, and put away enough that tomorrow is easier.",
          "Weekly-ish is the goal so laundry does not turn into an emergency pile.",
        ],
      },
      {
        title: "Rewards",
        items: [
          "Scrub It!, Brush It!, and Wash It! can each earn one star per week.",
          "The starting bar is intentionally low and can increase over time toward 100% consistency.",
          "Stars can be banked and traded for caregiver-approved cash payouts recorded in the admin page.",
          "Cash movement happens directly through the credit union, not automatically inside the app.",
        ],
      },
      {
        title: "Keep Easy To Find",
        items: [
          "Insurance status, insurance card, and pharmacy card.",
          "CSU Health Network portal access.",
          "Prescription refill dates and pharmacy location.",
          "Urgent-care plan and after-hours support options.",
        ],
      },
      {
        title: "What Not To Store Casually",
        items: [
          "Detailed medical history.",
          "Medication names or doses unless Josephine chooses a secure medical workflow.",
          "Full insurance card images or private clinical notes in app code.",
        ],
      },
    ],
    links: [
      { label: "CSU Health Portal", href: "https://portal.health.colostate.edu/" },
      { label: "CSU Health Network", href: "https://health.colostate.edu/" },
      {
        label: "Student Insurance Info",
        href: "https://thehub.colostate.edu/student-health-insurance-information/",
      },
    ],
  },
  {
    slug: "safety",
    title: "Help Now",
    eyebrow: "Emergency",
    summary:
      "Urgent contacts, SafeWalk, campus safety links, and what to do when something feels too big.",
    sections: [
      {
        title: "Use When",
        items: [
          "Something feels unsafe or urgent.",
          "Josephine needs a walking escort or campus safety backup.",
          "A problem feels too big to handle alone.",
          "A self-harm or suicide-related concern appears in Ask JoJo or another in-app support flow.",
        ],
      },
      {
        title: "Numbers",
        items: [
          "Emergency: call or text 911.",
          "Mental health crisis, suicidal thoughts, or self-harm urges: call or text 988.",
          "CSU Police non-emergency: 970-491-6425.",
          "SafeWalk: 970-491-1155.",
          "CSU Tell Someone: 970-491-1350 for health, well-being, or safety concerns when it is not an immediate emergency.",
          "Family backup: keep trusted people easy to find without hard-coding private phone numbers.",
        ],
      },
      {
        title: "Safety Alert Boundary",
        items: [
          "Only watch what Josephine types into this app, such as Ask JoJo or future in-app search.",
          "Do not monitor browser history, Mac activity, texts, email, or daily behavior in the background.",
          "Show Josephine the alert and resources immediately.",
          "External caregiver alerts should require explicit setup, clear consent, and an easy way to review or pause them.",
        ],
      },
    ],
    links: [
      { label: "988 Lifeline", href: "https://988lifeline.org/" },
      { label: "988 Chat", href: "https://988lifeline.org/chat/" },
      { label: "CSU Police", href: "https://police.colostate.edu/" },
      { label: "SafeWalk", href: "https://police.colostate.edu/safe-walk/" },
      { label: "CSU Safety", href: "https://safety.colostate.edu/" },
      {
        label: "CSU Tell Someone",
        href: "https://supportandsafety.colostate.edu/tell-someone/",
      },
    ],
  },
  {
    slug: "food",
    title: "Food",
    eyebrow: "Daily Life",
    summary:
      "Braiden first, campus backups, robot delivery, and mini-fridge restocks.",
    sections: [
      {
        title: "Default Plan",
        items: [
          "Use Braiden first because it is the home-base dining option.",
          "Braiden Dining Center and RAMwich pickup are the first places to check from Braiden Hall.",
          "Keep LSC, Academic Village, Durrell, Corbett/Parmelee, and Allison as backups.",
          "Verify hours during breaks, finals, and weird schedule days.",
        ],
      },
      {
        title: "Backup Dining Map",
        items: [
          "Lory Student Center: class-day backup for quick meals and campus restaurant options.",
          "Academic Village / Ram's Horn: south-campus option when Braiden is crowded or closed.",
          "Durrell Center: northwest-campus option near Moby, Durward, Westfall, or Laurel Village.",
          "Corbett / Parmelee: north-campus option near the Rec Center and north residence halls.",
          "Allison Cafe: lighter breakfast or lunch option when near Allison and LSC.",
        ],
      },
      {
        title: "Low-Energy Backup",
        items: [
          "Use robot delivery when the weather is bad or going out feels like too much.",
          "Set the robot delivery pin outside Braiden Hall or the closest safe outdoor pickup spot.",
          "Keep mini-fridge food for backup meals and snacks.",
          "Restock every other week before the backup food disappears.",
        ],
      },
      {
        title: "Mini-fridge Staples",
        items: [
          "Greek yogurt cups, cheese sticks, hummus cups, and baby carrots or snap peas.",
          "Apples, grapes, berries, granola bars, crackers, pretzels, and nut or seed butter.",
          "Microwave rice or pasta cups, protein drinks, and turkey, tuna, or tofu snack packs.",
          "Sparkling water or electrolyte drinks for easy hydration.",
        ],
      },
    ],
    links: [
      { label: "Dining Hours", href: "https://housing.colostate.edu/dining/" },
      { label: "Grubhub Campus", href: "https://www.grubhub.com/campus" },
    ],
  },
  {
    slug: "campus",
    title: "Campus Basics",
    eyebrow: "Logistics",
    summary:
      "RamCard, parking, buses, laundry, mail, packages, and the everyday systems that can derail a day.",
    sections: [
      {
        title: "Things To Keep Easy",
        items: [
          "RamCard and RamCash.",
          "Meal plan and dining access.",
          "Parking permit and where to park on class days.",
          "Around the Horn, Transfort, MAX, Bus Tracker, and stop-text arrivals.",
          "Night safety plan: SafeWalk, RamRide, rideshare backup, and when to call 911.",
          "Laundry location, payment method, detergent, and backup clothes routine.",
          "Mailing address and package pickup routine.",
        ],
      },
      {
        title: "Real-Time Transit",
        items: [
          "Use Transfort Bus Tracker for live bus locations and estimated arrivals.",
          "Use CSU transit and shuttle info for Around the Horn, MAX, and campus route planning.",
          "At a Transfort stop, text the four-digit stop ID to 970-829-1700 for next arrivals.",
          "Future deeper integration should use an official feed or written permission before storing live transit data.",
        ],
      },
      {
        title: "Night Safety & Safe Rides",
        items: [
          "SafeWalk: call 970-491-1155 for a CSUPD student officer to walk with her from dusk until dawn, 7 days a week.",
          "Use SafeWalk for campus-to-campus walking, university property, or nearby locations within the posted service boundary.",
          "RamRide: use the RamRide app or call 970-491-3333 for CSU's student safe-ride program; CSU lists Thursday 10 p.m.-2 a.m. and Friday/Saturday 10 p.m.-3 a.m. as operating windows.",
          "If she feels followed, threatened, injured, or in immediate danger, call or text 911 instead of SafeWalk.",
          "Backup plan: if SafeWalk or RamRide is not the right fit, use a trusted rideshare/taxi, call the RA/front desk, or call a trusted person before walking alone.",
        ],
      },
      {
        title: "Before Leaving At Night",
        items: [
          "Check phone battery and bring keys, RamCard, ID, and any meds or must-have items.",
          "Share the destination with a trusted person if the trip feels stressful or unfamiliar.",
          "Choose lit routes, avoid shortcuts through isolated areas, and wait indoors until the ride or escort arrives.",
          "Use blue-light emergency call boxes or 911 if something changes and it feels unsafe.",
        ],
      },
      {
        title: "Monthly Check",
        items: [
          "Make sure the RamCard is working.",
          "Check parking and transit backup plans.",
          "Clear package notifications.",
          "Restock laundry supplies.",
        ],
      },
    ],
    links: [
      { label: "RamCard", href: "https://www.ramcash.colostate.edu/" },
      { label: "Parking", href: "https://pts.colostate.edu/parking-services/" },
      {
        label: "Transit",
        href: "https://pts.colostate.edu/active-transportation-and-transit-commuter-services/transit-and-shuttles/",
      },
      {
        label: "Transfort Bus Tracker",
        href: "https://clever-web.fcgov.com/home",
      },
      { label: "SafeWalk", href: "https://police.colostate.edu/safe-walk/" },
      {
        label: "CSU Safety Tips",
        href: "https://safety.colostate.edu/safety-tips-for-students/",
      },
      {
        label: "RamRide Apps",
        href: "https://apps.colostate.edu/other.aspx",
      },
      { label: "Ride Transfort", href: "https://ridetransfort.com/" },
      { label: "CSU Campus Map", href: "https://maps.colostate.edu/" },
      { label: "Mail Services", href: "https://mailservices.colostate.edu/" },
    ],
  },
  {
    slug: "money",
    title: "Money",
    eyebrow: "Financial",
    summary:
      "Canvas Credit Union via Plaid, read-only balance checks, weekly money resets, and bill reminders without moving money in the app.",
    sections: [
      {
        title: "Canvas Credit Union",
        items: [
          "Connect Canvas Credit Union through Plaid for read-only balance visibility.",
          "Use Plaid Link so banking credentials are handled by Plaid, not stored in this app.",
          "Show account names, last four digits when available, and balances only.",
          "Refresh balances from the Money page when Josephine wants a current check.",
        ],
      },
      {
        title: "Weekly Reset",
        items: [
          "Check available balance.",
          "Look for upcoming bills or subscriptions.",
          "Ask for backup before transferring money or changing bill-pay settings.",
        ],
      },
      {
        title: "Safety Rules",
        items: [
          "Use Plaid for read-only balances.",
          "Do not store bank usernames, passwords, account numbers, or card numbers.",
          "Transfers and bill pay happen directly at the credit union.",
          "Reward cash payouts should be approved in admin and then moved manually through the credit union.",
        ],
      },
    ],
  },
  {
    slug: "docs",
    title: "Docs & Packing",
    eyebrow: "Storage",
    summary:
      "Drive folders, important documents, room inventory, and packing lists.",
    sections: [
      {
        title: "Cloud Storage Connections",
        items: [
          "Connect Google Drive for personal documents and shared family files.",
          "Connect OneDrive for school or Microsoft documents that need to follow her CSU workflow.",
          "Keep logins persistent through encrypted OAuth refresh access so she does not have to re-enter passwords.",
          "Use the connection panel above to reconnect or disconnect either account.",
        ],
      },
      {
        title: "Drive Folders",
        items: [
          "ID and RamCard backup info.",
          "Insurance and medical.",
          "SDC accommodations.",
          "Housing.",
          "Financial aid and billing.",
          "Vehicle.",
          "Work and tax.",
          "Travel.",
        ],
      },
      {
        title: "Packing And Room Inventory",
        items: [
          "Dorm room essentials.",
          "Medication and health supplies.",
          "Chargers and assistive tech.",
          "Laundry and cleaning.",
          "Weather gear.",
          "Mini-fridge food backups.",
          "Car emergency kit.",
        ],
      },
      {
        title: "Weekly Room Reset",
        items: [
          "Clean the room once a week: trash, recycling, dishes, laundry, desk, floor, sheets/towels, and mini-fridge.",
          "After cleaning, ask what supplies are low before the week gets busy.",
          "Add needed items to the Amazon list for review instead of auto-ordering.",
          "Use the smallest version on hard weeks: trash out, laundry gathered, and one surface cleared.",
        ],
      },
    ],
  },
  {
    slug: "vehicle",
    title: "Vehicle",
    eyebrow: "2017 Volkswagen Touareg",
    summary:
      "Mileage checks, gas, wash/cleanout, and maintenance planning for the campus car.",
    sections: [
      {
        title: "Vehicle Profile",
        items: [
          "Car: 2017 Volkswagen Touareg.",
          "Role: campus car for errands, appointments, shopping, and getting around Fort Collins when transit is not the right fit.",
          "Use monthly odometer checks so maintenance is based on real miles, not memory.",
          "Keep the car plan simple: safe to drive, enough gas, clean enough, and service planned before it becomes urgent.",
        ],
      },
      {
        title: "Core Reminders",
        items: [
          "Monthly miles check: record odometer, fuel level, warning lights, tire-pressure concerns, and any new noises.",
          "Weekly gas check: look at the tank before the week starts and refill before it gets below one quarter.",
          "Monthly wash and cleanout: wash exterior, clear trash, check wipers, and refill windshield washer fluid if low.",
          "Oil service planning: use odometer notes to schedule oil and filter service around every 10,000 miles or 12 months.",
        ],
      },
      {
        title: "Monthly Miles Check",
        items: [
          "Write down the odometer reading.",
          "Check whether the dashboard has any warning lights.",
          "Notice tire-pressure alerts, new smells, new sounds, rough starts, or anything that feels different.",
          "Add the reading to the vehicle log so the app can estimate the next service window.",
        ],
      },
      {
        title: "Gas Routine",
        items: [
          "Check fuel before Monday or before a busy day with appointments, shopping, or errands.",
          "Refill before the tank drops below one quarter so she is not forced to solve gas while already stressed.",
          "Keep a preferred gas station or two saved once she knows the Fort Collins routine.",
          "If the low-fuel light comes on, make gas the next errand rather than a later errand.",
        ],
      },
      {
        title: "Wash And Cleanout",
        items: [
          "Monthly reset for the Touareg: wash exterior, throw away trash, bring in dishes or food wrappers, and clear the passenger/floor areas.",
          "Check wiper blades, windshield washer fluid, napkins/tissues, sunglasses, phone charger, and emergency kit.",
          "Use the cleanout as a supply check: what needs to be replaced, ordered, or moved back to the dorm?",
          "If the week is hard, do the small version: trash out, gas checked, windshield clear.",
        ],
      },
      {
        title: "Oil Service Planning",
        items: [
          "Use the mileage log and last-service receipt to estimate the next oil/filter service.",
          "Start planning before the dashboard reminder or due mileage becomes urgent.",
          "Store service receipts in the Vehicle folder so the app can later read dates and odometer values.",
          "Use a trusted service shop or official Volkswagen guidance before approving repairs or spending money.",
        ],
      },
      {
        title: "Documents To Store",
        items: [
          "Registration and insurance details in private storage, not app code.",
          "Parking permit confirmation and license plate rules.",
          "Service receipts, oil-change records, tire receipts, and repair estimates.",
          "Roadside assistance information if the family chooses to store it securely.",
          "Photos of warning lights or damage when something needs help.",
        ],
      },
      {
        title: "If Something Feels Wrong",
        items: [
          "If a warning light appears, take a photo and ask for help before ignoring it.",
          "If the car smells like gas, overheats, loses power, has brake trouble, or feels unsafe, stop driving and ask for immediate help.",
          "If stranded or unsafe, prioritize personal safety first: move to a safe place, call roadside help or a trusted person, and call 911 for immediate danger.",
          "Do not approve expensive repairs alone; collect the estimate and review it with support.",
        ],
      },
      {
        title: "Maintenance Agent Path",
        items: [
          "Start with in-app mileage logs and receipt/document reminders.",
          "Later, read service receipts from email if Josephine chooses to connect that workflow.",
          "Use official/service-shop guidance before recommending repairs or spending money.",
          "Do not connect insurance, telematics, location tracking, roadside accounts, or vehicle apps without Josephine's explicit consent.",
        ],
      },
    ],
    links: [
      {
        label: "CSU Parking",
        href: "https://pts.colostate.edu/parking-services/",
      },
      {
        label: "Parking Permits",
        href: "https://pts.colostate.edu/parking/permits/",
      },
    ],
  },
  {
    slug: "viper",
    title: "Viper Tracker",
    eyebrow: "Horse Check-In",
    summary:
      "Camera check-in, grain-bag countdown, supply ordering, and break batch planning for Viper while he is in California.",
    sections: [
      {
        title: "Grain Bag Rule",
        items: [
          "Viper eats 2 premade grain bags per day.",
          "Josephine can enter how many bags she leaves him with and the system counts them down.",
          "When the estimate reaches 10 bags, that means about 5 days are left and more bags need to be made.",
          "Use the tracker to order supplies and remind caregiver support before the bin gets too low.",
        ],
      },
      {
        title: "Break Supply Plan",
        items: [
          "When Josephine is home for breaks, batch a large number of grain bags.",
          "Reset the tracker after the new batch is made.",
          "Store notes about grain, supplements, baggies, labels, and anything that needs ordering.",
          "Keep Viper care calm and visible so Josephine can help from Colorado without needing to remember every detail.",
        ],
      },
      {
        title: "Equipment Paths",
        items: [
          "If the barn has reliable Wi-Fi and power, use a weather-resistant Wi-Fi or PoE camera.",
          "If Wi-Fi or power is unreliable, use a solar LTE camera with a data plan.",
          "For a true embedded feed, choose hardware with RTSP or WebRTC and proxy it server-side.",
        ],
      },
      {
        title: "Privacy And Placement",
        items: [
          "Keep the live feed private and password-protected.",
          "Do not put camera usernames, passwords, or public stream URLs in app code.",
          "Aim at Viper's stall or paddock, not neighboring property or people-heavy areas.",
          "Start with an Open Viper Cam button, then embed later if the camera setup supports it safely.",
        ],
      },
    ],
  },
  {
    slug: "semester",
    title: "Semester Start",
    eyebrow: "Launch",
    summary:
      "First-week setup, syllabi, accommodations, exams, textbooks, and support contacts before the term gets loud.",
    sections: [
      {
        title: "First Week",
        items: [
          "Send accommodation letters and confirm SDC portal access.",
          "Import Canvas assignments and upload syllabi or syllabus links.",
          "Capture exam dates, final exam dates, and testing-center deadlines.",
          "Buy or rent textbooks and confirm audiobook or accessible-format needs.",
          "Save professor office hours, TA contacts, tutoring resources, and textbook needs.",
          "Pick a weekly planning time, study blocks, meal anchors, and sleep anchors.",
        ],
      },
      {
        title: "Keep It Simple",
        items: [
          "Only the next action belongs on the dashboard.",
          "Reference details belong here, not in the daily view.",
          "Use Ask JoJo when the next step is unclear.",
        ],
      },
    ],
  },
  {
    slug: "rhythm",
    title: "Weekly Rhythm",
    eyebrow: "Planning",
    summary:
      "A calmer weekly plan for classes, assignments, meals, sleep, work, appointments, and actual downtime.",
    sections: [
      {
        title: "Weekly Anchors",
        items: [
          "Weekly reset.",
          "Class schedule and room reset.",
          "Study blocks before due dates.",
          "Meals and hydration anchors.",
          "Sleep and wake routine.",
          "Work shifts and downtime.",
          "Appointments and transportation buffers.",
        ],
      },
      {
        title: "When The Week Is Too Much",
        items: [
          "Pick the top three must-do items.",
          "Move optional tasks out of the way.",
          "Use support scripts to ask for help earlier.",
        ],
      },
    ],
  },
  {
    slug: "travel",
    title: "Home & Visits",
    eyebrow: "Travel",
    summary:
      "Trips home, holidays, Viper visits, packing, transportation, deadlines, and recovery time.",
    sections: [
      {
        title: "Plan Around Energy",
        items: [
          "Plan trips home and Viper visits around due dates.",
          "Keep packing lists for Colorado-to-California travel.",
          "Track flight, shuttle, or driving details in one place.",
          "Add recovery time after long travel days.",
        ],
      },
      {
        title: "Before Leaving",
        items: [
          "Check Canvas due dates.",
          "Pack medication, chargers, IDs, and weather gear.",
          "Confirm transportation and return timing.",
        ],
      },
    ],
  },
  {
    slug: "belonging",
    title: "People",
    eyebrow: "Belonging",
    summary:
      "Low-pressure connection, Key LLC, clubs, cultural centers, and support for social context.",
    sections: [
      {
        title: "Connection Options",
        items: [
          "Key LLC events and built-in community.",
          "Black Student Union and Cultural Resource Center updates.",
          "Delta Sigma Theta interest and information opportunities.",
          "One low-pressure social attempt per week.",
        ],
      },
      {
        title: "Social Decoder",
        items: [
          "Use Social Decoder when a message feels unclear, loaded, or hard to answer.",
          "Check whether a reply should be short, warm, direct, or reviewed first.",
          "Nothing sends without Josephine reviewing it.",
        ],
      },
    ],
    links: [
      {
        label: "Cultural Resource Centers",
        href: "https://inclusiveexcellence.colostate.edu/cultural-and-resource-centers",
      },
      { label: "Key LLC", href: "https://key.lc.colostate.edu/" },
    ],
  },
  {
    slug: "scripts",
    title: "Scripts",
    eyebrow: "Words Help",
    summary:
      "Starting points for asking professors, RA, SDC, supervisors, caregivers, or support people for help.",
    sections: [
      {
        title: "Use Scripts For",
        items: [
          "Professor: I need help understanding what matters first.",
          "SDC: I need help using an approved accommodation.",
          "RA or housing: I need help with room, maintenance, or suite logistics.",
          "Caregiver: I need backup, but I do not know where to start.",
        ],
      },
      {
        title: "Rules",
        items: [
          "Draft first, review before sending.",
          "Keep messages short and specific.",
          "Ask JoJo for a first draft when the blank page is the blocker.",
        ],
      },
    ],
  },
  {
    slug: "work",
    title: "Work",
    eyebrow: "Future Job",
    summary:
      "Job search, applications, onboarding docs, hours, paychecks, and schedule fit.",
    sections: [
      {
        title: "When Looking",
        items: [
          "Review Handshake for roles that fit school, transportation, and energy.",
          "Save promising jobs in one place.",
          "Summarize schedule, commute, pay, duties, and application steps.",
        ],
      },
      {
        title: "When Employed",
        items: [
          "Track weekly hours.",
          "Use the paycheck estimator to enter hourly pay, hours worked, deductions, and expected tax withholding.",
          "Compare estimated take-home pay against the first real paystub and adjust the percentages.",
          "Compare work schedule against class workload and recovery time.",
          "Check paychecks and pay periods.",
          "Store work documents in Google Drive, not app code.",
        ],
      },
    ],
    links: [
      {
        label: "Handshake",
        href: "https://bizcareers.colostate.edu/resources/handshake/",
      },
      {
        label: "Student Employment Info",
        href: "https://workday.csusystem.edu/student-employment-faqs/",
      },
    ],
  },
  {
    slug: "housing",
    title: "Housing",
    eyebrow: "Dorm Life",
    summary:
      "Room info, housing documents, move-in details, billing, maintenance, and the single-room accommodation.",
    sections: [
      {
        title: "Home Base",
        items: [
          "Planned hall: Braiden Hall.",
          "Keep room assignment, suite details, mailbox/package pickup, front desk, RA name, and emergency contacts here once assigned.",
          "Use this page as the calm place to answer: where do I live, who do I ask, what do I need to do next?",
          "Keep private details in Drive or Supabase storage; do not hard-code room number, contract files, or billing documents.",
        ],
      },
      {
        title: "Single-Room Accommodation",
        items: [
          "Approved housing accommodation: single room in a suite.",
          "Confirm with SDC and Housing whether the approval carries forward automatically or needs annual housing-cycle follow-up.",
          "Before room selection or renewal, check that the accommodation is visible where Housing needs it.",
          "Store eligibility paperwork in private Drive or secure storage, not app code.",
          "If the assigned room does not match the accommodation, contact SDC and Housing promptly and ask for the next written step.",
        ],
      },
      {
        title: "Housing Portal Checklist",
        items: [
          "Open the CSU Housing Portal to apply for housing, review the contract, room assignment, roommate/suite information, and room-selection tasks.",
          "Track application status, deposit/application fee items, contract status, room selection, and move-in appointment when available.",
          "Save screenshots or confirmations to the Housing folder in Google Drive after major portal steps.",
          "Watch CSU email for housing updates because official housing messages may not appear anywhere else.",
        ],
      },
      {
        title: "Move-In Details",
        items: [
          "Track move-in date, time window, parking/unloading plan, check-in location, RamCard access, and who is bringing which items.",
          "Make a Braiden-specific packing list: bedding, towels, shower caddy, laundry, cleaning supplies, chargers, meds, documents, and low-energy food backups.",
          "After arrival, complete any room condition report or damage check as soon as the portal or staff asks for it.",
          "Take photos of room condition before unpacking in case damage questions come up later.",
        ],
      },
      {
        title: "Documents To Store",
        items: [
          "Residence hall contract and confirmation.",
          "Room assignment and suite information.",
          "Housing bills, payment dates, and deposit/application fee receipts.",
          "Move-in instructions and parking/unloading maps.",
          "Accommodation confirmation and any written Housing/SDC follow-up.",
          "Maintenance requests, work-order confirmations, and resolution notes.",
        ],
      },
      {
        title: "When Something Is Wrong",
        items: [
          "For roommate or suite conflict, start with the RA unless the situation feels unsafe.",
          "For routine maintenance, use the Housing maintenance/contact flow and describe the issue clearly.",
          "For urgent safety issues, fire, immediate danger, or medical emergency, call or text 911.",
          "For accommodation barriers, contact SDC and Housing in writing so there is a record.",
        ],
      },
      {
        title: "Weekly Room Reset",
        items: [
          "Clean trash, recycling, dishes, desk, floor, laundry pile, sheets/towels, and mini-fridge.",
          "Check supplies: detergent, dryer sheets, trash bags, wipes, paper towels, toiletries, snacks, and meds.",
          "After cleaning, ask whether anything needs to go on the Amazon review list.",
          "Small-week version: trash out, laundry gathered, one surface clear, food check done.",
        ],
      },
    ],
    links: [
      {
        label: "Housing & Dining Hub",
        href: "https://thehub.colostate.edu/housing-dining/",
      },
      {
        label: "Housing Portal",
        href: "https://colostate.starrezhousing.com/StarRezPortalX",
      },
      {
        label: "Apply For Housing",
        href: "https://housing.colostate.edu/housing/halls/apply/",
      },
      {
        label: "Explore Residence Halls",
        href: "https://housing.colostate.edu/housing/explore/",
      },
      {
        label: "Residence Hall Rates",
        href: "https://housing.colostate.edu/housing/halls/rates/",
      },
      {
        label: "Braiden Hall",
        href: "https://housing.colostate.edu/housing/halls/braiden/",
      },
      {
        label: "Housing Contact",
        href: "https://thehub.colostate.edu/contact-us-by-e-mail/",
      },
      {
        label: "Maintenance Request",
        href: "https://thehub.colostate.edu/contact-us-by-e-mail/",
      },
    ],
  },
];

export function getSupportModule(slug: string) {
  return supportModules.find((module) => module.slug === slug);
}
