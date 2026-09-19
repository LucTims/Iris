import type { Metadata } from "next";
import LegalPageLayout, { LegalSection } from "@/components/LegalPageLayout";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation | Iris",
  description:
    "Les règles d'utilisation d'Iris : compte, pièces et paiements, propriété des écrits, usage de l'IA, responsabilités et résiliation.",
};

/**
 * Conditions générales d'utilisation.
 *
 * Le contenu décrit l'économie réellement en place : des pièces prépayées non
 * remboursables, débitées à chaque appel IA, sans abonnement récurrent. La
 * version précédente évoquait des « abonnements résiliables depuis le tableau
 * de bord », qui n'existent pas dans le produit.
 */
export default function TermsPage() {
  return (
    <LegalPageLayout
      title="Conditions générales d'utilisation"
      subtitle="Les règles du jeu entre vous et Iris : ce que le service vous garantit, ce qu'il attend de vous, et comment fonctionnent les pièces."
      updatedAt="19 septembre 2026"
      activeHref="/terms"
    >
      <p className="text-neutral-800 dark:text-neutral-200 font-semibold">
        En résumé : vous achetez des pièces, vous les dépensez quand vous générez du
        texte ou des images, et tout ce que vous écrivez vous appartient. Les pièces ne
        se périment pas, mais ne sont pas remboursables une fois consommées.
      </p>

      <LegalSection number={1} title="Objet et acceptation">
        <p>
          Iris est une plateforme d&apos;écriture assistée par intelligence artificielle
          éditée par <strong>Boom</strong>, permettant de structurer, rédiger, illustrer
          et exporter des livres. En créant un compte, vous acceptez les présentes
          conditions. Si vous les refusez, n&apos;utilisez pas le service.
        </p>
        <p>
          Ces conditions se lisent avec notre{" "}
          <a href="/privacy" className="text-secondary font-semibold underline underline-offset-2">
            politique de confidentialité
          </a>
          , qui en fait partie intégrante.
        </p>
      </LegalSection>

      <LegalSection number={2} title="Votre compte">
        <p>
          Vous devez avoir au moins 16 ans et fournir une adresse e-mail valide. Vous
          êtes responsable de la confidentialité de vos identifiants et de toute activité
          réalisée depuis votre compte. Un compte est personnel : le partager, c&apos;est
          donner à un tiers un accès complet à vos manuscrits et à vos pièces.
        </p>
        <p>
          Prévenez-nous sans délai si vous soupçonnez un accès non autorisé.
        </p>
      </LegalSection>

      <LegalSection number={3} title="Les pièces : comment ça marche">
        <p>
          Iris ne fonctionne pas par abonnement. Vous achetez des{" "}
          <strong>pièces</strong>, une monnaie interne prépayée, et chaque action
          faisant appel à l&apos;intelligence artificielle en consomme un certain nombre.
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Tarif connu d&apos;avance.</strong> Le coût d&apos;un chapitre dépend
            du nombre de pages produites et du modèle choisi ; le devis vous est présenté
            avant de lancer la génération. Vous ne manipulez jamais de « jetons » : le
            prix est exprimé en pièces.
          </li>
          <li>
            <strong>Débit au succès.</strong> Les pièces sont prélevées lorsque la
            génération a produit un résultat. Un appel qui échoue pour une panne de notre
            côté ne vous est pas facturé.
          </li>
          <li>
            <strong>Pas de découvert.</strong> Si votre solde est insuffisant, la
            génération est refusée avant d&apos;être lancée.
          </li>
          <li>
            <strong>Pas d&apos;expiration.</strong> Vos pièces restent acquises tant que
            votre compte est actif.
          </li>
          <li>
            <strong>Aucune valeur monétaire.</strong> Les pièces ne sont ni
            convertibles en argent, ni transférables à un autre compte, ni revendables.
          </li>
        </ul>
        <p>
          Nous pouvons faire évoluer la grille tarifaire. Une évolution ne s&apos;applique
          jamais rétroactivement aux pièces déjà achetées ; seules les générations
          postérieures suivent le nouveau tarif.
        </p>
      </LegalSection>

      <LegalSection number={4} title="Paiement et remboursement">
        <p>
          Les paiements sont traités par nos prestataires agréés. Le montant est dû à la
          commande, et vos pièces sont créditées dès confirmation du paiement.
        </p>
        <p>
          Les pièces constituent un contenu numérique fourni immédiatement.{" "}
          <strong>
            Les pièces déjà consommées ne sont pas remboursables
          </strong>
          . Si vous n&apos;avez utilisé aucune pièce d&apos;un achat, contactez-nous dans
          les quatorze jours : nous procéderons au remboursement de cet achat.
        </p>
        <p>
          Si des pièces vous ont été débitées sans contrepartie — une génération facturée
          mais jamais livrée, un double prélèvement — signalez-le-nous : nous
          recréditerons votre compte après vérification de notre journal de transactions.
        </p>
      </LegalSection>

      <LegalSection number={5} title="Propriété de ce que vous écrivez">
        <p>
          <strong>Vos livres vous appartiennent, intégralement.</strong> Nous ne
          revendiquons aucun droit sur les textes, plans, chapitres et visuels produits
          dans Iris, qu&apos;ils soient écrits de votre main ou générés avec
          l&apos;assistance de l&apos;IA. Vous pouvez les publier, les vendre, les
          adapter et les exporter librement, sans royalties ni mention obligatoire. Les
          fichiers exportés ne portent aucune marque de fabrique.
        </p>
        <p>
          En contrepartie, vous nous accordez l&apos;autorisation technique strictement
          nécessaire à l&apos;exécution du service : stocker votre contenu, l&apos;afficher
          dans votre éditeur, et le transmettre au fournisseur d&apos;IA que vous
          sélectionnez pour produire ce que vous demandez.
        </p>
        <p>
          Vous garantissez détenir les droits sur ce que vous importez dans Iris —
          documents de référence, photographies, dessins. Importer l&apos;œuvre
          d&apos;autrui sans autorisation relève de votre seule responsabilité.
        </p>
      </LegalSection>

      <LegalSection number={6} title="Ce que l'IA peut et ne peut pas faire">
        <p>
          L&apos;intelligence artificielle est un outil d&apos;écriture, pas une source
          d&apos;autorité. Vous devez garder deux limites à l&apos;esprit :
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Elle peut se tromper.</strong> Un modèle peut énoncer avec assurance
            un fait inexact, une date fausse ou une citation inventée.{" "}
            <strong>
              Vérifiez toute information factuelle avant publication
            </strong>{" "}
            — en particulier les chiffres, les noms propres, les références juridiques,
            médicales ou financières.
          </li>
          <li>
            <strong>Elle peut produire des textes similaires.</strong> Deux auteurs
            partant de consignes proches peuvent obtenir des formulations voisines. Nous
            ne garantissons pas l&apos;originalité absolue d&apos;un texte généré, ni son
            éligibilité à une protection par le droit d&apos;auteur, qui varie selon les
            pays et selon votre apport personnel.
          </li>
        </ul>
        <p>
          Vous restez l&apos;auteur et le responsable éditorial de ce que vous publiez.
        </p>
      </LegalSection>

      <LegalSection number={7} title="Usages interdits">
        <p>Vous vous engagez à ne pas utiliser Iris pour produire ou diffuser :</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            des contenus illégaux, haineux, diffamatoires, ou incitant à la violence ou à
            la discrimination ;
          </li>
          <li>
            des contenus sexuels impliquant des mineurs, ou toute représentation
            d&apos;abus sur mineurs ;
          </li>
          <li>
            des contenus destinés à tromper autrui sur l&apos;identité d&apos;une
            personne réelle, ou à usurper son nom ;
          </li>
          <li>
            des contenus violant les droits de propriété intellectuelle de tiers ;
          </li>
          <li>
            des campagnes de désinformation, d&apos;hameçonnage ou de manipulation
            électorale.
          </li>
        </ul>
        <p>
          Vous vous engagez également à ne pas tenter de contourner les limites du
          service : automatiser des requêtes pour dépasser les plafonds, sonder ou
          exploiter une faille, accéder aux données d&apos;un autre utilisateur, ou
          revendre l&apos;accès à votre compte.
        </p>
      </LegalSection>

      <LegalSection number={8} title="Connexions externes (MCP)">
        <p>
          Iris vous permet de connecter un assistant IA externe à votre bibliothèque. La
          clé que vous générez donne à cet outil un accès en lecture et en écriture à vos
          livres, et lui permet de dépenser vos pièces.{" "}
          <strong>Vous êtes responsable des outils que vous connectez</strong> et des
          actions qu&apos;ils réalisent en votre nom. Révoquez la clé dès que vous
          n&apos;utilisez plus une connexion.
        </p>
      </LegalSection>

      <LegalSection number={9} title="Disponibilité du service">
        <p>
          Nous nous efforçons de maintenir Iris disponible en permanence, sans pouvoir le
          garantir. Le service peut être interrompu pour maintenance, incident technique,
          ou défaillance d&apos;un fournisseur tiers — notamment les fournisseurs
          d&apos;IA, dont les pannes ne dépendent pas de nous. Lorsqu&apos;un fournisseur
          est indisponible, Iris bascule automatiquement sur un autre afin que votre
          génération aboutisse malgré tout ; le modèle réellement utilisé vous est alors
          facturé.
        </p>
        <p>
          Nous pouvons faire évoluer les fonctionnalités, en ajouter ou en retirer. Le
          retrait d&apos;une fonctionnalité majeure fait l&apos;objet d&apos;une
          information préalable.
        </p>
      </LegalSection>

      <LegalSection number={10} title="Sauvegarde de vos écrits">
        <p>
          Vos livres sont sauvegardés sur notre infrastructure et vous pouvez les
          exporter à tout moment. Nous vous recommandons néanmoins d&apos;
          <strong>exporter régulièrement vos manuscrits importants</strong> et de les
          conserver de votre côté : aucune plateforme, la nôtre comprise, ne remplace une
          copie personnelle.
        </p>
      </LegalSection>

      <LegalSection number={11} title="Responsabilité">
        <p>
          Iris est fourni en l&apos;état. Dans les limites permises par la loi, notre
          responsabilité ne saurait être engagée pour les pertes indirectes : manque à
          gagner, perte d&apos;audience, préjudice commercial ou de réputation résultant
          d&apos;un contenu que vous avez publié.
        </p>
        <p>
          En tout état de cause, notre responsabilité totale est plafonnée au montant que
          vous nous avez versé au cours des douze mois précédant le fait générateur.
        </p>
        <p>
          Aucune stipulation des présentes ne limite les droits que la loi vous reconnaît
          de manière impérative en qualité de consommateur.
        </p>
      </LegalSection>

      <LegalSection number={12} title="Suspension et résiliation">
        <p>
          Vous pouvez cesser d&apos;utiliser Iris à tout moment et demander la
          suppression de votre compte. Puisqu&apos;il n&apos;y a pas d&apos;abonnement,
          il n&apos;y a rien à résilier : sans achat, rien ne vous est prélevé.
        </p>
        <p>
          Nous pouvons suspendre ou fermer un compte en cas de manquement caractérisé aux
          présentes conditions, notamment aux usages interdits, ou de fraude au paiement.
          Sauf manquement grave ou obligation légale, nous vous en informons au préalable
          et vous laissons la possibilité d&apos;exporter vos écrits.
        </p>
      </LegalSection>

      <LegalSection number={13} title="Modification des conditions">
        <p>
          Ces conditions peuvent évoluer avec le service. La date de dernière mise à jour
          figure en tête de page. Une modification substantielle vous est signalée dans
          l&apos;application ; poursuivre l&apos;utilisation du service après cette
          information vaut acceptation.
        </p>
      </LegalSection>

      <LegalSection number={14} title="Droit applicable et litiges">
        <p>
          Les présentes conditions sont régies par le droit applicable au siège de
          l&apos;éditeur. En cas de différend, nous vous invitons à nous contacter
          d&apos;abord : la très grande majorité des litiges se règle par un échange. À
          défaut d&apos;accord amiable, le litige relève des juridictions compétentes,
          sans préjudice des règles protectrices applicables aux consommateurs.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
