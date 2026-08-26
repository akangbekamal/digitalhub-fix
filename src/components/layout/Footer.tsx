import { SocialLinks } from "@/components/SocialLinks";
import { whatsappLink, useSettings } from "@/hooks/useSettings";
import { Link } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export function Footer() {
  const { store } = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        {/* Brand / Social */}
        <div className="space-y-4">
          <Logo />

          <p className="max-w-xs text-sm text-muted-foreground">
            {store?.tagline ??
              "Ghana's trusted digital products store."}{" "}
            Data bundles, gift cards, streaming, software and more — paid with
            Mobile Money.
          </p>

          {/* Social links are loaded from Admin Settings */}
          <SocialLinks className="mt-4" />
        </div>

        {/* Shop */}
        <nav aria-label="Shop links">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">
            Shop
          </h2>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/shop" className="hover:text-primary">
                All products
              </Link>
            </li>

            <li>
              <Link to="/categories" className="hover:text-primary">
                Categories
              </Link>
            </li>

            <li>
              <Link to="/cart" className="hover:text-primary">
                Cart
              </Link>
            </li>

            <li>
              <Link to="/dashboard" className="hover:text-primary">
                Customer dashboard
              </Link>
            </li>

            <li>
              <Link to="/dashboard/support" className="hover:text-primary">
                Support
              </Link>
            </li>
          </ul>
        </nav>

        {/* Company */}
        <nav aria-label="Company links">
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">
            Company
          </h2>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/about" className="hover:text-primary">
                About
              </Link>
            </li>

            <li>
              <Link to="/faq" className="hover:text-primary">
                FAQ
              </Link>
            </li>

            <li>
              <Link to="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>

            {([
              ["privacy", "Privacy Policy"],
              ["terms", "Terms & Conditions"],
              ["refund", "Refund Policy"],
              ["download", "Download Policy"],
              ["delivery", "Delivery Information"],
            ] as const).map(([slug, label]) => (
              <li key={slug}>
                <Link
                  to="/policies/$slug"
                  params={{ slug }}
                  className="hover:text-primary"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact Information */}
        <div>
          <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider">
            Get in touch
          </h2>

          <ul className="space-y-2 text-sm text-muted-foreground">
            {/* Email */}
            {store?.email && (
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-primary" />

                <a
                  href={`mailto:${store.email}`}
                  className="break-all hover:text-primary"
                >
                  {store.email}
                </a>
              </li>
            )}

            {/* Phone */}
            {store?.phone && (
              <li className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-primary" />

                <a
                  href={`tel:${store.phone.replace(/[^\d+]/g, "")}`}
                  className="hover:text-primary"
                >
                  {store.phone}
                </a>
              </li>
            )}

            {/* WhatsApp */}
            {store?.whatsapp && whatsappLink(store.whatsapp) && (
              <li className="flex items-center gap-2">
                <MessageCircle className="size-4 shrink-0 text-primary" />

                <a
                  href={whatsappLink(store.whatsapp)!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  {store.whatsapp}
                </a>
              </li>
            )}

            {/* Business hours */}
            {store?.hours && <li>{store.hours}</li>}

            {/* Business address */}
            {store?.address && <li>{store.address}</li>}
          </ul>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {year} {store?.name ?? "DIGITAL HUB GH"}. All rights reserved.
      </div>
    </footer>
  );
}
