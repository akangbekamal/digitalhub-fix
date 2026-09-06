import { AnnouncementPopup, AnnouncementTopBanner } from "@/components/announcements/AnnouncementNotice";

/**
 * Sitewide announcement surfaces: the top banner and the popup placement.
 * All eligibility (status, schedule, expiry, audience, targeting, dismissal)
 * lives in `@/lib/announcements`.
 */
export function AnnouncementBanner() {
  return (
    <>
      <AnnouncementTopBanner />
      <AnnouncementPopup />
    </>
  );
}
