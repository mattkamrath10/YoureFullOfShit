import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#f97316",
          color: "#09090b",
          display: "flex",
          fontFamily: "sans-serif",
          fontSize: 270,
          fontWeight: 900,
          height: "100%",
          justifyContent: "center",
          letterSpacing: -30,
          width: "100%",
        }}
      >
        Y!
      </div>
    ),
    size,
  );
}
