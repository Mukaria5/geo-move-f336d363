export type MachineryType = {
  id: string;
  name: string;
  weight: string;
  icon: string;
};

export const MACHINERY: MachineryType[] = [
  { id: "excavator", name: "Excavator", weight: "20-30T", icon: "🚜" },
  { id: "bulldozer", name: "Bulldozer", weight: "25-40T", icon: "🛠️" },
  { id: "crane", name: "Mobile Crane", weight: "30-60T", icon: "🏗️" },
  { id: "loader", name: "Wheel Loader", weight: "15-25T", icon: "🚧" },
  { id: "backhoe", name: "Backhoe", weight: "5-10T", icon: "⚙️" },
  { id: "roller", name: "Roller", weight: "10-15T", icon: "🛞" },
  { id: "generator", name: "Generator", weight: "5-20T", icon: "⚡" },
  { id: "container", name: "Container", weight: "20-40ft", icon: "📦" },
  { id: "tractor", name: "Tractor", weight: "5-12T", icon: "🚜" },
  { id: "custom", name: "Custom", weight: "Specify", icon: "➕" },
];

export type Truck = {
  id: string;
  driver: string;
  rating: number;
  trips: number;
  truckModel: string;
  capacity: string;
  plate: string;
  etaMin: number;
  distanceKm: number;
  pricePerKm: number;
  basePrice: number;
  // map position percentages
  x: number;
  y: number;
};

export const TRUCKS: Truck[] = [
  { id: "t1", driver: "Samuel Kariuki", rating: 4.9, trips: 312, truckModel: "Scania R580 Low-Bed", capacity: "40T", plate: "KDH 421X", etaMin: 12, distanceKm: 6.4, pricePerKm: 320, basePrice: 8000, x: 32, y: 38 },
  { id: "t2", driver: "Joseph Otieno", rating: 4.8, trips: 198, truckModel: "MAN TGS 33.480", capacity: "30T", plate: "KCB 882P", etaMin: 18, distanceKm: 9.1, pricePerKm: 280, basePrice: 6500, x: 64, y: 28 },
  { id: "t3", driver: "Brian Mwangi", rating: 5.0, trips: 540, truckModel: "Volvo FH16 Heavy", capacity: "60T", plate: "KDA 119Q", etaMin: 23, distanceKm: 12.7, pricePerKm: 410, basePrice: 12000, x: 52, y: 70 },
  { id: "t4", driver: "Daniel Kiprop", rating: 4.7, trips: 142, truckModel: "Mercedes Actros 4148", capacity: "45T", plate: "KDG 305T", etaMin: 27, distanceKm: 14.3, pricePerKm: 350, basePrice: 9000, x: 78, y: 58 },
];

export type BookingStage =
  | "requested"
  | "accepted"
  | "en_route"
  | "loading"
  | "in_transit"
  | "delivered"
  | "completed";

export const STAGES: { id: BookingStage; label: string; desc: string }[] = [
  { id: "requested", label: "Request sent", desc: "Searching for nearby low loaders…" },
  { id: "accepted", label: "Driver accepted", desc: "Your operator is preparing the rig." },
  { id: "en_route", label: "Driver en route", desc: "On the way to your pickup location." },
  { id: "loading", label: "Loading machine", desc: "Securing your equipment on the low-bed." },
  { id: "in_transit", label: "In transit", desc: "On the road to your delivery point." },
  { id: "delivered", label: "Delivered", desc: "Equipment offloaded successfully." },
  { id: "completed", label: "Trip completed", desc: "Receipt generated. Thanks for using LoadLink." },
];
