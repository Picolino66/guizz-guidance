import type { Metadata } from "next";
import "./globals.css";
import DevToolsMessage from "../components/devtools-message";

export const metadata: Metadata = {
  title: "Guidance Quiz Platform",
  description: "Plataforma de quiz corporativo com experiência premium, operação centralizada e ranking em tempo real."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <DevToolsMessage />
        {children}
      </body>
    </html>
  );
}
