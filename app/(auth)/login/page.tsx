import { LoginForm } from "@/components/admin/login-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <div className="grid min-h-[100svh] w-full grid-cols-1 bg-black font-sans text-white md:grid-cols-2">
      {/* Left Column - Branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-black px-8 pb-8 pt-6 md:flex md:px-16 md:pb-16 md:pt-10 lg:px-24 lg:pb-24 lg:pt-12">
        {/* Background Decorative Circles */}
        <div className="absolute -bottom-[20%] -left-[10%] h-[120%] w-[120%] rounded-full border border-white/5 opacity-50" />
        <div className="absolute -bottom-[10%] -left-[5%] h-[100%] w-[100%] rounded-full border border-[#D4AF37]/10" />
        <div className="absolute bottom-[0%] left-[0%] h-[80%] w-[80%] rounded-full border border-[#D4AF37]/20" />
        <div className="absolute bottom-[10%] left-[5%] h-[60%] w-[60%] rounded-full border border-[#D4AF37]/30" />

        {/* Gradient Overlay */}
        <div className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-[#D4AF37]/20 via-transparent to-transparent opacity-30" />

        <div className="relative z-10 flex flex-col">
          {/* Logo */}
          <div className="mb-2 flex items-center gap-3">
            <Image
              src="/images/logo/logo.png"
              alt="Clean7 Logo"
              width={48}
              height={48}
              className="h-10 w-auto md:h-12"
              style={{ width: "auto" }}
            />
            <div>
              <h2 className="text-2xl font-bold leading-none tracking-tight text-white md:text-3xl">
                Clean<span className="text-[#C8A04C]">7</span>
              </h2>
              <p className="mt-1 text-[8px] uppercase tracking-widest text-white/50 md:text-[10px]">
                Premium care, delivered with elegance
              </p>
            </div>
          </div>

          <div className="mt-12 max-w-md md:mt-24">
            <h1 className="text-5xl font-serif font-medium leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
              Hello
              <br />
              <span className="text-[#C8A04C]">Admin!</span>
            </h1>
            <div className="my-6 h-[2px] w-12 bg-[#C8A04C] md:my-8"></div>
            <p className="text-base leading-relaxed text-white/70 md:text-lg">
              Manage operations, track performance, and deliver excellence every
              day. Welcome back!
            </p>
          </div>
        </div>

        <div className="relative z-10 mt-16 pt-8 md:mt-auto md:pt-20">
          <p className="text-xs text-white/50 md:text-sm">
            © 2026 <span className="text-[#C8A04C]">Clean7</span>. All rights
            reserved.
          </p>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex flex-col justify-center bg-black p-8 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] z-20 md:p-16 lg:p-24">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Branding */}
          <div className="mb-10 flex items-center gap-3 md:hidden">
            <Image
              src="/images/logo/logo.png"
              alt="Clean7 Logo"
              width={48}
              height={48}
              className="h-10 w-auto"
              style={{ width: "auto" }}
            />
            <div>
              <h2 className="text-2xl font-bold leading-none tracking-tight text-white">
                Clean<span className="text-[#C8A04C]">7</span>
              </h2>
              <p className="mt-1 text-[8px] uppercase tracking-widest text-white/50">
                Premium care, delivered with elegance
              </p>
            </div>
          </div>

          <div className="mb-8">
            <div className="mb-6 h-[2px] w-8 bg-[#C8A04C]"></div>
            <h2 className="text-3xl font-serif text-white md:text-4xl">
              Admin Login
            </h2>
            <p className="mt-2 text-xs text-white/60 md:mt-3 md:text-sm">
              Please sign in to continue to your dashboard
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
