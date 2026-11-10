import AuthPreview from '@/components/AuthPreview'
import Mascot from '@/components/Mascot'

function Brand({ onMint = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <Mascot className="size-9" />
      <span
        className={`text-lg font-medium tracking-tight ${onMint ? 'text-[#0E2B26] dark:text-foreground' : ''}`}
      >
        CuraBot
      </span>
    </div>
  )
}

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="hidden bg-[#EAF6F2] px-10 py-10 lg:flex dark:bg-[#101C19]">
        <div className="rise mx-auto flex w-full max-w-[440px] flex-col">
          <Brand onMint />
          <div className="my-auto">
            <h2 className="text-[28px] leading-[1.25] font-medium text-[#0E2B26] dark:text-foreground">
              Bot yang membalas pelanggan dan mencatat pesanan
            </h2>
            <AuthPreview className="mt-8" />
          </div>
        </div>
      </aside>

      <main className="flex items-start justify-center px-5 py-14 sm:px-8 lg:items-center">
        <div className="rise w-full max-w-[420px]">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
