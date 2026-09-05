import type {Metadata} from "next";
import "./globals.css";
export const metadata:Metadata={title:"DarKness League",description:"Plataforma oficial da competição feminina de Free Fire DarKness League.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><head><link rel="preload" href="/images/darkness-goddess.webp" as="image" type="image/webp" fetchPriority="high"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/></head><body>{children}</body></html>}
