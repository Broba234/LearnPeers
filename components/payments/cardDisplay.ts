/** Client-side helpers for rendering a saved card ("Visa •••• 4242"). */

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

const BRAND_LABELS: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "Amex",
  discover: "Discover",
  diners: "Diners",
  jcb: "JCB",
  unionpay: "UnionPay",
};

export function formatCardBrand(brand: string): string {
  return BRAND_LABELS[brand?.toLowerCase()] || (brand ? brand[0].toUpperCase() + brand.slice(1) : "Card");
}

export function formatCardLabel(card: SavedCard): string {
  return `${formatCardBrand(card.brand)} •••• ${card.last4}`;
}

export function formatCardExpiry(card: SavedCard): string {
  return `${String(card.expMonth).padStart(2, "0")}/${card.expYear}`;
}
