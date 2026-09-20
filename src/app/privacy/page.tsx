import type { Metadata } from "next";
import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Iris",
  description:
    "Quelles données Iris collecte, pourquoi, où elles sont hébergées, avec qui elles sont partagées et comment exercer vos droits.",
};

/**
 * Politique de confidentialité.
 *
 * Le contenu décrit les traitements RÉELLEMENT en place dans le produit :
 * hébergement Supabase en Irlande, fournisseurs d'IA effectivement appelés
 * (Google, OpenAI, Anthropic), prestataires de paiement (SEBPay, Chariow),
 * mesure d'audience Google Analytics, compartiments de stockage en lecture
 * publique, et clés MCP conservées sous forme d'empreinte SHA-256.
 */
export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Politique de confidentialité"
      subtitle="Ce document explique quelles données Iris collecte, pourquoi, combien de temps elles sont conservées, qui y a accès et comment reprendre la main dessus à tout moment."
      updatedAt="19 septembre 2026"
      activeHref="/privacy"
    >
      <p className="text-neutral-800 font-semibold">
        En résumé : vos manuscrits vous appartiennent. Iris ne les vend pas, ne les
        publie pas et ne s&apos;en sert pas pour entraîner des modèles d&apos;IA. Les
        données collectées servent à faire fonctionner le service que vous utilisez —
        rien de plus.
      </p>

      <LegalSection number={1} title="Qui est responsable de vos données">
        <p>
          Le service Iris est édité par <strong>Boom</strong>, qui agit comme responsable
          du traitement des données personnelles décrites ici. Pour toute question
          relative à vos données, écrivez-nous depuis la page de contact du site : nous
          répondons sous trente jours au plus.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Les données que nous collectons">
        <p>Nous distinguons quatre familles de données, aux finalités distinctes.</p>

        <div className="space-y-4 pt-1">
          <div>
            <h3 className="font-bold text-neutral-900">
              a. Données de compte
            </h3>
            <p>
              Adresse e-mail, nom ou nom de plume, et, si vous les renseignez, votre
              biographie d&apos;auteur, votre avatar et vos liens publics (site web, X,
              page Amazon). Ces informations servent à vous identifier, à sécuriser votre
              compte et à afficher votre identité d&apos;auteur dans l&apos;application.
              Votre mot de passe n&apos;est jamais stocké en clair : il est haché par
              notre fournisseur d&apos;authentification, et nous ne pouvons pas le lire.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-neutral-900">
              b. Contenu que vous créez
            </h3>
            <p>
              Titres, synopsis, plans, chapitres, personnages, consignes de rédaction,
              couvertures, images importées et documents de référence que vous analysez.
              C&apos;est le cœur du service : ces données sont stockées pour que vous
              retrouviez vos livres d&apos;une session à l&apos;autre et depuis
              n&apos;importe quel appareil.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-neutral-900">
              c. Données d&apos;usage et de facturation
            </h3>
            <p>
              Historique de vos générations IA (date, action, modèle utilisé, projet
              concerné), mouvements de votre portefeuille de pièces, et transactions
              d&apos;achat. Ces données servent à vous facturer correctement, à vous
              montrer où passent vos pièces, et à détecter les abus. Elles constituent
              également notre preuve comptable en cas de litige sur un paiement.
            </p>
          </div>

          <div>
            <h3 className="font-bold text-neutral-900">
              d. Données techniques
            </h3>
            <p>
              Journaux serveur (adresse IP, horodatage, page appelée, code de réponse) et
              mesure d&apos;audience. Ils nous permettent de diagnostiquer les pannes, de
              limiter les abus automatisés et de comprendre quelles fonctionnalités sont
              réellement utilisées.
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection number={3} title="Vos écrits et l'entraînement des modèles">
        <p>
          <strong>
            Nous n&apos;utilisons jamais vos manuscrits pour entraîner un modèle
            d&apos;intelligence artificielle
          </strong>
          , ni le nôtre ni celui d&apos;un tiers, et nous ne les cédons à personne à
          cette fin.
        </p>
        <p>
          Quand vous demandez une génération, le texte nécessaire — votre synopsis, le
          plan du livre, les chapitres précédents, et les images que vous avez importées
          pour un storybook — est transmis au fournisseur d&apos;IA que vous avez choisi
          afin qu&apos;il produise le texte demandé. Nous faisons appel à ces
          fournisseurs via leurs offres professionnelles, dont les conditions excluent la
          réutilisation des contenus transmis pour l&apos;entraînement. Nous ne
          contrôlons toutefois pas leur infrastructure : si la confidentialité absolue
          d&apos;un manuscrit est critique pour vous, n&apos;en confiez pas la rédaction
          à une IA, quel que soit le service.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Propriété de vos créations">
        <p>
          Les textes, plans, chapitres et visuels produits dans Iris — que vous les ayez
          écrits vous-même ou générés avec l&apos;assistance de l&apos;IA — restent{" "}
          <strong>votre propriété exclusive</strong>. Vous êtes libre de les publier, de
          les vendre, de les modifier et de les exporter, sans nous devoir quoi que ce
          soit et sans mention de notre part. Les fichiers que vous exportez (PDF, DOCX,
          EPUB, Markdown) ne portent aucune marque de fabrique.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Où vos données sont hébergées">
        <p>
          Votre compte, vos livres et vos fichiers sont hébergés chez{" "}
          <strong>Supabase</strong>, dans un centre de données situé en{" "}
          <strong>Irlande (Union européenne)</strong>. L&apos;application elle-même est
          servie par <strong>Vercel</strong> via un réseau de diffusion mondial : la page
          peut être servie depuis un serveur proche de vous, mais vos données restent
          stockées dans l&apos;Union européenne.
        </p>
        <p>
          Les fournisseurs d&apos;IA et de paiement auxquels nous faisons appel peuvent
          traiter certaines données hors de l&apos;Union européenne, notamment aux
          États-Unis. Ces transferts reposent sur les clauses contractuelles types de la
          Commission européenne ou sur un cadre d&apos;adéquation équivalent.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Avec qui vos données sont partagées">
        <p>
          Nous ne vendons aucune donnée. Nous faisons appel aux sous-traitants suivants,
          strictement pour les fonctions indiquées :
        </p>
        <div className="overflow-x-auto -mx-1 px-1 pt-1">
          <table className="w-full text-xs border-collapse min-w-[520px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500">
                <th className="py-2 pr-4 font-bold">Sous-traitant</th>
                <th className="py-2 pr-4 font-bold">Rôle</th>
                <th className="py-2 font-bold">Données concernées</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {[
                ["Supabase", "Base de données, authentification, stockage", "Compte, livres, fichiers"],
                ["Vercel", "Hébergement de l'application", "Journaux techniques, adresse IP"],
                ["Google (Gemini)", "Génération de texte et d'images", "Contenu envoyé à la génération"],
                ["OpenAI", "Génération de texte et d'images", "Contenu envoyé à la génération"],
                ["Anthropic", "Génération de texte", "Contenu envoyé à la génération"],
                ["SEBPay, Chariow", "Encaissement des paiements", "E-mail, montant, référence"],
                ["Google Analytics", "Mesure d'audience", "Données de navigation"],
              ].map(([name, role, data]) => (
                <tr key={name}>
                  <td className="py-2 pr-4 font-bold text-neutral-800">{name}</td>
                  <td className="py-2 pr-4">{role}</td>
                  <td className="py-2">{data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pt-1">
          Nous pouvons également être tenus de communiquer des données sur réquisition
          d&apos;une autorité judiciaire compétente.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Paiements : ce que nous ne voyons jamais">
        <p>
          Les coordonnées de votre carte bancaire ou de votre compte mobile{" "}
          <strong>ne transitent jamais par nos serveurs</strong> et n&apos;y sont donc
          jamais enregistrées. Le paiement se déroule intégralement chez notre
          prestataire. Nous ne recevons en retour que la confirmation de la transaction :
          son montant, sa référence et son statut, afin de créditer vos pièces.
        </p>
        <p>
          Ces confirmations nous parviennent par des notifications signées
          cryptographiquement, que nous vérifions systématiquement avant de créditer quoi
          que ce soit : une notification dont la signature ne correspond pas est rejetée.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Images et fichiers publics">
        <p>
          Pour que vos couvertures et illustrations s&apos;affichent dans
          l&apos;éditeur, dans vos exports PDF et dans votre aperçu, les fichiers que
          vous importez sont servis depuis des adresses accessibles sans authentification.
          Ces adresses contiennent un identifiant aléatoire et ne sont pas indexées, mais
          <strong> toute personne à qui vous transmettez le lien peut voir l&apos;image</strong>.
          N&apos;importez donc pas de document dont la diffusion vous poserait problème.
          Le texte de vos chapitres, lui, n&apos;est jamais accessible publiquement.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Connexions MCP">
        <p>
          Si vous connectez un assistant IA externe à votre bibliothèque via MCP, la clé
          que vous générez donne à cet assistant un accès en lecture et en écriture à vos
          livres. Nous ne conservons de cette clé que son{" "}
          <strong>empreinte cryptographique (SHA-256)</strong> et un aperçu tronqué :
          nous sommes donc incapables de la reconstituer ou de vous la remontrer. Vous
          pouvez la révoquer à tout moment en en générant une nouvelle, ce qui invalide
          immédiatement la précédente.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Combien de temps nous conservons vos données">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Compte et contenu</strong> : tant que votre compte existe. La
            suppression d&apos;un projet efface définitivement ses chapitres et ses
            fichiers associés.
          </li>
          <li>
            <strong>Historique de facturation</strong> : conservé jusqu&apos;à dix ans
            après la transaction, conformément aux obligations comptables — y compris
            après la fermeture de votre compte.
          </li>
          <li>
            <strong>Journaux techniques</strong> : quelques semaines, puis suppression
            automatique.
          </li>
          <li>
            <strong>Compte supprimé</strong> : vos livres, fichiers et données de profil
            sont effacés, seules les écritures comptables anonymisées subsistent.
          </li>
        </ul>
      </LegalSection>

      <LegalSection number={11} title="Vos droits">
        <p>
          Conformément au Règlement général sur la protection des données, vous disposez
          d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité sur vos données. Concrètement :
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Consulter et corriger</strong> : directement depuis votre page Profil.
          </li>
          <li>
            <strong>Récupérer vos écrits</strong> : la fonction d&apos;export vous rend
            vos livres en PDF, DOCX, EPUB ou Markdown, sans restriction.
          </li>
          <li>
            <strong>Supprimer</strong> : chaque projet est supprimable depuis la liste de
            vos livres ; pour la suppression complète du compte, contactez-nous.
          </li>
        </ul>
        <p>
          Si notre réponse ne vous satisfait pas, vous pouvez saisir l&apos;autorité de
          protection des données de votre pays de résidence.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Sécurité">
        <p>
          Les échanges entre votre navigateur et Iris sont chiffrés (TLS). L&apos;accès
          aux données est cloisonné par compte au niveau de la base de données
          elle-même : une requête ne peut pas renvoyer les livres d&apos;un autre
          utilisateur, même en cas d&apos;erreur applicative. Les opérations sensibles —
          débit de pièces, crédit après paiement — sont atomiques et journalisées.
        </p>
        <p>
          Aucun système n&apos;est infaillible. En cas de violation de données
          susceptible d&apos;engendrer un risque pour vos droits, nous vous en
          informerons ainsi que l&apos;autorité compétente, dans les délais prévus par la
          réglementation.
        </p>
      </LegalSection>

      <LegalSection number={13} title="Cookies et mesure d'audience">
        <p>
          Iris dépose les cookies strictement nécessaires au maintien de votre session
          (sans eux, vous seriez déconnecté à chaque page). Nous utilisons par ailleurs
          Google Analytics pour mesurer la fréquentation de manière agrégée. Certaines
          préférences d&apos;interface — thème clair ou sombre, réglages
          d&apos;affichage — sont enregistrées localement dans votre navigateur et ne
          nous sont jamais transmises.
        </p>
      </LegalSection>

      <LegalSection number={14} title="Enfants">
        <p>
          Iris n&apos;est pas destiné aux personnes de moins de 16 ans. Si vous constatez
          qu&apos;un compte a été créé par un mineur sans autorisation parentale,
          signalez-le-nous : nous le supprimerons.
        </p>
      </LegalSection>

      <LegalSection number={15} title="Modifications de cette politique">
        <p>
          Nous pouvons faire évoluer ce document pour refléter des changements du service
          ou de la réglementation. La date de dernière mise à jour figure en tête de
          page. En cas de modification substantielle de la manière dont vos données sont
          traitées, nous vous en informerons dans l&apos;application avant
          l&apos;entrée en vigueur.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
