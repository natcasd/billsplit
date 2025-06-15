import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SplitCheck - Easy Bill Splitting",
  description: "Split bills with friends and colleagues effortlessly",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="fixed top-0 left-0 right-0 bg-white shadow-sm z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-indigo-600">SplitCheck</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="pt-16 min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
