const LOGO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDRIGpaO5cyb72DuJFWmg7fxWR7x5H7FjUvJxjSPmGdAW8shR6cA3TIXynNwyAPvO5vV1K-Dwevw6XOSfPt-cMfFBA_bKImJDdmHNDekxBlxycmkG4ypq8lKktpdqH9KVy_aPMeS4PYPlbzeVFYIXqMy9wKri37ZUUZmdsSSAsP6dsweDFkmpKG6zV383BMuZn4iHw_31fDfw_t_7tEgUtcz0AXKxKaNuNl17EIb3e0jmXY9f7XZfKF0b6qwVyPoCZD7XkI9f7HOE2q'

type LoadingScreenProps = {
  /** When true, fade out and allow pointer events through */
  fading?: boolean
}

/**
 * Full-viewport splash while catalog loads from Neon.
 */
export function LoadingScreen({ fading = false }: LoadingScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#fbf8fc] transition-opacity duration-500 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      aria-busy={!fading}
      aria-live="polite"
      role="status"
    >
      <div className="flex flex-col items-center gap-6 px-6">
        <img
          src={LOGO_URL}
          alt="Belkson"
          className="w-20 h-20 sm:w-24 sm:h-24 object-contain select-none"
          draggable={false}
        />
        <div className="text-center">
          <p className="font-[Quicksand,sans-serif] text-3xl sm:text-4xl font-bold tracking-tight text-[#6f2879]">
            Belkson
          </p>
          <p className="mt-2 text-sm text-[#4f434e]/80 font-[Quicksand,sans-serif]">
            Загружаем каталог…
          </p>
        </div>

        <div
          className="h-10 w-10 rounded-full border-[3px] border-[#e6dff8] border-t-[#6f2879] animate-spin"
          aria-hidden
        />
      </div>
    </div>
  )
}
