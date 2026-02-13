export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "min-h-dvh bg-bg-primary " +
        "px-3 sm:px-6 " +
        "pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-[calc(1.5rem+env(safe-area-inset-top))] " +
        "pb-[calc(2rem+env(safe-area-inset-bottom))] sm:pb-[calc(3rem+env(safe-area-inset-bottom))]"
      }
    >
      {children}
    </div>
  );
}
