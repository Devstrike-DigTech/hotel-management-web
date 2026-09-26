"use client";

import {
  Baby,
  BellSimple,
  Briefcase,
  Cake,
  Camera,
  Car,
  Compass,
  Confetti,
  FlowerLotus,
  ForkKnife,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  TShirt,
  Wine,
} from "@phosphor-icons/react";
import type { ConciergeCategory } from "@/lib/concierge";

const ICONS: Record<ConciergeCategory, typeof BellSimple> = {
  WELLNESS: FlowerLotus,
  DINING: ForkKnife,
  ROMANCE_AND_CELEBRATION: Cake,
  GROOMING: Scissors,
  TRANSPORT: Car,
  SECURITY: ShieldCheck,
  TOURS_AND_EXPERIENCES: Compass,
  FAMILY: Baby,
  SHOPPING: ShoppingBag,
  PHOTOGRAPHY: Camera,
  EVENTS: Confetti,
  NIGHTLIFE_RESERVATIONS: Wine,
  BUSINESS: Briefcase,
  LAUNDRY_EXPRESS: TShirt,
  OTHER: BellSimple,
};

export function CategoryIcon({ category, size = 18, className = "" }: { category: ConciergeCategory | null; size?: number; className?: string }) {
  const I = ICONS[category ?? "OTHER"];
  return <I size={size} weight="light" className={className} aria-hidden />;
}
