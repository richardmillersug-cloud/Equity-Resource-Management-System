/** Supermarket floor sections for staff assignment */
export const SUPERMARKET_SECTIONS = [
  'Fresh Produce',
  'Dairy & Chilled',
  'Meat & Poultry',
  'Bakery',
  'Frozen Foods',
  'Beverages',
  'Snacks & Confectionery',
  'Personal Care',
  'Household Items',
  'Electronics',
  'Clothing & Accessories',
  'Pharmacy',
  'Customer Service Desk',
  'Returns & Exchanges',
  'General Floor',
] as const;

export type SupermarketSection = (typeof SUPERMARKET_SECTIONS)[number];
