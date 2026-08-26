// src/components/SocialLinks.tsx
// Renders only the social links that are actually filled in.
import { Facebook, Instagram, Music2, Send, Twitter } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export function SocialLinks({ className = "" }: { className?: string }) {
  const { settings } = useSettings();

  const links = [
    { href: settings.facebook, label: "Facebook", Icon: Facebook },
    { href: settings.instagram, label: "Instagram", Icon: Instagram },
    { href: settings.twitter, label: "X (Twitter)", Icon: Twitter },
    { href: settings.tiktok, label: "TikTok", Icon: Music2 },
    { href: settings.telegram, label: "Telegram", Icon: Send },
  ].filter((l) => Boolean(l.href));

  if (links.length === 0) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <Icon className="size-5" />
        </a>
      ))}
    </div>
  );
}
