export default function Loading() {
  return (
    <main
      className="taste-route-loading"
      aria-busy="true"
      aria-label="Načítání TasteAppu"
      style={{
        maxWidth: "1500px",
        margin: "0 auto",
        padding: "24px 24px 72px",
      }}
    >
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "215px",
          marginBottom: "18px",
          border: "1px solid rgba(145,176,72,0.18)",
          borderRadius: "var(--taste-radius-xl)",
          background: `
            radial-gradient(circle at 82% 18%, rgba(145,176,72,0.12), transparent 20rem),
            var(--taste-surface)
          `,
          boxShadow: "var(--taste-shadow-soft)",
        }}
      >
        <div
          style={{
            display: "grid",
            gap: "12px",
            padding: "30px",
          }}
        >
          <Skeleton width="92px" height="12px" />
          <Skeleton width="min(390px, 78%)" height="38px" />
          <Skeleton width="min(620px, 92%)" height="14px" />
          <Skeleton width="min(510px, 82%)" height="14px" />

          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginTop: "10px",
            }}
          >
            <Skeleton width="126px" height="48px" />
            <Skeleton width="126px" height="48px" />
            <Skeleton width="126px" height="48px" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <aside className="order-2 grid gap-4 md:grid-cols-2 xl:order-1 xl:col-span-3 xl:grid-cols-1">
          <SkeletonCard />
          <SkeletonCard />
        </aside>

        <section className="order-1 xl:order-2 xl:col-span-6">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "15px",
            }}
          >
            <div style={{ display: "grid", gap: "7px" }}>
              <Skeleton width="78px" height="10px" />
              <Skeleton width="150px" height="28px" />
            </div>
            <Skeleton width="118px" height="12px" />
          </div>

          <div style={{ display: "grid", gap: "10px" }}>
            <TimelineSkeleton />
            <TimelineSkeleton />
            <TimelineSkeleton />
          </div>
        </section>

        <aside className="order-3 grid gap-4 md:grid-cols-2 xl:col-span-3 xl:grid-cols-1">
          <SkeletonCard />
          <SkeletonCard />
        </aside>
      </div>
    </main>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        minHeight: "210px",
        padding: "20px",
        border: "1px solid var(--taste-border)",
        borderRadius: "var(--taste-radius-lg)",
        background: "var(--taste-surface)",
        boxShadow: "var(--taste-shadow-soft)",
      }}
    >
      <div style={{ display: "grid", gap: "12px" }}>
        <Skeleton width="155px" height="18px" />
        <Skeleton width="110px" height="10px" />
        <Skeleton width="100%" height="8px" />
        <Skeleton width="91%" height="8px" />
        <Skeleton width="83%" height="8px" />
        <Skeleton width="72%" height="8px" />
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div
      style={{
        position: "relative",
        paddingLeft: "20px",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "5px",
          top: "-10px",
          bottom: "-10px",
          width: "1px",
          background:
            "linear-gradient(180deg, rgba(143,174,70,0.06), rgba(143,174,70,0.30), rgba(143,174,70,0.06))",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: "28px",
          width: "11px",
          height: "11px",
          borderRadius: "50%",
          border: "2px solid rgba(143,174,70,0.65)",
          background: "var(--taste-bg-deep)",
          boxShadow: "0 0 14px rgba(143,174,70,0.18)",
        }}
      />

      <div
        style={{
          minHeight: "112px",
          padding: "15px",
          border: "1px solid rgba(143,174,70,0.20)",
          borderRadius: "14px",
          background: `
            radial-gradient(circle at 88% 16%, rgba(143,174,70,0.09), transparent 15rem),
            var(--taste-surface)
          `,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "42px minmax(0,1fr)",
            gap: "12px",
          }}
        >
          <Skeleton width="42px" height="42px" radius="11px" />
          <div style={{ display: "grid", gap: "9px" }}>
            <Skeleton width="90px" height="9px" />
            <Skeleton width="min(330px, 86%)" height="17px" />
            <Skeleton width="min(420px, 96%)" height="10px" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton({
  width,
  height,
  radius = "999px",
}: {
  width: string;
  height: string;
  radius?: string;
}) {
  return (
    <div
      className="animate-pulse"
      style={{
        width,
        height,
        maxWidth: "100%",
        borderRadius: radius,
        background:
          "linear-gradient(90deg, rgba(255,255,255,0.045), rgba(151,180,78,0.13), rgba(255,255,255,0.045))",
      }}
    />
  );
}
