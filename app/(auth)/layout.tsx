import Image from "next/image";
import AuthBackground from "@/components/AuthBackground";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative min-h-screen w-full font-inter overflow-hidden">
      <AuthBackground />
      <div className="relative z-10">
        {children}
      </div>
    </main>
  );
}
