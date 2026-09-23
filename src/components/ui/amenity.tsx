import {
  AirplaneTilt,
  Barbell,
  Bathtub,
  Bed,
  Car,
  Check,
  Coffee,
  Couch,
  Desk,
  Elevator,
  FlowerLotus,
  ForkKnife,
  Lightning,
  Lock,
  Martini,
  Park,
  Presentation,
  ShieldCheck,
  Shower,
  Snowflake,
  SunHorizon,
  SwimmingPool,
  TShirt,
  Television,
  Wheelchair,
  WifiHigh,
} from "@phosphor-icons/react/ssr";
import type { Icon } from "@phosphor-icons/react";
import { createElement } from "react";

/**
 * Amenities arrive as free text from each hotel ("Wi-Fi", "24-hour power", "Swimming pool"),
 * so we match on keywords rather than exact codes, and fall back to a tick.
 */
const RULES: [RegExp, Icon][] = [
  [/wi-?fi|internet|wireless/i, WifiHigh],
  [/power|generator|inverter|solar|electric/i, Lightning],
  [/pool|swim/i, SwimmingPool],
  [/gym|fitness/i, Barbell],
  [/spa|massage|sauna/i, FlowerLotus],
  [/park(ing)?\b|car\b|garage/i, Car],
  [/restaurant|dining|kitchen|meal/i, ForkKnife],
  [/bar|lounge|cocktail|drinks/i, Martini],
  [/breakfast|coffee|tea/i, Coffee],
  [/airport|shuttle|pick-?up|transfer/i, AirplaneTilt],
  [/air ?con|a\/c|\bac\b|cool/i, Snowflake],
  [/tv|television|dstv|netflix/i, Television],
  [/shower/i, Shower],
  [/bath/i, Bathtub],
  [/security|guard|cctv/i, ShieldCheck],
  [/safe|lock/i, Lock],
  [/laundry|dry ?clean|iron/i, TShirt],
  [/conference|meeting|event|business/i, Presentation],
  [/lift|elevator/i, Elevator],
  [/wheelchair|accessib/i, Wheelchair],
  [/garden|lawn|terrace/i, Park],
  [/balcony|view|sea|ocean|lagoon/i, SunHorizon],
  [/desk|work/i, Desk],
  [/sofa|lounge area|living/i, Couch],
  [/bed|linen/i, Bed],
];

export function amenityIcon(label: string): Icon {
  for (const [re, icon] of RULES) if (re.test(label)) return icon;
  return Check;
}

export function AmenityIcon({ label, size = 18, className = "" }: { label: string; size?: number; className?: string }) {
  // Picked from a static table, so creating the element here is safe.
  return createElement(amenityIcon(label), { size, weight: "light", className, "aria-hidden": true });
}
