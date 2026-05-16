import { Logo } from "~/components/logo";
import { WebGLSwirl } from "~/components/webgl-swirl";

export default function LandingPage() {
  return (
    <div class="min-h-screen flex flex-col overflow-x-hidden bg-ink text-white font-mono">
      <nav class="w-full flex items-center justify-between px-6 py-8 md:px-12 xl:px-20 relative z-20">
        <div class="flex items-center gap-3">
          <Logo size={28} detail />
          <span class="label text-white">Vulf</span>
        </div>
        <div class="flex gap-4">
          <a
            href="/login"
            class="inline-flex items-center justify-center px-6 py-2.5 text-xs font-medium uppercase tracking-[0.1em] rounded-sm bg-cyan text-black transition-colors duration-300 hover:bg-white whitespace-nowrap"
          >
            Log In
          </a>
        </div>
      </nav>

      <main class="flex-grow flex flex-col lg:flex-row items-center justify-between px-6 py-12 md:px-12 xl:px-20 max-w-[1800px] mx-auto w-full relative z-10">
        <div class="w-full lg:w-1/2 flex flex-col items-start justify-center pt-8 lg:pt-0 lg:pr-12 xl:pr-24">
          <div class="flex items-center gap-3 mb-8 label text-gray-300 tracking-[0.2em]">
            <div class="w-2.5 h-2.5 bg-cyan" />
            Intelligence Platform
          </div>

          <h1 class="display-title text-5xl md:text-[5rem] xl:text-[6rem] mb-8">
            Automate your
            <br />
            org intelligence.
          </h1>

          <p class="text-sm md:text-base leading-[1.8] mb-12 max-w-lg tracking-tight text-gray-400">
            Upload a list of organizations, walk away. Vulf filters active companies and fetches
            their provider data automatically at scale.
          </p>

          <div class="flex flex-col sm:flex-row gap-4">
            <a
              href="/login"
              class="inline-flex items-center justify-center px-8 py-3.5 text-xs font-medium uppercase tracking-[0.1em] rounded-sm bg-cyan text-black transition-colors duration-300 hover:bg-white whitespace-nowrap"
            >
              Get Started
            </a>
          </div>
        </div>

        <div class="w-full lg:w-1/2 h-[50vh] lg:h-[80vh] flex items-center justify-center mt-16 lg:mt-0 relative">
          <div class="relative w-full max-w-[700px] aspect-square flex items-center justify-center mix-blend-screen opacity-90">
            <WebGLSwirl class="w-full h-full object-contain pointer-events-none" />
          </div>
        </div>
      </main>

      <footer class="px-6 py-8 md:px-12 xl:px-20 section-label">
        © {new Date().getFullYear()} Vulf
      </footer>
    </div>
  );
}
