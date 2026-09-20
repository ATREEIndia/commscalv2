
import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Analytics } from "@vercel/analytics/next"

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Login from "./Components/Login";
import { MyAppContextProvider } from "./Context/MyAppContext";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CommsCal App",
  description: "App for managing communications social media calendar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

   






  return (
    <html lang="en">
      <body 
        className={`${geistSans.variable} ${geistMono.variable} antialiased  bg-gray-50   `   }
      >
        <MyAppContextProvider>

        
        <div className=" absolute top-0 right-0 items-center flex justify-around gap-4 shadow-lg ">
            <Login/>
        </div>
      
        {children}
        <GoogleAnalytics gaId="G-68ZR365C06" />
         <Analytics />
        </MyAppContextProvider>
      </body>
    </html>
  );
}
