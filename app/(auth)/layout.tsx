export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
      style={{ background: "var(--gradient-auth-bg)" }}
    >
      {children}
    </div>
  );
}
