import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pozvánka do Pivníku",
  robots: {
    index: false,
    follow: false,
  },
};

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://nsnvryyocwzfwxiwhqca.supabase.co";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token);

  return (
    <main className="min-h-svh bg-[#130d09] px-5 py-10 text-[#f4eadc]">
      <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center">
        <section className="w-full rounded-3xl border border-amber-500/20 bg-[#20150e] p-7 shadow-2xl">
          <div className="mb-5 text-4xl" aria-hidden="true">🍺</div>
          <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-amber-300">
            Pivník
          </p>
          <h1 className="mb-3 text-3xl font-black">Pozvánka do hospody</h1>
          {validToken ? (
            <>
              <p className="mb-6 leading-7 text-[#cbb9a8]">
                Správce ti předal pozvánku do Pivníku. Pokračuj jen tehdy, pokud
                jsi QR kód nebo odkaz dostal přímo od něj.
              </p>
              <form
                action={SUPABASE_URL + "/functions/v1/redeem-invitation"}
                method="post"
              >
                <input type="hidden" name="token" value={token} />
                <button
                  type="submit"
                  className="w-full rounded-xl bg-amber-400 px-5 py-3.5 text-base font-black text-[#1a1009] transition hover:bg-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-[#20150e]"
                >
                  Přijmout pozvánku
                </button>
              </form>
              <p className="mt-4 text-xs leading-5 text-[#9f8b7a]">
                Samotné otevření této stránky účet nepotvrdilo. Pozvánka se ověří
                až po stisknutí tlačítka.
              </p>
            </>
          ) : (
            <p className="leading-7 text-[#cbb9a8]">
              Tento pozvánkový odkaz nemá správný formát. Požádej správce o nový
              QR kód.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
