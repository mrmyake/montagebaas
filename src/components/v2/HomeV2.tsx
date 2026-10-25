import { Intake } from "@/components/intake/Intake";
import { JsonLd } from "@/components/seo/JsonLd";
import { Faq, Kosten, Reviews, SlotCta, Vergelijk, Vertrouwensbalk, Werkgebied, Werkwijze, faqVragen } from "@/components/v2/Secties";
import { faqPageSchema } from "@/lib/schema";
import { huidigMerk, reviewSamenvatting, whatsappUrl } from "@/lib/merk";
import { laadPrijsbron } from "@/lib/prijs-bron";

/**
 * Homepage van de redesign: de configurator bovenaan, daarna de secties uit
 * docs/design/PrijsEerstLink.dc.html. `alleenIntake` = /offerte (zelfde intake,
 * zonder de lange pagina eronder).
 */
export async function HomeV2({ alleenIntake = false }: { alleenIntake?: boolean }) {
  const merk = huidigMerk();
  const bron = await laadPrijsbron();
  const vragen = faqVragen(merk, bron);
  return (
    <>
      <Intake
        merknaam={merk.naam}
        telefoon={merk.telefoon}
        whatsappUrl={whatsappUrl(merk)}
        reviewSamenvatting={reviewSamenvatting(merk)}
        bron={bron}
      />
      <Vertrouwensbalk merk={merk} />
      {!alleenIntake && (
        <>
          <JsonLd data={faqPageSchema(vragen.map((v) => ({ vraag: v.vraag, antwoord: v.antwoord })))} />
          <Kosten bron={bron} />
          <Vergelijk merk={merk} />
          <Werkwijze />
          <Reviews merk={merk} />
          <Werkgebied merk={merk} />
          <Faq vragen={vragen} />
          <SlotCta merk={merk} />
        </>
      )}
      {/* Ruimte voor de vaste prijsbalk onderin op mobiel */}
      <div aria-hidden="true" className="h-[84px] lg:hidden" />
    </>
  );
}
