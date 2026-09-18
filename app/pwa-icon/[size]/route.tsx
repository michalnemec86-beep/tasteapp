import { ImageResponse } from "next/og";

import { HopMark } from "@/components/brand/PivnikMark";

const ALLOWED_SIZES = new Set([180, 192, 512]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size } = await params;
  const numericSize = Number.parseInt(size.replace(/\.png$/i, ""), 10);

  if (!ALLOWED_SIZES.has(numericSize)) {
    return new Response("Not found", { status: 404 });
  }

  const borderWidth = Math.max(2, Math.round(numericSize * 0.006));
  const markWidth = Math.round(numericSize * 0.39);
  const markHeight = Math.round(numericSize * 0.46);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 35% 22%, #3a2817 0%, #21150c 58%, #160e08 100%)",
        }}
      >
        <div
          style={{
            width: "88%",
            height: "88%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${borderWidth}px solid rgba(231,166,47,0.34)`,
            borderRadius: "22%",
            color: "#ffc052",
          }}
        >
          <HopMark width={markWidth} height={markHeight} />
        </div>
      </div>
    ),
    {
      width: numericSize,
      height: numericSize,
    }
  );
}
