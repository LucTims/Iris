import { generateDocx } from "./src/lib/export/generateDocx";
import fs from "fs";

async function run() {
  try {
    const chapters = [
      {
        number: 1,
        title: "Test Tableaux",
        content: `
          <h1>Titre de niveau 1</h1>
          <p>Voici un tableau de test avec colspan et rowspan :</p>
          <table>
            <tr>
              <th colspan="2">En-tête fusionné</th>
            </tr>
            <tr>
              <td rowspan="2">Ligne fusionnée verticalement</td>
              <td>Cellule normale 1</td>
            </tr>
            <tr>
              <td>Cellule normale 2</td>
            </tr>
          </table>
        `
      }
    ];

    console.log("Generating DOCX...");
    const blob = await generateDocx("Livre de Test", "Sous-titre", chapters);
    console.log("DOCX generated! Size:", blob.size);
    
    const buffer = Buffer.from(await blob.arrayBuffer());
    fs.writeFileSync("test_export.docx", buffer);
    console.log("Saved to test_export.docx");
  } catch (err) {
    console.error("Error during generation:", err);
  }
}

run();
