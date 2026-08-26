import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  delivery_info: string;
  features: string[];
  price: number;
  discount_price: number | null;
  stock: number;
  unlimited_stock: boolean;
  is_featured: boolean;
  image_url: string | null;
  product_type: string;
  tags: string[];
  rating_avg: number;
  rating_count: number;
  sold_count: number;
  category_id: string | null;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
};

const PRODUCT_FIELDS =
  "id,name,slug,description,delivery_info,features,price,discount_price,stock,unlimited_stock,is_featured,image_url,product_type,tags,rating_avg,rating_count,sold_count,category_id";

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  staleTime: 60_000,
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("id,name,slug,description,icon")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
});

export const productsQuery = queryOptions({
  queryKey: ["products"],
  staleTime: 30_000,
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("is_active", true)
      .order("is_featured", { ascending: false })
      .order("sold_count", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Product[];
  },
});

export function productQuery(slug: string) {
  return queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return (data as Product) ?? null;
    },
  });
}

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  created_at: string;
};

export function reviewsQuery(productId: string | undefined) {
  return queryOptions({
    queryKey: ["reviews", productId],
    enabled: Boolean(productId),
    queryFn: async (): Promise<PublicReview[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,title,body,created_at")
        .eq("product_id", productId!)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as PublicReview[];
    },
  });
}
