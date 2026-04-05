import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../hooks/theme-provider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata = {
  title: "Nolan A.I Studio",
  description: "The Ethereal Manuscript - Creative AI Storytelling",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
