import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'EcoCity',
  description: 'Ecocity est un simulateur de planification urbaine où vous créez un réseau de transports écologiques pour réduire les émissions de CO2 et satisfaire les habitants. Gérez vos ressources, planifiez votre réseau et maintenez la satisfaction citoyenne.',
  generator: 'EcoCity Team',
  icons: {
    icon: '/icone.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
