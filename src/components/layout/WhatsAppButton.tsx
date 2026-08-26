// src/components/layout/WhatsAppButton.tsx
import { MessageCircle } from "lucide-react";
import { useSettings, whatsappLink } from "@/hooks/useSettings";

export function WhatsAppButton() {
  const { settings } = useSettings();
  const href = whatsappLink(settings.whatsapp, "Hello DIGITAL HUB GH, I need help with an order.");

  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-5 right-5 z-50 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="size-6" />
    </a>
  );
}
