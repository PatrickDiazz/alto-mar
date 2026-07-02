import type { RescheduleReason } from "@/lib/rescheduleReasons";

export type RenterBooking = {
  id: string;
  bookingGroupId?: string | null;
  status: string;
  createdAt: string;
  bookingDate?: string;
  stripeFlowStatus?: string | null;
  paymentProvider?: string | null;
  paymentStatus?: string | null;
  paidAt?: string | null;
  passengersAdults: number;
  passengersChildren: number;
  hasKids: boolean;
  bbqKit: boolean;
  jetSki?: boolean;
  embarkLocation: string | null;
  embarkTime?: string | null;
  embarkLocationOptions?: string[];
  embarkTimeOptions?: string[];
  totalCents: number;
  routeIslands: string[];
  boat: {
    id: string;
    nome: string;
    distancia: string;
    capacidade?: number;
    jetSkiOffered?: boolean;
    jetSkiPriceCents?: number;
    bbqKitPriceCents?: number;
  };
  ratingBoat?: { stars: number; comment: string | null; ratedAt: string } | null;
  rescheduleReason?: RescheduleReason | null;
  rescheduleTitle?: string | null;
  rescheduleNote?: string | null;
  rescheduleAttachments?: string[];
  renterNoticeCode?: string | null;
};
