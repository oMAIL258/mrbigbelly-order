'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'th' | 'en';

// Thai is the default because almost every customer is Thai. English is a
// deliberate choice the visitor makes, remembered on their own phone.
const DEFAULT: Lang = 'th';
const KEY = 'mbb-lang';

const TH = {
  cart: 'ตะกร้า',
  back: 'ย้อนกลับ',
  tagline: 'Juice & More · กรุงเทพฯ',
  loadingMenu: 'กำลังโหลดเมนู…',
  loading: 'กำลังโหลด…',
  noItems: 'ยังไม่มีรายการ',
  closedTitle: 'ขณะนี้ร้านปิดอยู่',
  closedBody: 'ดูเมนูได้ตามสบาย และสั่งอาหารได้อีกครั้งเมื่อร้านเปิด',

  ongoingTitle: 'คุณมีคำสั่งซื้อที่กำลังดำเนินการ',
  view: 'ดู',
  ongoingNew: 'รอร้านยืนยัน',
  ongoingConfirmed: 'ครัวกำลังเตรียมอาหาร',
  ongoingReadyPickup: 'พร้อมให้มารับแล้ว',
  ongoingReadyDelivery: 'กำลังเดินทางไปหาคุณ',
  ongoingOther: 'กำลังดำเนินการ',

  yourCart: 'ตะกร้าของคุณ',
  cartEmpty: 'ตะกร้าของคุณว่างเปล่า',
  browseMenu: 'ดูเมนู',
  remove: 'ลบ',
  subtotal: 'ยอดรวม',
  checkout: 'สั่งซื้อ',

  checkoutTitle: 'ยืนยันการสั่งซื้อ',
  howReceive: 'ต้องการรับอาหารแบบไหน',
  pickup: 'รับที่ร้าน',
  pickupSub: 'มารับเองที่ร้าน',
  delivery: 'จัดส่ง',
  deliverySub: 'ฟรี · เฉพาะบางพื้นที่',
  deliveryArea: 'พื้นที่จัดส่ง',
  areasNote: 'ขณะนี้จัดส่งเฉพาะสองพื้นที่นี้เท่านั้น',
  address: 'ที่อยู่ (บ้านเลขที่ อาคาร)',
  name: 'ชื่อ',
  phone: 'เบอร์โทร',
  total: 'ยอดรวม',
  fillToContinue: (what: string) => `กรุณากรอก${what} เพื่อดำเนินการต่อ`,
  fieldAddress: 'ที่อยู่',
  fieldName: 'ชื่อ',
  fieldPhone: 'เบอร์โทร',
  continuePayment: 'ไปหน้าชำระเงิน',

  pickOne: 'เลือก 1 อย่าง',
  pickN: (n: number, got: number) => `เลือก ${n} อย่าง (${got}/${n})`,
  optional: 'ไม่บังคับ',
  noteLabel: 'หมายเหตุถึงครัว (ไม่บังคับ)',
  notePlaceholder: 'เช่น เผ็ดน้อย',
  add: 'เพิ่มลงตะกร้า',

  payTitle: 'ชำระด้วยพร้อมเพย์',
  scanQr: 'สแกน QR นี้ด้วยแอปธนาคารไทย',
  uploadSlip: 'อัปโหลดสลิปการโอนเงิน',
  uploadSlipSub: 'ร้านจะตรวจสอบและยืนยันคำสั่งซื้อของคุณ',
  chooseSlip: 'เลือกรูปสลิป',
  chooseOther: 'เลือกรูปอื่น',
  wentWrong: 'เกิดข้อผิดพลาด',
  uploadToFinish: 'อัปโหลดสลิปเพื่อยืนยันคำสั่งซื้อ',
  submitOrder: 'ส่งคำสั่งซื้อ',
  sending: 'กำลังส่ง…',
  signedInAs: (n: string) => `เข้าสู่ระบบในชื่อ ${n} เราจะแจ้งความคืบหน้าให้ทาง LINE`,
  noLineTitle: 'เราไม่สามารถแจ้งสถานะให้คุณได้',
  noLineBody: 'คุณยังไม่ได้เชื่อมต่อกับ LINE จึงไม่มีช่องทางแจ้งสถานะ หากต้องการรับแจ้งเตือน กรุณาเปิดร้านจากเมนู Mr. Big Belly ใน LINE คำสั่งซื้อของคุณยังดำเนินการตามปกติ',

  orderStatus: 'สถานะคำสั่งซื้อ',
  loadingOrder: 'กำลังโหลดคำสั่งซื้อ…',
  declined: 'คำสั่งซื้อถูกปฏิเสธ',
  declinedNote: 'หากคุณชำระเงินมาแล้ว ทางร้านจะคืนเงินให้ผ่าน LINE',
  rrPayment: 'ตรวจสอบการชำระเงินไม่ได้',
  rrStock: 'ของหมด',
  rrHours: 'นอกเวลาทำการ',
  rrArea: 'ไม่ได้ส่งในพื้นที่นี้',
  rrOther: 'เหตุผลอื่น',
  orderNo: 'คำสั่งซื้อ',
  stepNew: 'รอร้านยืนยัน',
  stepNewNote: 'กำลังตรวจสอบสลิปของคุณ',
  stepConfirmed: 'กำลังเตรียมอาหาร',
  stepConfirmedNote: 'ครัวกำลังทำอยู่',
  stepReadyPickup: 'พร้อมให้มารับ',
  stepReadyDelivery: 'กำลังจัดส่ง',
  stepDonePickup: 'รับแล้ว',
  stepDoneDelivery: 'จัดส่งแล้ว',
  readyInAbout: (m: number) => `พร้อมในอีกประมาณ ${m} นาที`,
  comeGrab: 'มารับได้เลย',
  onTheWay: 'กำลังเดินทางไปหาคุณ',
  totalPaid: 'ยอดที่ชำระ',
  fulfilment: 'รูปแบบการรับ',
};

const EN: typeof TH = {
  cart: 'Cart',
  back: 'Back',
  tagline: 'Juice & More · Bangkok',
  loadingMenu: 'Loading menu…',
  loading: 'Loading…',
  noItems: 'No items yet.',
  closedTitle: 'We’re closed right now',
  closedBody: 'Have a look at the menu — you can order again when we reopen.',

  ongoingTitle: 'You have an order in progress',
  view: 'View',
  ongoingNew: 'Waiting for the shop to confirm',
  ongoingConfirmed: 'The kitchen is preparing it',
  ongoingReadyPickup: 'Ready for pickup',
  ongoingReadyDelivery: 'On its way to you',
  ongoingOther: 'In progress',

  yourCart: 'Your cart',
  cartEmpty: 'Your cart is empty.',
  browseMenu: 'Browse menu',
  remove: 'Remove',
  subtotal: 'Subtotal',
  checkout: 'Checkout',

  checkoutTitle: 'Checkout',
  howReceive: 'How would you like to receive it?',
  pickup: 'Pickup',
  pickupSub: 'At the shop',
  delivery: 'Delivery',
  deliverySub: 'Free · limited areas',
  deliveryArea: 'Delivery area',
  areasNote: 'We only deliver to these two areas for now.',
  address: 'Address (house no., building)',
  name: 'Name',
  phone: 'Phone',
  total: 'Total',
  fillToContinue: (what: string) => `Please add your ${what} to continue.`,
  fieldAddress: 'address',
  fieldName: 'name',
  fieldPhone: 'phone number',
  continuePayment: 'Continue to payment',

  pickOne: 'Pick 1',
  pickN: (n: number, got: number) => `Pick ${n} (${got}/${n})`,
  optional: 'Optional',
  noteLabel: 'Note to the kitchen (optional)',
  notePlaceholder: 'e.g. less spicy',
  add: 'Add',

  payTitle: 'Pay with PromptPay',
  scanQr: 'Scan this QR with any Thai banking app',
  uploadSlip: 'Upload your payment slip',
  uploadSlipSub: 'The shop will verify and confirm your order.',
  chooseSlip: 'Choose slip image',
  chooseOther: 'Choose a different image',
  wentWrong: 'Something went wrong',
  uploadToFinish: 'Upload your slip to finish the order.',
  submitOrder: 'Submit order',
  sending: 'Sending…',
  signedInAs: (n: string) => `Signed in as ${n}. We’ll message you on LINE as your order moves along.`,
  noLineTitle: 'We can’t message you about this order',
  noLineBody: 'You’re not connected to LINE, so there is nowhere to send updates. Open the shop from the Mr. Big Belly menu in LINE if you’d like them. Your order will still go through.',

  orderStatus: 'Order status',
  loadingOrder: 'Loading your order…',
  declined: 'Order declined',
  declinedNote: 'If you were charged, the shop will arrange a refund via LINE.',
  rrPayment: 'Payment could not be verified',
  rrStock: 'Out of stock',
  rrHours: 'Outside operating hours',
  rrArea: 'Delivery area not covered',
  rrOther: 'Another reason',
  orderNo: 'Order',
  stepNew: 'Waiting for the shop',
  stepNewNote: 'We’re checking your payment slip.',
  stepConfirmed: 'Preparing your order',
  stepConfirmedNote: 'The kitchen is on it.',
  stepReadyPickup: 'Ready for pickup',
  stepReadyDelivery: 'Out for delivery',
  stepDonePickup: 'Picked up',
  stepDoneDelivery: 'Delivered',
  readyInAbout: (m: number) => `Ready in about ${m} min`,
  comeGrab: 'Come and grab it!',
  onTheWay: 'On the way to you now.',
  totalPaid: 'Total paid',
  fulfilment: 'Fulfilment',
};

const DICT = { th: TH, en: EN };

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: typeof TH };
const LangContext = createContext<Ctx>({ lang: DEFAULT, setLang: () => {}, t: DICT[DEFAULT] });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT);

  // Read after mount, never during render: the server has no localStorage, and
  // reading it in the initial state would make the markup disagree on hydration.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === 'en' || saved === 'th') setLangState(saved);
    } catch { /* storage blocked */ }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    try { window.localStorage.setItem(KEY, l); } catch { /* storage blocked */ }
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t: DICT[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);

/** Dish and category names exist in both languages; fall back rather than blank. */
export function pickName(lang: Lang, en: string, th: string | null | undefined) {
  return lang === 'th' ? (th?.trim() || en) : en;
}
export function otherName(lang: Lang, en: string, th: string | null | undefined) {
  const second = lang === 'th' ? en : th?.trim();
  const first = pickName(lang, en, th);
  return second && second !== first ? second : null;
}

/** The shop stores a code for why it declined an order, so the reason can be
 *  read in either language. Orders declined before that change hold the wording
 *  itself, which is shown as it was written. */
export function rejectReason(t: typeof TH, stored: string | null): string | null {
  if (!stored) return null;
  const known: Record<string, string> = {
    payment: t.rrPayment, stock: t.rrStock, hours: t.rrHours, area: t.rrArea, other: t.rrOther,
  };
  return known[stored] ?? stored;
}
