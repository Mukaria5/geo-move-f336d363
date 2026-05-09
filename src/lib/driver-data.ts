export type JobStage =
  | "incoming"
  | "accepted"
  | "en_route"
  | "loading"
  | "in_transit"
  | "delivered"
  | "completed";

export type JobRequest = {
  id: string;
  client: string;
  clientRating: number;
  machine: string;
  machineIcon: string;
  weightTons: number;
  pickup: string;
  pickupArea: string;
  dropoff: string;
  dropoffArea: string;
  distanceKm: number;
  etaMin: number;
  price: number;
  requestedAgoMin: number;
  paymentMethod: "M-Pesa" | "Bank" | "Card";
  notes?: string;
};

export const INCOMING_JOBS: JobRequest[] = [
  {
    id: "j-201",
    client: "Tatu City Construction",
    clientRating: 4.8,
    machine: "CAT 320 Excavator",
    machineIcon: "🚜",
    weightTons: 22,
    pickup: "Mlolongo Yard, Mombasa Rd",
    pickupArea: "Mlolongo",
    dropoff: "Tatu City Site, Ruiru",
    dropoffArea: "Ruiru",
    distanceKm: 38.4,
    etaMin: 14,
    price: 24800,
    requestedAgoMin: 1,
    paymentMethod: "M-Pesa",
    notes: "Site gate B. Foreman: George.",
  },
  {
    id: "j-202",
    client: "EPCO Builders",
    clientRating: 4.6,
    machine: "Komatsu D65 Bulldozer",
    machineIcon: "🛠️",
    weightTons: 31,
    pickup: "Industrial Area Depot",
    pickupArea: "Nairobi",
    dropoff: "Konza Technopolis",
    dropoffArea: "Machakos",
    distanceKm: 64.2,
    etaMin: 22,
    price: 41600,
    requestedAgoMin: 3,
    paymentMethod: "Bank",
  },
];

export const COMPLETED_JOBS = [
  { id: "j-188", date: "May 7", route: "Mlolongo → Thika", machine: "Excavator 20T", price: 18400, rating: 5 },
  { id: "j-184", date: "May 5", route: "Athi River → Naivasha", machine: "Crane 45T", price: 52000, rating: 5 },
  { id: "j-179", date: "May 3", route: "Industrial Area → JKIA", machine: "Container 40ft", price: 9800, rating: 4 },
  { id: "j-172", date: "May 1", route: "Embakasi → Kitengela", machine: "Wheel Loader", price: 14200, rating: 5 },
];

export const STAGE_FLOW: { id: JobStage; label: string; cta: string }[] = [
  { id: "accepted", label: "Accepted", cta: "Start trip to pickup" },
  { id: "en_route", label: "En route to pickup", cta: "Arrived at pickup" },
  { id: "loading", label: "Loading machine", cta: "Loading complete" },
  { id: "in_transit", label: "In transit", cta: "Arrived at drop-off" },
  { id: "delivered", label: "Delivered", cta: "Upload proof & complete" },
  { id: "completed", label: "Completed", cta: "Done" },
];
