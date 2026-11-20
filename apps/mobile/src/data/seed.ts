// ponytail: seed data until the Firestore sync phase (paisa, ids), so the swap is a data source change.
export type Product = { id: string; name: string; ur: string; unit: string; price: number; cost: number; stock: number; min: number; codes: string[]; expiry?: string; archived?: boolean };
export type Customer = { id: string; name: string; ur: string; balance: number; area: string; last: string };

const p = (id: string, name: string, ur: string, rupees: number, cost: number, stock: number, min: number, code: string): Product =>
  ({ id, name, ur, unit: 'pcs', price: rupees * 100, cost: cost * 100, stock, min, codes: [code] });

export const PRODUCTS: Product[] = [
  p('1', 'Atta 10kg', 'آٹا 10 کلو', 1450, 1320, 34, 15, '8961001000011'),
  p('2', 'Cooking Oil 1L', 'کوکنگ آئل 1 لیٹر', 540, 492, 58, 20, '8961001000028'),
  p('3', 'Sugar 1kg', 'چینی 1 کلو', 155, 141, 12, 25, '8961001000035'),
  p('4', 'Basmati Rice 5kg', 'باسمتی چاول 5 کلو', 1850, 1690, 42, 12, '8961001000042'),
  p('5', 'Tea Pack 190g', 'چائے 190 گرام', 420, 376, 7, 15, '8961001000059'),
  p('6', 'Daal Chana 1kg', 'دال چنا 1 کلو', 330, 296, 26, 10, '8961001000066'),
  p('7', 'Milk Pack 1L', 'دودھ 1 لیٹر', 290, 262, 18, 12, '8961001000073'),
  p('8', 'Biscuit Family Pack', 'بسکٹ فیملی پیک', 90, 76, 60, 20, '8961001000080'),
  p('9', 'Bath Soap', 'صابن', 120, 101, 3, 12, '8961001000097'),
  p('10', 'Salt 800g', 'نمک 800 گرام', 60, 48, 45, 10, '8961001000103'),
  // Loose items: price is per kg, sold through Weigh item.
  { ...p('11', 'Sugar loose', 'چینی کھلی', 155, 140, 40, 10, ''), unit: 'kg', codes: [] },
  { ...p('12', 'Basmati Rice loose', 'باسمتی چاول کھلے', 370, 330, 60, 15, ''), unit: 'kg', codes: [] },
  { ...p('13', 'Tomato', 'ٹماٹر', 120, 95, 25, 8, ''), unit: 'kg', codes: [] },
  { ...p('14', 'Onion', 'پیاز', 90, 70, 30, 8, ''), unit: 'kg', codes: [] },
];
PRODUCTS[6].expiry = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);

const c = (id: string, name: string, ur: string, rupees: number, area: string, last: string): Customer =>
  ({ id, name, ur, balance: rupees * 100, area, last });

export const CUSTOMERS: Customer[] = [
  c('1', 'Ahmed Raza', 'احمد رضا', 12400, 'Gulberg', '12 Nov'),
  c('2', 'Bilal Karyana', 'بلال کریانہ', 38900, 'Model Town', '10 Nov'),
  c('3', 'Hina Tariq', 'حنا طارق', 2150, 'Johar Town', '14 Nov'),
  c('4', 'Fatima Store', 'فاطمہ اسٹور', 21000, 'Iqbal Town', '02 Nov'),
  c('5', 'Nadia Khan', 'نادیہ خان', 6500, 'Gulberg', '08 Nov'),
  c('6', 'Usman Ali', 'عثمان علی', 0, 'Wapda Town', '13 Nov'),
];

export type Category = {
  k: string; n: [string, string]; icon: string; barcode: boolean; expiry: boolean;
  mode: [string, string]; starter: [string, string]; units: string; special: [string, string]; count: number;
};

// Business templates; the server copy wins once synced.
export const CATEGORIES: Category[] = [
  { k: 'grocery', n: ['Grocery', 'کریانہ'], icon: 'cart', barcode: true, expiry: true, mode: ['Sell by piece, kg and carton', 'پیس، کلو اور کارٹن میں فروخت'], starter: ['Rice, Oil, Sugar, Tea, Dairy, Snacks', 'چاول، تیل، چینی، چائے، ڈیری، اسنیکس'], units: 'pcs · kg · dozen · carton', special: ['Supplier orders and reorder list', 'سپلائر آرڈر اور ری آرڈر فہرست'], count: 42 },
  { k: 'bakery', n: ['Bakery', 'بیکری'], icon: 'bread', barcode: false, expiry: true, mode: ['Sell by weight or piece', 'وزن یا پیس کے حساب سے فروخت'], starter: ['Bread, Cakes, Biscuits, Sweets, Snacks', 'بریڈ، کیک، بسکٹ، مٹھائی، اسنیکس'], units: 'pcs · kg · dozen · box', special: ['Quick-tap item grid with photos', 'تصویروں والا فوری ٹیپ گرڈ'], count: 28 },
  { k: 'milk', n: ['Milk and Dairy', 'دودھ دہی'], icon: 'cup', barcode: false, expiry: true, mode: ['Sell by litre and kg', 'لیٹر اور کلو میں فروخت'], starter: ['Milk, Yogurt, Butter, Cream, Eggs', 'دودھ، دہی، مکھن، کریم، انڈے'], units: 'litre · kg · pcs', special: ['Daily customers with fixed litres', 'روزانہ گاہک اور مقررہ لیٹر'], count: 14 },
  { k: 'shoes', n: ['Shoes', 'جوتے'], icon: 'shoe', barcode: true, expiry: false, mode: ['Sell by pair with size', 'سائز کے ساتھ جوڑی میں فروخت'], starter: ['Men, Women, Kids, Sports, Sandals', 'مردانہ، زنانہ، بچے، اسپورٹس، چپل'], units: 'pair', special: ['Size and colour variants', 'سائز اور رنگ کی اقسام'], count: 20 },
  { k: 'garments', n: ['Garments', 'کپڑے'], icon: 'shirt', barcode: true, expiry: false, mode: ['Sell by piece and metre', 'پیس اور میٹر میں فروخت'], starter: ['Unstitched, Ready-made, Kids, Fabric', 'ان سلے، تیار، بچے، کپڑا'], units: 'pcs · metre · suit', special: ['Size and colour variants', 'سائز اور رنگ کی اقسام'], count: 24 },
  { k: 'fruit', n: ['Fruit and Veg', 'فروٹ سبزی'], icon: 'leaf', barcode: false, expiry: false, mode: ['Sell by weight, rate changes daily', 'وزن پر فروخت، روزانہ ریٹ تبدیل'], starter: ['Fruit, Vegetables, Leafy, Dry fruit', 'فروٹ، سبزی، ساگ، خشک میوہ'], units: 'kg · dozen · piece', special: ['One-tap daily rate update', 'ایک ٹیپ میں روزانہ ریٹ اپڈیٹ'], count: 36 },
  { k: 'pharmacy', n: ['Pharmacy', 'میڈیکل اسٹور'], icon: 'pill', barcode: true, expiry: true, mode: ['Sell by strip, box and piece', 'پتہ، ڈبہ اور پیس میں فروخت'], starter: ['Tablets, Syrups, Injections, Care', 'گولیاں، شربت، انجیکشن، کیئر'], units: 'strip · box · bottle', special: ['Batch and expiry on every item', 'ہر آئٹم پر بیچ اور ایکسپائری'], count: 60 },
  { k: 'mobile', n: ['Mobile Shop', 'موبائل شاپ'], icon: 'phone', barcode: true, expiry: false, mode: ['Sell with IMEI or serial', 'آئی ایم ای آئی کے ساتھ فروخت'], starter: ['Phones, Covers, Chargers, Cards', 'فون، کور، چارجر، کارڈز'], units: 'pcs', special: ['IMEI, warranty and repair slips', 'آئی ایم ای آئی، وارنٹی، مرمت'], count: 18 },
  { k: 'hardware', n: ['Hardware', 'ہارڈویئر'], icon: 'wrench', barcode: true, expiry: false, mode: ['Sell by piece, foot and kg', 'پیس، فٹ اور کلو میں فروخت'], starter: ['Pipes, Paint, Tools, Electric, Fittings', 'پائپ، رنگ، اوزار، بجلی، فٹنگ'], units: 'pcs · foot · kg · bag', special: ['Contractor khata with credit limits', 'ٹھیکیدار کھاتہ اور کریڈٹ حد'], count: 34 },
  { k: 'other', n: ['Other', 'دیگر'], icon: 'grid', barcode: false, expiry: false, mode: ['Simple sale by piece', 'پیس کے حساب سے سادہ فروخت'], starter: ['General items', 'عمومی اشیاء'], units: 'pcs · kg', special: ['Everything optional, turn on what you need', 'سب اختیاری، جو چاہیں آن کریں'], count: 0 },
];

export type PlanDef = { n: [string, string]; price: [number, number]; feats: [string, string][] };
export const PLANS: Record<'basic' | 'standard' | 'pro', PlanDef> = {
  basic: { n: ['Basic', 'بنیادی'], price: [500, 5000], feats: [['1 user', '1 صارف'], ['500 products', '500 آئٹمز'], ['Receipts and khata', 'رسید اور کھاتہ']] },
  standard: { n: ['Standard', 'اسٹینڈرڈ'], price: [900, 9000], feats: [['3 users', '3 صارف'], ['Unlimited products', 'لامحدود آئٹمز'], ['Reports and WhatsApp bills', 'رپورٹس اور واٹس ایپ بل']] },
  pro: { n: ['Pro', 'پرو'], price: [1500, 15000], feats: [['10 users', '10 صارف'], ['Online catalog link', 'آن لائن کیٹلاگ'], ['Excel export and backup', 'ایکسل ایکسپورٹ اور بیک اپ']] },
};

/** Cashier permissions shown on Staff and Add staff: key, English, Urdu. */
export const PERMS: [string, string, string][] = [
  ['profit', 'See profit and cost', 'منافع اور لاگت دیکھیں'], ['del', 'Delete or edit sales', 'فروخت حذف یا ایڈیٹ'], ['price', 'Give discounts', 'رعایت دیں'],
];
