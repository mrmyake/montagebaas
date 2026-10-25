import "server-only";
import { laadTarieven } from "@/lib/tarieven";
import { prijsbronUitTarieven, type Prijsbron } from "@/lib/prijs-weergave";

/**
 * De Prijsbron uit de actieve tarievenrij, voor server components en routes.
 * Pagina's die hem gebruiken zetten `revalidate`, zodat een nieuwe tarievenrij
 * zonder deploy binnen het uur op de site staat.
 */
export async function laadPrijsbron(): Promise<Prijsbron> {
  const { id, tarieven } = await laadTarieven(null);
  return prijsbronUitTarieven(id, tarieven);
}

/** Herberekeningstermijn (s) voor pagina's met bedragen. */
export const PRIJS_REVALIDATE = 3600;
