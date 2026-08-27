// Everything about the business that isn't code. One file to edit when the
// client sends the real card, the real hours, or the real phone number.

export const BUSINESS = {
  name: "NORM",
  legal: "NORM Unity",
  city: "Tabriz",
  district: "Valiasr",
  address: "Valiasr, Tabriz, East Azerbaijan",
  tagline: "Coffee, kept to the point",
  instagram: "norm_unity",
  instagramUrl: "https://instagram.com/norm_unity",
  phone: "",                        // fill in once the client confirms it
  geo: { lat: 38.0546, lng: 46.3078 },   // Valiasr, Tabriz
  currency: "T",                    // Toman
  // 0 = Sunday. Local time, 24h. Placeholder until the client confirms.
  hours: {
    0: ["08:00", "23:30"], 1: ["08:00", "23:30"], 2: ["08:00", "23:30"],
    3: ["08:00", "23:30"], 4: ["08:00", "23:30"], 5: ["08:00", "24:00"],
    6: ["08:00", "24:00"],
  },
};

export const ROOM = {
  // Seats drawn on the home grid. Cosmetic — it is the shape of the room, not
  // a booking system.
  capacity: 24,
};

export const ORDER = {
  leadMinutes: 10,        // what the bar needs before a pickup slot is real
  slotStepMinutes: 15,
  slotCount: 8,
  maxPerLine: 9,
  tables: ["1", "2", "3", "4", "5", "6", "7", "8", "Bar", "Terrace"],
  // Minutes the order screen counts down while the bar makes it.
  makeMinutes: 12,
};

export const CHECKIN = {
  // A check-in holds the seat for an hour, then retires itself. Long enough for
  // a coffee and a sit, short enough that the room list is never a lie.
  holdMinutes: 60,
  extendMinutes: 60,
  // Presence is device-local until an endpoint is set. See README → Check-in:
  // point this at a REST endpoint and the room becomes shared with no other
  // change anywhere in the app. Never commit a key here.
  endpoint: "",
  // Puts plausible regulars in the room so the feature can be judged on one
  // phone. Turn off the moment the endpoint above is live.
  demo: true,
};

export const STORAGE = "norm.v1.";
