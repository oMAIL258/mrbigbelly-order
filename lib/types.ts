export type Category = {
  id: string; slug: string; name_en: string; name_th: string | null; sort: number;
  /** '09:00:00' when the category cannot be ordered before then. Absent until
   *  sql/11 has been run, which reads the same as all day. */
  available_from?: string | null;
};

export type Promotion = {
  id: string;
  title_th: string;
  title_en: string;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
  bundle_qty: number;
  bundle_price_satang: number;
  item_ids: string[];
};

export type StoreSettings = {
  id: string;
  open_time: string;
  close_time: string;
  default_prep_minutes: number;
  accepting_orders: boolean;
  closed_message: string | null;
};

export type MenuItem = {
  id: string;
  category_id: string;
  slug: string;
  name_en: string;
  name_th: string | null;
  description: string | null;
  price_satang: number;
  photo_url: string | null;
  is_available: boolean;
  tags: string[] | null;
  sort: number;
};

export type OptionGroup = {
  id: string;
  menu_item_id: string;
  name: string;
  pick_kind: 'one' | 'multi' | 'exact';
  pick_count: number | null;
  sort: number;
  options: OptionRow[];
};

export type OptionRow = {
  id: string;
  group_id: string;
  label: string;
  price_delta_satang: number;
  sort: number;
};

export type CartLine = {
  key: string;
  item_id: string;
  /** Both names ride along, so the cart re-reads when the toggle flips. */
  name_en: string;
  name_th: string | null;
  /** Only on lines saved before the language toggle shipped. */
  name?: string;
  name_kitchen?: string;
  base_price_satang: number;
  qty: number;
  option_ids: string[];
  option_labels: { group: string; label: string; price_delta_satang: number }[];
  line_total_satang: number;
  note?: string;
};

export type Fulfilment =
  | { mode: 'pickup'; name: string; phone: string }
  | { mode: 'delivery'; area_slug: 'rwbk' | 'ntw7'; address: string; phone: string; name: string };
