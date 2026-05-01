import { WhatsappLayout } from "../../components/whatsapp/whatsapp-layout"
import type { ReactNode } from "react"

export default function WhatsappRootLayout({
  children
}: Readonly<{
  children: ReactNode
}>) {
  return <WhatsappLayout>{children}</WhatsappLayout>
}
