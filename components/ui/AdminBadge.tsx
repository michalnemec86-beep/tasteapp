type AdminBadgeProps = {
  title?: string;
};

export default function AdminBadge({
  title = "Funkce dostupná pouze administrátorovi",
}: AdminBadgeProps) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "18px",
        padding: "2px 6px",
        border: "1px solid rgba(214,91,66,0.42)",
        borderRadius: "999px",
        background: "rgba(214,91,66,0.10)",
        color: "#e8886f",
        fontSize: "8px",
        lineHeight: 1,
        fontWeight: 850,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      Admin
    </span>
  );
}
