import { extractSheetIdAndGid } from "./src/services/dataService";

async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1_vbL9s5xE6jeJPrylhcJDUJnpjMs05AD6VELHiTBY1o/edit?usp=sharing";
  const { id } = extractSheetIdAndGid(url);

  console.log("Fetching ROBERT tab...");
  const resR = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=2130280599`);
  const textR = await resR.text();
  const linesR = textR.split("\n").map(l => l.trim()).filter(l => l !== "");
  
  const dateCounts: Record<string, number> = {};
  
  linesR.forEach((line, idx) => {
    if (idx === 0) return; // Header
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, "").trim());
    if (cols.length > 17) {
      const isBT = cols[13].toLowerCase().includes("verifikasi");
      const dateVal = cols[16]; // TANGGAL VERIFIKASI BT
      if (isBT && dateVal) {
        dateCounts[dateVal] = (dateCounts[dateVal] || 0) + 1;
      }
    }
  });
  
  console.log("Robert's verified BT counts by date:", dateCounts);
}

main().catch(console.error);
