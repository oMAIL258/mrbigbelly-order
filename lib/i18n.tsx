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
  // Points and rewards
  myPoints: 'แต้มของฉัน',
  pointsWord: 'แต้ม',
  rewardsTitle: 'ของรางวัล',
  browseRewards: 'ดูของรางวัล',
  openInLine: 'เปิดหน้านี้จากแอป LINE เพื่อดูแต้มสะสมของคุณ',
  pointsOff: 'ตอนนี้ร้านปิดระบบแต้มสะสมอยู่',
  earnRate: (b: number) => `ทุก ${b} บาท ได้ 1 แต้ม`,
  myOrders: 'ประวัติการสั่ง',
  myPointsHistory: 'ประวัติแต้ม',
  myRewards: 'สิทธิ์ของฉัน',
  redeem: 'แลกเลย',
  redeeming: 'กำลังส่งคำขอ…',
  requestSent: 'ส่งคำขอแล้ว รอร้านอนุมัติ',
  requestSentNote: 'เราจะแจ้งผลให้ทาง LINE',
  needMore: (n: number) => `ต้องมีอีก ${n} แต้ม`,
  rewardGone: 'ของรางวัลนี้หมดแล้ว',
  rewardNotYet: 'ของรางวัลนี้ยังไม่เริ่ม',
  rewardExpired: 'ของรางวัลนี้หมดเวลาแล้ว',
  alreadyPending: 'คุณมีคำขอของรางวัลนี้รออนุมัติอยู่แล้ว',
  claimPending: 'รอร้านอนุมัติ',
  claimApproved: 'อนุมัติแล้ว',
  claimRejected: 'ไม่อนุมัติ',
  claimUsed: 'รับของแล้ว',
  showCode: 'แสดงรหัสนี้ที่ร้านเพื่อรับของรางวัล',
  noRewardsYet: 'ยังไม่มีของรางวัลตอนนี้ กลับมาดูใหม่เร็ว ๆ นี้',
  nothingYet: 'ยังไม่มีรายการ',
  keEarn: 'จากการสั่งซื้อ',
  keWelcome: 'แต้มต้อนรับ',
  keRedeem: 'แลกของรางวัล',
  keRefund: 'คืนแต้ม',
  keManual: 'ร้านปรับให้',
  keExpire: 'แต้มหมดอายุ',

  // Discounts the customer has earned and can spend on an order
  discountOff: (b: number) => `ลด ฿${b.toLocaleString('en-US')}`,
  useDiscount: 'ใช้ส่วนลด',
  discountApplied: 'หักส่วนลดแล้ว',
  noDiscountUsed: 'ไม่ใช้ส่วนลดครั้งนี้',
  discountReady: 'ส่วนลดพร้อมใช้',
  discountReadyNote: 'กดเลือกเพื่อหักจากยอดที่ต้องโอน ไม่กดก็เก็บไว้ใช้ครั้งหลังได้',
  discountWaiting: 'เก็บไว้ใช้ตอนสั่งครั้งถัดไป',
  twoWaysTitle: 'ใช้ได้ 2 ทาง เลือกทางไหนก็ได้',
  wayOnline: 'สั่งผ่านเว็บ',
  wayOnlineNote: 'กดใช้ที่หน้าชำระเงินก่อนโอน ยอดจะลดให้เอง',
  wayStore: 'ใช้ที่ร้าน',
  wayStoreNote: 'แสดงรหัสนี้ให้พนักงาน แล้วหักจากบิลที่ร้านได้เลย',
  oneOrTheOther: 'ใช้ได้ครั้งเดียว ใช้ทางใดทางหนึ่ง',
  showThisCode: 'แสดงรหัสนี้ที่ร้าน',
  amountToTransfer: 'ยอดที่ต้องโอน',
  discountUsedAlready: 'ส่วนลดนี้ถูกใช้ไปแล้ว กดส่งออเดอร์อีกครั้งโดยไม่ใช้ส่วนลด ถ้าโอนเงินไปแล้วแจ้งร้านทาง LINE ได้เลย',
  coversWholeBill: 'ส่วนลดนี้มากกว่ายอดสั่ง',
  leftoverLost: (b: number) =>
    `ส่วนลดที่เหลือ ฿${b.toLocaleString('en-US')} จะไม่ถูกเก็บไว้ใช้ครั้งหน้า ใช้ได้ครั้งเดียวทั้งใบ`,
  nothingToTransfer: 'ไม่ต้องโอนเงิน',
  nothingToTransferNote: 'ออเดอร์นี้จ่ายด้วยส่วนลดทั้งหมด ไม่ต้องแนบสลิป',
  noPointsOnFree: 'ออเดอร์นี้ไม่ได้รับแต้มจากยอดซื้อ เพราะไม่มีเงินที่จ่ายจริง',
  useAnyway: 'ใช้เลย',
  confirmDiscount: 'ยืนยันการใช้ส่วนลด',
  aboutToUseFull: (title: string) => `กำลังใช้ “${title}” กับออเดอร์นี้ ไม่ต้องโอนเงิน`,

  // The rules, said plainly so nobody has to ask
  howItWorks: 'แต้มสะสมทำงานอย่างไร',
  ruleEarn: (b: number) => `ทุก ${b} บาทที่จ่าย ได้ 1 แต้ม คิดจากยอดที่โอนจริงหลังหักส่วนลด`,
  ruleWhen: 'แต้มเข้าบัญชีเมื่อร้านตรวจสลิปและกดรับออเดอร์แล้ว ไม่ใช่ตอนกดสั่ง',
  ruleExpiry: (m: number) => `แต้มมีอายุ ${m === 12 ? '1 ปี' : `${m} เดือน`} นับจากวันที่ได้รับ แต้มที่ได้ก่อนจะถูกใช้ก่อน`,
  ruleNoExpiry: 'แต้มไม่มีวันหมดอายุ',
  ruleApproval: 'เมื่อกดแลก แต้มจะถูกหักทันทีและคำขอจะส่งไปที่ร้าน ถ้าร้านไม่อนุมัติ แต้มจะคืนให้ครบ',
  ruleOneOrder: 'ส่วนลด 1 ใบใช้ได้ครั้งเดียว เลือกใช้ตอนสั่งผ่านเว็บ หรือแสดงรหัสใช้กับบิลที่ร้านก็ได้ ถ้าส่วนลดมากกว่ายอดบิล ส่วนที่เหลือจะไม่ถูกเก็บไว้',
  ruleWhereSeen: 'ดูแต้ม วันหมดอายุ และประวัติทั้งหมดได้ที่หน้าสิทธิ์ของฉัน',
  expiryLine: (n: number, when: string) => `${n} แต้มจะหมดอายุ ${when}`,
  neverExpires: 'ไม่มีวันหมดอายุ',
  pointsLeft: (n: number) => `เหลือ ${n} ชิ้น`,
  unlimitedStock: 'มีให้แลก',
  memberSince: (d: string) => `สมาชิกตั้งแต่ ${d}`,
  backToMenu: 'กลับไปที่เมนู',
  confirmRedeem: 'ยืนยันการแลก',
  confirmRedeemNote: (n: number) => `จะใช้ ${n} แต้ม และส่งคำขอให้ร้านอนุมัติ`,
  cancel: 'ยกเลิก',

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
  myPoints: 'My points',
  pointsWord: 'points',
  rewardsTitle: 'Rewards',
  browseRewards: 'See rewards',
  openInLine: 'Open this from LINE to see your points.',
  pointsOff: 'The shop has points switched off at the moment.',
  earnRate: (b) => `1 point for every ${b} baht`,
  myOrders: 'Your orders',
  myPointsHistory: 'Points history',
  myRewards: 'Your rewards',
  redeem: 'Claim it',
  redeeming: 'Sending…',
  requestSent: 'Sent. The shop will approve it shortly.',
  requestSentNote: "We'll let you know on LINE.",
  needMore: (n) => `${n} points to go`,
  rewardGone: 'This one has all gone.',
  rewardNotYet: 'This one has not started yet.',
  rewardExpired: 'This one has finished.',
  alreadyPending: 'You already have a request waiting for this reward.',
  claimPending: 'Waiting for the shop',
  claimApproved: 'Approved',
  claimRejected: 'Not approved',
  claimUsed: 'Collected',
  showCode: 'Show this code at the counter.',
  noRewardsYet: 'No rewards right now. Check back soon.',
  nothingYet: 'Nothing yet.',
  keEarn: 'From an order',
  keWelcome: 'Welcome points',
  keRedeem: 'Reward claimed',
  keRefund: 'Points returned',
  keManual: 'Adjusted by the shop',
  keExpire: 'Expired',

  // Discounts the customer has earned and can spend on an order
  discountOff: (b) => `฿${b.toLocaleString('en-US')} off`,
  useDiscount: 'Use a discount',
  discountApplied: 'Discount applied',
  noDiscountUsed: 'Not this time',
  discountReady: 'Discount ready',
  discountReadyNote: 'Tap one to take it off what you transfer. Leave it and it keeps for next time.',
  discountWaiting: 'Waiting for your next order',
  twoWaysTitle: 'Two ways to use it — whichever suits you',
  wayOnline: 'Ordering online',
  wayOnlineNote: 'Tap it on the payment screen before you transfer and the amount drops.',
  wayStore: 'Eating in the shop',
  wayStoreNote: 'Show this code to the staff and it comes straight off your bill.',
  oneOrTheOther: 'One use only, whichever way you choose.',
  showThisCode: 'Show this code in the shop',
  amountToTransfer: 'Transfer this amount',
  discountUsedAlready: 'That discount has already been used. Send the order again without it, and if you have already transferred, just tell the shop on LINE.',
  coversWholeBill: 'This discount is bigger than your order',
  leftoverLost: (b) =>
    `The remaining ฿${b.toLocaleString('en-US')} will not be saved for next time — a voucher is used all at once.`,
  nothingToTransfer: 'Nothing to transfer',
  nothingToTransferNote: 'Your discount covers this order in full, so there is no slip to send.',
  noPointsOnFree: 'This order earns no points from the amount paid, since nothing was transferred for it.',
  useAnyway: 'Use it anyway',
  confirmDiscount: 'Use this discount?',
  aboutToUseFull: (title) => `You are spending “${title}” on this order. Nothing to transfer.`,

  // The rules, said plainly so nobody has to ask
  howItWorks: 'How points work',
  ruleEarn: (b) => `Every ฿${b} you pay earns 1 point, counted on what you actually transfer after any discount.`,
  ruleWhen: 'Points arrive once the shop has checked your slip and accepted the order, not when you place it.',
  ruleExpiry: (m) => `Points last ${m === 12 ? 'one year' : `${m} months`} from the day you get them. The oldest ones are always spent first.`,
  ruleNoExpiry: 'Points do not expire.',
  ruleApproval: 'Claiming takes the points straight away and sends the request to the shop. If they turn it down you get every point back.',
  ruleOneOrder: 'A discount is used once — either on a website order or by showing its code in the shop. If it is bigger than the bill, the rest is not kept.',
  ruleWhereSeen: 'Your points, their expiry dates and your whole history are on My rewards.',
  expiryLine: (n, when) => `${n} points expire ${when}`,
  neverExpires: 'Never expires',
  pointsLeft: (n) => `${n} left`,
  unlimitedStock: 'Available',
  memberSince: (d) => `Member since ${d}`,
  backToMenu: 'Back to the menu',
  confirmRedeem: 'Claim this reward',
  confirmRedeemNote: (n) => `This uses ${n} points and asks the shop to approve it.`,
  cancel: 'Cancel',

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
