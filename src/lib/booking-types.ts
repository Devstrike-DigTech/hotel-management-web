/** Types for the M3 guest API (scratchpad API-M3.md). Money is integer kobo; dates are Lagos ISO dates. */
import type { RawLivePlan, RawPlan } from "./rates";
import type { RoomTypePublic } from "./types";

export type BookingChannel = "MARKETPLACE" | "BOOKING_SITE";
export type PaymentMode = "ONLINE" | "PAY_AT_HOTEL";
export type ReservationStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW";
export type BookingDisplayStatus = "AWAITING_PAYMENT" | "CONFIRMED" | "CHECKED_IN" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "EXPIRED";
export type BookingPaymentStatus = "INITIALIZED" | "SUCCEEDED" | "FAILED" | "ORPHANED" | "PARTIALLY_REFUNDED" | "REFUNDED";
export type PaymentState = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "ORPHANED" | "REFUNDED";
export type RefundStatus = "PENDING" | "PROCESSED" | "FAILED";
export type TravellerType = "BUSINESS" | "COUPLE" | "FAMILY" | "SOLO" | "FRIENDS";
export type StayType = "NIGHTLY" | "DAY_USE";

export interface Branding {
  accentColor: string | null;
  logoUrl: string | null;
}

export interface CancellationPolicy {
  freeCancellationHours: number;
  lateCancellationFeePct: number;
  noShowFeePct: number;
  summary: string;
  /* M4 */
  nonRefundable?: boolean;
}

export interface TaxLine {
  code: "VAT" | "CONSUMPTION" | "SERVICE_CHARGE";
  label: string;
  rateBps: number;
  inclusive: boolean;
  amountKobo: number;
}

export interface PriceBreakdown {
  currency: "NGN";
  unit: "NIGHT" | "HOUR";
  rateKobo: number;
  units: number;
  lines: { date: string; description: string; amountKobo: number }[];
  roomSubtotalKobo: number;
  discountKobo: number;
  taxes: TaxLine[];
  taxTotalKobo: number;
  totalKobo: number;
  firstNightTotalKobo: number;
  /* M4, additive */
  nightly?: { date: string; rateKobo: number; discountKobo: number; ruleName: string | null }[];
  averageNightlyKobo?: number;
  ratePlan?: { id: string; code: string; name: string; kind: string; includesBreakfast: boolean; refundable: boolean } | null;
  promo?: { code: string; description: string; type: string; discountKobo: number } | null;
  discountLines?: { date: string; description: string; amountKobo: number }[];
  /* M5: the part of discountKobo that came from loyalty points. */
  loyaltyDiscountKobo?: number;
  /* M7: paid extras and transfers. With add-ons, totalKobo and taxes include them; roomTotalKobo is the room part. */
  roomTotalKobo?: number;
  addOns?: { kind: "EXTRA" | "TRANSFER"; refId: string; description: string; amountKobo: number; netKobo: number; taxKobo: number; totalKobo: number }[];
  addOnsSubtotalKobo?: number;
  addOnsTaxKobo?: number;
}

/** M5: loyalty on a quote (null when the hotel has no programme). */
export interface QuoteLoyalty {
  programme: string;
  member: boolean;
  pointsBalance: number | null;
  pointsRedeemed: number;
  redeemValueKobo: number;
  maxRedeemablePoints: number | null;
  pointsToEarn: number;
  tier: string | null;
}

/** M5: loyalty on a booking. `pointsEarned` is set after check-out. */
export interface BookingLoyalty {
  programme: string;
  pointsRedeemed: number;
  redeemValueKobo: number;
  pointsToEarn: number;
  pointsEarned: number | null;
}

export type LoyaltyTxnType = "EARN" | "REDEEM" | "EXPIRE" | "ADJUST" | "REVERSAL";

export interface GuestLoyaltyTxn {
  id: string;
  type: LoyaltyTxnType;
  points: number;
  balanceAfter: number;
  description: string;
  reason: string | null;
  property: { id: string; name: string; slug: string } | null;
  reservation: { id: string; code: string } | null;
  expiresAt: string | null;
  createdAt: string;
}

/** M5: `GET /guest/loyalty`. */
export interface GuestMembership {
  group: { slug: string; name: string };
  programme: string;
  memberNo: string;
  tier: { name: string; color: string; perks: string[] } | null;
  points: number;
  valueKobo: number;
  nights12m: number;
  nextTier: { name: string; nightsNeeded: number } | null;
  expiringSoon: { points: number; date: string } | null;
  recent: GuestLoyaltyTxn[];
}

export interface HotelMini {
  slug: string;
  name: string;
  tagline: string;
  address: string;
  area: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  checkInTime: string;
  checkOutTime: string;
  coverImageUrl: string | null;
  branding: Branding;
  mapUrl: string;
  /* M7 (trip view, review request): the hotel's theme, so its pages on the hotel host look like its site. */
  theme?: Record<string, unknown> | null;
}

export interface BookingConfig {
  holdMinutes: number;
  quoteTtlMinutes: number;
  paymentProvider: "paystack" | "mock";
  otpChannels: ("SMS" | "WHATSAPP")[];
  devMode: boolean;
  maxNights: number;
  maxAdvanceDays: number;
}

export interface HotelBookingInfo {
  onlineBookingEnabled: boolean;
  payOnlineAvailable: boolean;
  payAtHotelAvailable: boolean;
  holdMinutes: number;
  marketplaceListed: boolean;
  dayUseAvailable: boolean;
  cancellationPolicy: CancellationPolicy;
  taxes: Omit<TaxLine, "amountKobo">[];
}

export interface ReviewSummary {
  rating: number | null;
  count: number;
  subscores: { cleanliness: number | null; service: number | null; location: number | null; value: number | null };
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
  byTravellerType: Record<TravellerType, number>;
}

export interface PublicReview {
  id: string;
  overall: number;
  cleanliness: number;
  service: number;
  location: number;
  value: number;
  title: string | null;
  body: string;
  stayMonth: string;
  travellerType: TravellerType;
  displayName: string;
  verifiedStay: true;
  createdAt: string;
  hotelReply: { body: string; repliedAt: string } | null;
}

export interface ReviewPage {
  summary: ReviewSummary;
  items: PublicReview[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchAvailability {
  checkIn: string;
  checkOut: string;
  nights: number;
  availableRoomTypes: number;
  cheapestRateKobo: number;
  cheapestTotalKobo: number;
}

export interface RoomTypeAvailability {
  roomType: RoomTypePublic;
  available: number;
  bookable: boolean;
  unavailableReason: "SOLD_OUT" | "CAPACITY" | "NO_HOURLY_RATE" | "ONLINE_BOOKING_DISABLED" | null;
  lowAvailability: boolean;
  quote: PriceBreakdown | null;
  /* M4 */
  ratePlans?: RawLivePlan[];
  restriction?: { reason: "CLOSED_TO_ARRIVAL" | "CLOSED_TO_DEPARTURE" | "STOP_SELL" | "MIN_NIGHTS"; date: string; minNights?: number } | null;
}

export interface HotelAvailability {
  slug: string;
  stayType: StayType;
  checkIn: string | null;
  checkOut: string | null;
  date: string | null;
  startTime: string | null;
  hours: number | null;
  arrivalAt: string;
  departureAt: string;
  nights: number | null;
  adults: number;
  children: number;
  onlineBookingEnabled: boolean;
  payOnlineAvailable: boolean;
  payAtHotelAvailable: boolean;
  cancellationPolicy: CancellationPolicy;
  freeCancellationUntil: string | null;
  roomTypes: RoomTypeAvailability[];
}

export interface PaymentOption {
  mode: PaymentMode;
  available: boolean;
  dueNowKobo: number;
  dueAtHotelKobo: number;
  reason: string | null;
}

export interface Quote {
  quoteToken: string;
  expiresAt: string;
  hotel: HotelMini;
  roomType: { id: string; name: string; capacity: number; bedType: string; sizeSqm: number; image: { url: string; alt: string } | null };
  channel: BookingChannel;
  stayType: StayType;
  checkIn: string | null;
  checkOut: string | null;
  date: string | null;
  startTime: string | null;
  hours: number | null;
  nights: number | null;
  arrivalAt: string;
  departureAt: string;
  adults: number;
  children: number;
  breakdown: PriceBreakdown;
  depositDueKobo: number;
  paymentOptions: PaymentOption[];
  cancellationPolicy: CancellationPolicy;
  freeCancellationUntil: string | null;
  holdMinutes: number;
  available: number;
  /* M4 */
  ratePlan?: RawPlan | null;
  promo?: { code: string; description?: string | null; discountKobo: number } | null;
  /* M5 */
  loyalty?: QuoteLoyalty | null;
  /* M7 */
  formVersionId?: string;
  extras?: import("./booking-form").QuotedExtra[];
  transfers?: import("./booking-form").QuotedTransfer[];
}

/** M7: a transfer on the guest's trip view (API-M7 8.4). The driver appears from DRIVER_ASSIGNED on. */
export interface BookingTransfer {
  id: string;
  direction: "ARRIVAL" | "DEPARTURE";
  status: "REQUESTED" | "CONFIRMED" | "DRIVER_ASSIGNED" | "EN_ROUTE" | "PICKED_UP" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  pickupPointName: string;
  kind: import("./theme/types").PickupKind;
  scheduledAt: string;
  passengers: number;
  vehicleName: string;
  totalKobo: number;
  detailsSummary: string;
  notesForGuest: string | null;
  driver: { name: string; phone: string; vehiclePlate: string; vehicleDescription: string | null } | null;
  delayNote: string | null;
}

export interface PaymentInit {
  reference: string;
  authorizationUrl: string;
  accessCode: string | null;
  amountKobo: number;
  provider: "paystack" | "mock";
  holdExpiresAt: string;
}

export interface BookingView {
  code: string;
  status: ReservationStatus;
  displayStatus: BookingDisplayStatus;
  channel: BookingChannel;
  paymentMode: PaymentMode;
  guaranteeType: "NONE" | "PREPAID";
  hotel: HotelMini;
  roomType: { id: string; name: string; bedType: string; capacity: number; image: { url: string; alt: string } | null };
  roomNumber: string | null;
  stayType: StayType;
  arrivalAt: string;
  departureAt: string;
  arrivalDate: string;
  departureDate: string;
  nights: number | null;
  hours: number | null;
  adults: number;
  children: number;
  guest: { fullName: string; phone: string; email: string | null };
  breakdown: PriceBreakdown;
  totalKobo: number;
  paidKobo: number;
  refundedKobo: number;
  outstandingKobo: number;
  hold: { expiresAt: string; secondsLeft: number } | null;
  payment: { reference: string; status: BookingPaymentStatus; amountKobo: number; paidAt: string | null; channel: string | null } | null;
  cancellation: {
    cancelledAt: string;
    cancelledBy: "GUEST" | "HOTEL" | "SYSTEM";
    reason: string | null;
    feeKobo: number;
    refundKobo: number;
    refundStatus: RefundStatus | null;
  } | null;
  cancellationPolicy: CancellationPolicy;
  freeCancellationUntil: string | null;
  canCancel: boolean;
  specialRequests: string;
  calendarUrl: string;
  whatsappShareUrl: string;
  documents: {
    invoices: { id: string; number: string; kind: "PROFORMA" | "FINAL"; issuedAt: string; totalKobo: number }[];
    receipts: { id: string; number: string; issuedAt: string; amountKobo: number; method: string }[];
  };
  review: { eligible: boolean; submitted: boolean; token: string | null; deadline: string | null };
  createdAt: string;
  /* M4 */
  ratePlan?: { code: string; name: string; includesBreakfast: boolean; refundable: boolean } | null;
  promo?: { code: string; discountKobo: number } | null;
  /* M5 */
  loyalty?: BookingLoyalty | null;
  /* M7 */
  answers?: import("./booking-form").AnswerView[];
  extras?: (import("./booking-form").QuotedExtra & { status: "ACTIVE" | "CANCELLED" })[];
  transfers?: BookingTransfer[];
  /* M8 */
  concierge?: { enabled: boolean; openRequests: number; offerAfterBooking: boolean } | null;
}

export interface BookingCreated {
  booking: BookingView;
  manageToken: string;
  manageUrl: string;
  payment: PaymentInit | null;
}

export interface PaymentStatusView {
  reference: string;
  state: PaymentState;
  paymentStatus: BookingPaymentStatus;
  amountKobo: number;
  paidAt: string | null;
  channel: string | null;
  message: string;
  callbackUrl: string;
  booking: BookingView;
  manageToken: string;
  manageUrl: string;
  refund: { amountKobo: number; status: RefundStatus } | null;
}

export interface CancellationPreview {
  canCancel: boolean;
  reason: string | null;
  free: boolean;
  freeCancellationUntil: string | null;
  paidKobo: number;
  feeKobo: number;
  refundKobo: number;
  policy: CancellationPolicy;
  currency: "NGN";
}

export interface GuestAccount {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  profileComplete: boolean;
  createdAt: string;
}

export interface OtpChallenge {
  challengeId: string;
  channel: "SMS" | "WHATSAPP";
  maskedPhone: string;
  expiresAt: string;
  resendAfterSec: number;
  codeLength: number;
}

export interface TripSummary {
  code: string;
  status: ReservationStatus;
  displayStatus: BookingDisplayStatus;
  hotel: { slug: string; name: string; city: string; area: string; coverImageUrl: string | null; branding: Branding };
  roomTypeName: string;
  stayType: StayType;
  arrivalAt: string;
  departureAt: string;
  arrivalDate: string;
  departureDate: string;
  nights: number | null;
  hours: number | null;
  totalKobo: number;
  paidKobo: number;
  outstandingKobo: number;
  paymentMode: PaymentMode | null;
  channel: string;
  hold: { expiresAt: string; secondsLeft: number } | null;
  canReview: boolean;
  reviewed: boolean;
  manageToken: string;
  manageUrl: string;
  /* M5 */
  pointsEarned?: number | null;
}

export interface ReviewRequest {
  eligible: boolean;
  reason: "NOT_CHECKED_OUT" | "ALREADY_REVIEWED" | "WINDOW_CLOSED" | null;
  hotel: { slug: string; name: string; coverImageUrl: string | null; branding: Branding };
  stay: { code: string; roomTypeName: string; arrivalDate: string; departureDate: string; stayMonth: string };
  guestFirstName: string;
  displayName: string;
  deadline: string;
}
