import type { ReactNode } from "react";

type ContextStatValueProps = {
  primary: ReactNode;
  secondary: ReactNode;
  secondaryLabel: string;
};

export default function ContextStatValue({
  primary,
  secondary,
  secondaryLabel,
}: ContextStatValueProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "5px",
        flexWrap: "wrap",
      }}
    >
      <span>{primary}</span>
      <span
        style={{
          color: "var(--taste-text-muted)",
          fontSize: "0.52em",
          lineHeight: 1,
          fontWeight: 650,
          letterSpacing: 0,
          whiteSpace: "nowrap",
        }}
      >
        ({secondaryLabel} {secondary})
      </span>
    </span>
  );
}
