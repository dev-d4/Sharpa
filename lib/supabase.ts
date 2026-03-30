import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, key);

export type Fund = {
  id: number;
  name: string;
  base_currency: string;
  isin: string;
  category_group: string | null;
  category: string | null;
  global_category: string | null;
  equity_style_box: string | null;
  return_ytd: number | null;
  return_1yr: number | null;
  return_2yr: number | null;
  return_3yr: number | null;
  return_5yr: number | null;
  investment_type: string | null;
  std_dev_3yr: number | null;
  std_dev_1yr: number | null;
  sharpe_3yr: number | null;
  alpha_3yr: number | null;
  beta_3yr: number | null;
  sri_value: number | null;
  ongoing_cost_actual: number | null;
  ongoing_cost_estimated: number | null;
};
