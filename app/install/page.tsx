import type { Metadata } from "next";
import InstallClient from "./InstallClient";
import "./install.css";

export const metadata: Metadata = {
  title: "Nainstalovat Pivník",
  description: "Tvůj pivní deník přímo v telefonu. Jedna aplikace pro Android i iPhone.",
};

export default function InstallPage() {
  return <InstallClient />;
}
