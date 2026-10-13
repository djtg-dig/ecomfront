import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
const source=(path:string)=>readFileSync(resolve(process.cwd(),path),"utf8");
describe("shells de l’espace privé",()=>{
 it("sépare le shell personnel du shell entreprise",()=>{const shell=source("src/components/private/private-shell.tsx");expect(shell).toContain("PersonalShell");expect(shell).toContain("BusinessShell");expect(shell).toContain('label: "Accueil"');expect(shell).toContain('label: "Mes entreprises"');expect(shell).toContain('label: "Paramètres du compte"');expect(shell).toContain("Retour à mon espace");expect(shell).toContain("<LogoutButton />");expect(shell).not.toContain("PrivateBusinessProvider");});
 it("garde le tableau de bord personnel indépendant des entreprises",()=>{const dashboard=source("src/components/private/private-dashboard.tsx");expect(dashboard).toContain("Votre compte fonctionne indépendamment");expect(dashboard).toContain("/espace/entreprises");expect(dashboard).not.toContain("usePrivateBusiness");});
 it("réserve la création à la page dédiée et l’entrée à une action explicite",()=>{const list=source("src/components/businesses/business-manager.tsx");expect(list).toContain('href="/espace/entreprises/nouvelle"');expect(list).toContain("Entrer dans l’entreprise");expect(list).toContain("BusinessCreate");expect(source("src/app/(private)/espace/entreprises/nouvelle/page.tsx")).toContain("<BusinessCreate />");});
});
