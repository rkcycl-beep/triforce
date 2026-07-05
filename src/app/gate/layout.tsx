export const metadata = {
  title: "TriForce — בחר תפקיד",
};

export default function GateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f8faf9]">
      {children}
    </div>
  );
}
