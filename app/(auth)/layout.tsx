import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen w-full justify-end font-inter bg-gradient-to-br from-gray-900 via-emerald-900/20 to-gray-900">
      {children}
    </main>
  );
}
