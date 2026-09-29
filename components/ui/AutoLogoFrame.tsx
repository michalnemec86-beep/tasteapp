"use client";

import {
  type CSSProperties,
  useEffect,
  useState,
} from "react";

type LogoTone =
  | "light"
  | "dark"
  | "unknown";

export default function AutoLogoFrame({
  src,
  alt = "",
  size = 28,
  padding = 2,
  className = "",
  style,
}: {
  src: string;
  alt?: string;
  size?: number;
  padding?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const [
    tone,
    setTone,
  ] = useState<LogoTone>(
    "unknown"
  );

  useEffect(() => {
    let cancelled =
      false;

    setTone(
      "unknown"
    );

    const analyzer =
      new Image();

    analyzer.decoding =
      "async";

    if (
      /^https?:\/\//i.test(
        src
      )
    ) {
      analyzer.crossOrigin =
        "anonymous";
    }

    analyzer.onload =
      () => {
        try {
          const canvas =
            document.createElement(
              "canvas"
            );

          const size =
            32;

          canvas.width =
            size;
          canvas.height =
            size;

          const context =
            canvas.getContext(
              "2d",
              {
                willReadFrequently:
                  true,
              }
            );

          if (!context) {
            return;
          }

          context.clearRect(
            0,
            0,
            size,
            size
          );

          context.drawImage(
            analyzer,
            0,
            0,
            size,
            size
          );

          const pixels =
            context.getImageData(
              0,
              0,
              size,
              size
            ).data;

          let luminanceSum =
            0;
          let weightSum =
            0;

          for (
            let index = 0;
            index <
            pixels.length;
            index += 4
          ) {
            const alpha =
              pixels[
                index + 3
              ] / 255;

            if (
              alpha <
              0.12
            ) {
              continue;
            }

            const red =
              pixels[index] /
              255;
            const green =
              pixels[
                index + 1
              ] / 255;
            const blue =
              pixels[
                index + 2
              ] / 255;

            const luminance =
              0.2126 *
                red +
              0.7152 *
                green +
              0.0722 *
                blue;

            luminanceSum +=
              luminance *
              alpha;

            weightSum +=
              alpha;
          }

          if (
            weightSum <
            1
          ) {
            return;
          }

          const average =
            luminanceSum /
            weightSum;

          if (
            !cancelled
          ) {
            setTone(
              average >=
                0.68
                ? "light"
                : "dark"
            );
          }
        } catch {
          // Remote logos without CORS keep the safe light fallback.
        }
      };

    analyzer.onerror =
      () => {
        // Keep the normal light background when luminance cannot be read.
      };

    analyzer.src =
      src;

    return () => {
      cancelled =
        true;
      analyzer.onload =
        null;
      analyzer.onerror =
        null;
    };
  }, [src]);

  const darkBackground =
    "radial-gradient(circle at 34% 24%, rgba(255,219,158,.08), transparent 42%), linear-gradient(145deg, #2a211b 0%, #17130f 58%, #0e0d0b 100%)";

  const lightBackground =
    "rgba(255,255,255,.94)";

  return (
    <span
      className={
        [
          "taste-brewery-logo-frame",
          "taste-auto-logo-frame",
          className,
        ]
          .filter(
            Boolean
          )
          .join(" ")
      }
      data-logo-tone={
        tone
      }
      style={{
        width:
          size,
        height:
          size,
        flexShrink: 0,
        display:
          "inline-flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        overflow:
          "hidden",
        borderRadius:
          "50%",
        border:
          "1px solid rgba(235,174,75,.42)",
        background:
          tone ===
          "light"
            ? darkBackground
            : lightBackground,
        boxShadow:
          tone ===
          "light"
            ? "0 2px 8px rgba(0,0,0,.36), inset 0 1px rgba(255,221,162,.08)"
            : "0 2px 7px rgba(0,0,0,.27), inset 0 0 0 1px rgba(255,255,255,.04)",
        boxSizing:
          "border-box",
        padding,
        ...style,
      }}
    >
      <img
        src={
          src
        }
        alt={
          alt
        }
        style={{
          display:
            "block",
          width:
            "100%",
          height:
            "100%",
          minWidth: 0,
          minHeight: 0,
          maxWidth:
            "100%",
          maxHeight:
            "100%",
          objectFit:
            "contain",
          borderRadius:
            "50%",
        }}
      />
    </span>
  );
}
