import { LoginForm } from "@/components/admin/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[100svh] w-full bg-[#121212] font-sans text-white md:grid md:grid-cols-2">
      {/* Left Column - Branding */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-[#121212] p-10 md:p-16 lg:p-24">
        {/* Background Decorative Circles */}
        <div className="absolute -bottom-[20%] -left-[10%] h-[120%] w-[120%] rounded-full border border-white/5 opacity-50" />
        <div className="absolute -bottom-[10%] -left-[5%] h-[100%] w-[100%] rounded-full border border-[#D4AF37]/10" />
        <div className="absolute bottom-[0%] left-[0%] h-[80%] w-[80%] rounded-full border border-[#D4AF37]/20" />
        <div className="absolute bottom-[10%] left-[5%] h-[60%] w-[60%] rounded-full border border-[#D4AF37]/30" />

        {/* Gradient Overlay */}
        <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-[#D4AF37]/20 via-transparent to-transparent opacity-30" />

        <div className="relative z-10 flex flex-col">
          {/* Logo */}
          <div className="mb-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Clean<span className="text-[#C8A04C]">7</span>
            </h2>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-white/50">
              Premium care, delivered with elegance
            </p>
          </div>

          <div className="mt-32 max-w-md">
            <h1 className="text-6xl font-serif font-medium leading-tight tracking-tight text-white md:text-7xl">
              Hello
              <br />
              <span className="text-[#C8A04C]">Admin!</span>
            </h1>
            <div className="my-8 h-[2px] w-12 bg-[#C8A04C]"></div>
            <p className="text-lg leading-relaxed text-white/70">
              Manage operations, track performance, and deliver excellence every
              day. Welcome back!
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-auto pt-20">
          <p className="text-sm text-white/50">
            © 2026 <span className="text-[#C8A04C]">Clean7</span>. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex flex-col justify-center bg-[#18181B] p-10 md:p-16 lg:p-24 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-20">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <div className="mb-6 h-[2px] w-8 bg-[#C8A04C]"></div>
            <h2 className="text-4xl font-serif text-white">Admin Login</h2>
            <p className="mt-3 text-sm text-white/60">
              Please sign in to continue to your dashboard
            </p>
          </div>

          <LoginForm />

          <div className="mt-8 rounded-lg border border-[#C8A04C]/20 bg-[#121212] p-4">
            <p className="text-xs font-semibold text-[#C8A04C]">
              Developer Login Hint:
            </p>
            <p className="mt-1 text-xs text-white/60">Email: admin@gmail.com</p>
            <p className="text-xs text-white/60">Password: admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
