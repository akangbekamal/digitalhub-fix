import { createFileRoute } from "@tanstack/react-router";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SocialLinks } from "@/components/SocialLinks";
import { mailtoLink, telLink, useSettings, whatsappLink } from "@/hooks/useSettings";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us — DIGITAL HUB GH" },
      { name: "description", content: "Reach the DIGITAL HUB GH support team." },
      { property: "og:title", content: "Contact Us — DIGITAL HUB GH" },
      { property: "og:description", content: "Reach the DIGITAL HUB GH support team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  const { settings } = useSettings();
  const wa = whatsappLink(settings.whatsapp);
  const mail = mailtoLink(settings.email);
  const tel = telLink(settings.phone);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-foreground">Contact us</h1>
      <p className="mt-2 text-muted-foreground">
        We reply fast on WhatsApp, email and phone.
      </p>

      <div className="mt-8 space-y-4">
        {mail && (
          <a href={mail} className="flex items-center gap-3 text-sm text-foreground hover:text-primary">
            <Mail className="size-4 text-primary" /> {settings.email}
          </a>
        )}
        {tel && (
          <a href={tel} className="flex items-center gap-3 text-sm text-foreground hover:text-primary">
            <Phone className="size-4 text-primary" /> {settings.phone}
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-sm text-foreground hover:text-primary"
          >
            <MessageCircle className="size-4 text-primary" /> {settings.whatsapp}
          </a>
        )}
        {settings.address && (
          <p className="flex items-center gap-3 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary" /> {settings.address}
          </p>
        )}
      </div>

      <SocialLinks className="mt-8" />
    </div>
  );
}
