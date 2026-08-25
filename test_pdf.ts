import puppeteer from "puppeteer";
import fs from "fs";
import { buildPrintHtml } from "./src/lib/export/buildPrintHtml";

async function run() {
  try {
    const chapters = [
      {
        number: 1,
        title: "Chapitre Riche",
        content: `
          <h1 style="font-family: 'Merriweather'; color: #4F46E5;">Titre Élégant</h1>
          <p style="font-family: 'Outfit';">Voici un paragraphe avec une police différente et un <strong>texte en gras</strong>.</p>
          
          <h2>Tableau Financier</h2>
          <table>
            <thead>
              <tr>
                <th style="background-color: #f3f4f6;">Mois</th>
                <th style="background-color: #f3f4f6;">Revenus</th>
                <th style="background-color: #f3f4f6;">Croissance</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Janvier</td>
                <td>10 000 €</td>
                <td>+5%</td>
              </tr>
              <tr>
                <td>Février</td>
                <td>12 500 €</td>
                <td style="color: green; font-weight: bold;">+25%</td>
              </tr>
            </tbody>
          </table>

          <h2>Image Intégrée</h2>
          <p>Voici une illustration de test :</p>
          <img src="https://via.placeholder.com/400x200" alt="Test Image" style="border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-top: 20px;"/>
        `
      }
    ];

    console.log("Building HTML...");
    const html = buildPrintHtml("Mon Super Livre", "Sous-titre de test", chapters);

    console.log("Launching Puppeteer...");
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    
    const page = await browser.newPage();
    console.log("Setting content...");
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    console.log("Generating PDF...");
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "2.5cm", bottom: "2.5cm", left: "2cm", right: "2cm" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `<div style="width:100%; text-align:center; font-size:9px; color:#999999; font-family: sans-serif;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>`,
    });

    await browser.close();

    fs.writeFileSync("test_export.pdf", pdfBuffer);
    console.log("PDF generated! Saved to test_export.pdf, Size:", pdfBuffer.length);
  } catch (err) {
    console.error("Error during PDF generation:", err);
  }
}

run();
