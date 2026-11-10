/**
 * Maskot CuraBot: badan putih + kacamata, dua aset terpisah yang ditumpuk
 * (viewBox sama, jadi pas tanpa offset). Dipakai sebagai avatar bot dan
 * penanda brand, sama seperti di halaman detail bot.
 */
export default function Mascot({ className = 'size-9' }) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#0B7A69] dark:bg-[#14B89C] ${className}`}
    >
      <img
        src="/mascot-body.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full scale-110"
      />
      <img
        src="/mascot-glass.svg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full scale-110"
      />
    </span>
  )
}
