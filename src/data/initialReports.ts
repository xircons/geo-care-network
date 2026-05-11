import type { Report } from "../types";

export const initialReports: Report[] = [
  {
    id: "r1",
    title: "Illegal waste dumping near canal",
    description:
      "A pile of construction debris and household waste has been dumped along the canal embankment. Risk of contamination after the next rain. Needs cleanup by municipal services.",
    category: "environment",
    status: "in progress",
    severity: "danger",
    reporter: "Somchai K.",
    address: "Canal Road, Chang Khlan, Mueang Chiang Mai",
    lat: 18.7889,
    lng: 98.9853,
    x: 58,
    y: 60,
    filed: "2026-05-02T21:30:00",
    updated: "2026-05-06T16:00:00"
  },
  {
    id: "r2",
    title: "Pothole on Nimman Soi 7",
    description:
      "Deep pothole forming after recent rainstorm. Two scooter incidents reported this week. Please patch before peak hour.",
    category: "infrastructure",
    status: "open",
    severity: "warning",
    reporter: "Pim N.",
    address: "Nimmanahaeminda Rd, Suthep, Mueang Chiang Mai",
    lat: 18.8001,
    lng: 98.9678,
    x: 36,
    y: 50,
    filed: "2026-05-08T08:14:00",
    updated: "2026-05-09T11:20:00"
  },
  {
    id: "r3",
    title: "Streetlight restored on Tha Phae",
    description:
      "After two weeks of darkness the streetlight at the corner is finally working again. Thanks to the night team!",
    category: "infrastructure",
    status: "resolved",
    severity: "safe",
    reporter: "Anan T.",
    address: "Tha Phae Rd, Si Phum, Mueang Chiang Mai",
    lat: 18.7882,
    lng: 98.9931,
    x: 68,
    y: 62,
    filed: "2026-04-29T19:05:00",
    updated: "2026-05-04T09:40:00"
  },
  {
    id: "r4",
    title: "Loose dogs near school gate",
    description:
      "Pack of 3 strays near Wat Phra Singh school entrance during pickup hours. Children scared.",
    category: "safety",
    status: "open",
    severity: "warning",
    reporter: "Mali W.",
    address: "Samlan Rd, Phra Singh, Mueang Chiang Mai",
    lat: 18.7886,
    lng: 98.981,
    x: 50,
    y: 55,
    filed: "2026-05-10T15:48:00",
    updated: "2026-05-10T15:48:00"
  }
];
