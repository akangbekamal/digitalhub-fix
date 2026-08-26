import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Product images live in a private bucket. Values may be:
 *  - a full https URL (used as-is)
 *  - a storage object path inside the `product-images` bucket
 */
export function useImageUrl(value: string | null | undefined) {
  const [url, setUrl] = useState<string | null>(
    value && /^https?:\/\//.test(value) ? value : null,
  );

  useEffect(() => {
    let active = true;
    if (!value) {
      setUrl(null);
      return;
    }
    if (/^https?:\/\//.test(value)) {
      setUrl(value);
      return;
    }
    void supabase.storage
      .from("product-images")
      .createSignedUrl(value, 60 * 60)
      .then(({ data }) => {
        if (active) setUrl(data?.signedUrl ?? null);
      });
    return () => {
      active = false;
    };
  }, [value]);

  return url;
}
