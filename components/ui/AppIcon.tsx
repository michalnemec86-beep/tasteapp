export type AppIconName =
  | "beer"
  | "hop"
  | "barley"
  | "brewery"
  | "label"
  | "package"
  | "globe"
  | "bottle"
  | "can"
  | "pet";

type AppIconProps = {
  name: AppIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export default function AppIcon({
  name,
  size = 24,
  strokeWidth = 1.8,
  className,
}: AppIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap:
      "round" as const,
    strokeLinejoin:
      "round" as const,
    "aria-hidden":
      true as const,
    className,
  };

  if (name === "beer") {
    return (
      <svg {...common}>
        <path d="M6 8h10v9.5A2.5 2.5 0 0 1 13.5 20h-5A2.5 2.5 0 0 1 6 17.5V8Z" />
        <path d="M16 10h1.8a2.7 2.7 0 0 1 0 5.4H16" />
        <path d="M7 8c-.7-1.1-.1-2.6 1.2-2.8.6-1.6 2.8-1.8 3.7-.5 1.2-.9 3.1-.2 3.3 1.3.9.2 1.4 1.1 1.1 2H7Z" />
        <path d="M9 11v5" />
        <path d="M13 11v5" />
      </svg>
    );
  }

  if (name === "hop") {
    return (
      <svg {...common}>
        <path d="M12 3c2.5 1.8 4 4.2 4 7.1 0 4-2.8 7.5-4 8.9-1.2-1.4-4-4.9-4-8.9C8 7.2 9.5 4.8 12 3Z" />
        <path d="M12 6v13" />
        <path d="M12 8.5 8.8 7" />
        <path d="M12 8.5 15.2 7" />
        <path d="M12 12 8.3 10.2" />
        <path d="M12 12 15.7 10.2" />
        <path d="M12 15.4 9.2 14" />
        <path d="M12 15.4 14.8 14" />
        <path d="M12 19v2" />
      </svg>
    );
  }

  if (name === "barley") {
    return (
      <svg {...common}>
        <path d="M12 21V5" />
        <path d="M12 8C9.8 8 8.2 6.8 8 5c2.2 0 3.8 1.2 4 3Z" />
        <path d="M12 11c-2.4 0-4.2-1.3-4.5-3.3 2.4 0 4.2 1.3 4.5 3.3Z" />
        <path d="M12 14c-2.5 0-4.3-1.3-4.7-3.4 2.5 0 4.3 1.3 4.7 3.4Z" />
        <path d="M12 8c2.2 0 3.8-1.2 4-3-2.2 0-3.8 1.2-4 3Z" />
        <path d="M12 11c2.4 0 4.2-1.3 4.5-3.3-2.4 0-4.2 1.3-4.5 3.3Z" />
        <path d="M12 14c2.5 0 4.3-1.3 4.7-3.4-2.5 0-4.3 1.3-4.7 3.4Z" />
      </svg>
    );
  }

  if (name === "brewery") {
    return (
      <svg {...common}>
        <path d="M8 8h8" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        <path d="M7.5 8h9l-.6 9.1A2 2 0 0 1 13.9 19h-3.8a2 2 0 0 1-2-1.9L7.5 8Z" />
        <path d="M6 11h1.6" />
        <path d="M16.4 11H18" />
        <path d="M10 19v2" />
        <path d="M14 19v2" />
        <path d="M10 12h4" />
      </svg>
    );
  }

  if (name === "label") {
    return (
      <svg {...common}>
        <path d="M5 7.5 10.5 3H18a3 3 0 0 1 3 3v7.5L14.5 20 5 10.5v-3Z" />
        <circle cx="16.5" cy="7.5" r="1.4" />
        <path d="m8.5 10.5 5 5" />
      </svg>
    );
  }

  if (name === "package") {
    return (
      <svg {...common}>
        <path d="M5 8.5h14v10.5H5V8.5Z" />
        <path d="M7 8.5 8.5 5h7L17 8.5" />
        <path d="M9 12v3.5" />
        <path d="M15 12v3.5" />
        <path d="M5 13h14" />
      </svg>
    );
  }

  if (name === "globe") {
    return (
      <svg {...common}>
        <circle
          cx="12"
          cy="12"
          r="8.5"
        />
        <path d="M3.8 12h16.4" />
        <path d="M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5" />
        <path d="M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5" />
      </svg>
    );
  }

  if (name === "bottle") {
    return (
      <svg {...common}>
        <path d="M9.5 3h5" />
        <path d="M10 3v4L8.2 9.4A5.3 5.3 0 0 0 7 12.7V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-6.3a5.3 5.3 0 0 0-1.2-3.3L14 7V3" />
        <path d="M7.2 14h9.6" />
      </svg>
    );
  }

  if (name === "pet") {
    return (
      <svg {...common}>
        <path d="M10 3h4" />
        <path d="M10.5 3v3.2L9 8.2a4.5 4.5 0 0 0-1 2.8v7.5A2.5 2.5 0 0 0 10.5 21h3a2.5 2.5 0 0 0 2.5-2.5V11a4.5 4.5 0 0 0-1-2.8l-1.5-2V3" />
        <path d="M8.2 12h7.6" />
        <path d="M8.2 17h7.6" />
        <path d="M10 5h4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M8 4h8" />
      <path d="M8.5 4 8 6v13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6l-.5-2" />
      <path d="M8 8h8" />
      <path d="M8 17h8" />
      <path d="M11 11h2" />
    </svg>
  );
}