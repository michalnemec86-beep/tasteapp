type TasteLoaderProps = {
  label?: string;
  compact?: boolean;
};

export default function TasteLoader({
  label = "Načítám…",
  compact = false,
}: TasteLoaderProps) {
  return (
    <div
      className={`taste-loader${compact ? " taste-loader-compact" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="taste-loader-mark" aria-hidden="true">
        <span className="taste-loader-ring" />
        <svg viewBox="0 0 23 27" fill="none">
          <path d="M11.5 2.2C9.7 4.2 8.6 6.1 8.4 8.1C9.5 7.7 10.5 7.1 11.5 6.1C12.5 7.1 13.5 7.7 14.6 8.1C14.4 6.1 13.3 4.2 11.5 2.2Z" />
          <path d="M8.6 7.1C5.8 7.6 4 8.9 3.3 11.2C5.5 11.3 7.2 11.9 8.5 13.1C9.1 11.2 9.1 9.2 8.6 7.1Z" />
          <path d="M14.4 7.1C17.2 7.6 19 8.9 19.7 11.2C17.5 11.3 15.8 11.9 14.5 13.1C13.9 11.2 13.9 9.2 14.4 7.1Z" />
          <path d="M8.5 12C5.7 12.6 4 14 3.7 16.4C6 16.3 7.9 16.8 9.3 17.9C9.6 15.9 9.3 13.9 8.5 12Z" />
          <path d="M14.5 12C17.3 12.6 19 14 19.3 16.4C17 16.3 15.1 16.8 13.7 17.9C13.4 15.9 13.7 13.9 14.5 12Z" />
          <path d="M9.2 17C7.1 18.2 6.2 19.8 6.5 21.9C8.5 21.4 10.2 21.5 11.5 22.4C10.9 20.3 10.1 18.5 9.2 17Z" />
          <path d="M13.8 17C15.9 18.2 16.8 19.8 16.5 21.9C14.5 21.4 12.8 21.5 11.5 22.4C12.1 20.3 12.9 18.5 13.8 17Z" />
          <path d="M11.5 6.2V24.8" />
        </svg>
      </div>
      <span className="taste-loader-label">{label}</span>
    </div>
  );
}
