type IconProps = {
  className?: string;
  title?: string;
};

export function MenuIcon({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function CalendarIcon({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </svg>
  );
}

export function PhoneIcon({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d="M8.5 4.5h3l1.5 3.5-2 1.5a11 11 0 0 0 4.5 4.5l1.5-2 3.5 1.5v3A1.5 1.5 0 0 1 18.5 18 13.5 13.5 0 0 1 6 5.5 1.5 1.5 0 0 1 8.5 4.5z" />
    </svg>
  );
}

export function WhatsAppIcon({ className, title }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d="M12 3.2A8.3 8.3 0 0 0 5.1 15.7L4 20l4.4-1.1A8.3 8.3 0 1 0 12 3.2zm0 15.1a6.8 6.8 0 0 1-3.5-.9l-.25-.15-2.6.7.7-2.55-.16-.26a6.8 6.8 0 1 1 5.8 3.16zm3.85-5.1c-.2-.1-1.2-.6-1.4-.65-.2-.07-.35-.1-.5.1-.14.2-.55.65-.67.78-.12.14-.25.15-.45.05-.2-.1-.85-.31-1.62-1-.6-.53-1-1.2-1.12-1.4-.12-.2-.01-.3.09-.4.1-.1.2-.25.3-.37.1-.12.14-.2.2-.34.07-.14.03-.26-.02-.36-.05-.1-.5-1.2-.68-1.64-.18-.43-.36-.37-.5-.38h-.43c-.14 0-.36.05-.55.26-.2.2-.72.7-.72 1.7 0 1 .74 1.97.84 2.1.1.14 1.45 2.22 3.52 3.11 1.24.54 1.73.58 2.35.49.38-.06 1.2-.49 1.37-.96.17-.47.17-.88.12-.96-.05-.08-.18-.14-.38-.24z" />
    </svg>
  );
}

function createStrokeIcon(paths: string) {
  return function Icon({ className, title }: IconProps) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={title ? undefined : true}
        role={title ? "img" : undefined}
      >
        {title ? <title>{title}</title> : null}
        <path d={paths} />
      </svg>
    );
  };
}

export const HeartIcon = createStrokeIcon(
  "M12 20.5s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10.5c0 5.6-7 10-7 10z",
);

export const AwarenessIcon = createStrokeIcon(
  "M12 3.5a5 5 0 0 1 3.5 8.6V15a1.5 1.5 0 0 1-3 0v-1h-1v1a1.5 1.5 0 0 1-3 0v-2.9A5 5 0 0 1 12 3.5zM10 19h4M10.5 21.5h3",
);

export const FamilyIcon = createStrokeIcon(
  "M8 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM16 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM4.5 19.5v-1A3.5 3.5 0 0 1 8 15h0a3.5 3.5 0 0 1 3.2 2M12.8 17a3.5 3.5 0 0 1 3.2-2h0a3.5 3.5 0 0 1 3.5 3.5v1",
);

export const WorkIcon = createStrokeIcon(
  "M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7M4.5 7h15A1.5 1.5 0 0 1 21 8.5v10A1.5 1.5 0 0 1 19.5 20h-15A1.5 1.5 0 0 1 3 18.5v-10A1.5 1.5 0 0 1 4.5 7z",
);

export const ListenIcon = createStrokeIcon(
  "M4.5 12a7.5 7.5 0 0 1 15 0M8 12v3.5A1.5 1.5 0 0 1 6.5 17H6a2 2 0 0 1-2-2v-1.5M16 12v3.5A1.5 1.5 0 0 0 17.5 17H18a2 2 0 0 0 2-2v-1.5",
);

export const ShieldIcon = createStrokeIcon(
  "M12 3.5 19 6.5v5.2c0 4.3-2.9 7.4-7 8.8-4.1-1.4-7-4.5-7-8.8V6.5L12 3.5z",
);

export const PersonIcon = createStrokeIcon(
  "M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5.5 19.5v-.8A4.7 4.7 0 0 1 10.2 14h3.6a4.7 4.7 0 0 1 4.7 4.7v.8",
);

export const BookIcon = createStrokeIcon(
  "M5 5.5A2.5 2.5 0 0 1 7.5 3H19v16.5H7.5A2.5 2.5 0 0 0 5 22V5.5zM5 18.5A2.5 2.5 0 0 1 7.5 16H19",
);

export const LeafIcon = createStrokeIcon(
  "M5 19c8 0 12-5 14-14-8 1-13 5-14 14zM5 19c3-4 7-7 14-8",
);

export const ArrowRightIcon = createStrokeIcon("M5 12h14M13 6l6 6-6 6");
