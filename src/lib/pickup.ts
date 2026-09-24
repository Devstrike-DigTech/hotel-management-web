/**
 * M7: arrival pickups and departure drop-offs. Shared by the "Getting here" sections (server) and
 * the booking form's PICKUP block (client), so the words for each kind of place are the same.
 */
import { formatNaira } from "./format";
import type { PickupKind, PickupPoint, VehicleOption } from "./theme/types";

export const KIND_LABEL: Record<PickupKind, string> = {
  AIRPORT: "Airport",
  MOTOR_PARK: "Motor park",
  TRAIN_STATION: "Train station",
  JETTY: "Jetty",
  OTHER: "Elsewhere",
};

export const KIND_PLURAL: Record<PickupKind, string> = {
  AIRPORT: "Airports",
  MOTOR_PARK: "Motor parks",
  TRAIN_STATION: "Train stations",
  JETTY: "Jetties",
  OTHER: "Other places",
};

/** How a traveller arrives at each kind of place, for the sentence under its heading. */
export const KIND_ARRIVAL: Record<PickupKind, string> = {
  AIRPORT: "Give us your flight and we watch it land.",
  MOTOR_PARK: "Coming by road with God is Good, ABC, Peace Mass Transit or another line? Tell us the company and roughly when the bus gets in.",
  TRAIN_STATION: "Tell us the route and the service, and we meet the train.",
  JETTY: "Tell us the boat and when it docks.",
  OTHER: "Tell us where and when.",
};

/** The one-way price for a direction and vehicle. */
export function transferPrice(point: PickupPoint, direction: "ARRIVAL" | "DEPARTURE", vehicle?: VehicleOption | null): number {
  if (vehicle?.priceKobo != null) return vehicle.priceKobo;
  if (direction === "DEPARTURE" && point.dropOffPriceKobo != null) return point.dropOffPriceKobo;
  return point.priceKobo;
}

/** "From ₦25,000 one way" across vehicles. */
export function priceFrom(point: PickupPoint): string {
  const prices = [point.priceKobo, ...point.vehicleOptions.map((v) => v.priceKobo ?? point.priceKobo)].filter((n) => n > 0);
  if (!prices.length) return "Free";
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return lo === hi ? `${formatNaira(lo)} one way` : `From ${formatNaira(lo)} one way`;
}

/** "Book at least 6 hours ahead" and the operating hours, in words. */
export function pickupTerms(point: PickupPoint): string[] {
  const out: string[] = [];
  if (point.leadTimeHours > 0) out.push(`Book at least ${point.leadTimeHours} ${point.leadTimeHours === 1 ? "hour" : "hours"} ahead`);
  if (point.operatingHours) out.push(`Pickups ${point.operatingHours.open} to ${point.operatingHours.close}`);
  return out;
}

/** The prose line the "Getting here" section leads with: "We pick up from Jibowu Motor Park, MMIA and..." */
export function pickupSentence(points: PickupPoint[]): string | null {
  if (!points.length) return null;
  const names = points.slice(0, 4).map((p) => p.name);
  const more = points.length - names.length;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")}${more ? ", " : " and "}${names[names.length - 1]}`;
  return `We pick up from ${list}${more ? ` and ${more} more ${more === 1 ? "place" : "places"}` : ""}.`;
}

export function groupByKind(points: PickupPoint[]): [PickupKind, PickupPoint[]][] {
  const order: PickupKind[] = ["AIRPORT", "MOTOR_PARK", "TRAIN_STATION", "JETTY", "OTHER"];
  return order.map((k) => [k, points.filter((p) => p.kind === k)] as [PickupKind, PickupPoint[]]).filter(([, list]) => list.length);
}
