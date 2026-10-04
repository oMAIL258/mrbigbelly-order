export type Category = { id: string; slug: string; name_en: string; name_th: string | null; sort: number };

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
  name: string;
  base_price_satang: number;
  qty: number;
  option_ids: string[];
  option_labels: { group: string; label: string; price_delta_satang: number }[];
  line_total_satang: number;
  note?: string;
};

export type Fulfilment =
  | { mode: 'pickup' }
  | { mode: 'delivery'; area_slug: 'rwbk' | 'ntw7'; address: string; phone: string; name: string };
