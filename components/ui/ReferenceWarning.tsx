export default function ReferenceWarning({ missing }: { missing: string[] }) {
  return (
    <span className="taste-reference-warning" role="img" aria-label={`Vyžaduje doplnění: ${missing.join(", ")}`} title={`Chybí: ${missing.join(", ")}`}>
      !
    </span>
  );
}
