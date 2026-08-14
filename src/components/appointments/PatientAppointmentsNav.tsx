import Link from "next/link";

import type { PatientFilter } from "@/lib/appointments/constants";

const FILTERS: { href: string; label: string; filter: PatientFilter | "home" }[] = [
  { href: "/patient/appointments", label: "Home", filter: "home" },
  { href: "/patient/appointments?filter=upcoming", label: "Upcoming", filter: "upcoming" },
  { href: "/patient/appointments?filter=pending", label: "Pending", filter: "pending" },
  { href: "/patient/appointments?filter=confirmed", label: "Confirmed", filter: "confirmed" },
  { href: "/patient/appointments/history", label: "History", filter: "history" },
];

export function PatientAppointmentsNav({
  active,
}: {
  active: PatientFilter | "home";
}) {
  return (
    <nav aria-label="Appointment views" className="mt-6 flex flex-wrap gap-2">
      {FILTERS.map((item) => {
        const isActive = item.filter === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "bg-accent text-text rounded-full px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                : "border-brand-muted/40 rounded-full border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
