import { extractSheetIdAndGid } from "./src/services/dataService";

async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1_vbL9s5xE6jeJPrylhcJDUJnpjMs05AD6VELHiTBY1o/edit?usp=sharing";
  const { id } = extractSheetIdAndGid(url);

  // 1. Inspect FERNANDA (gid: 1674324524)
  console.log("Fetching FERNANDA tab...");
  const resF = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=1674324524`);
  const textF = await resF.text();
  const linesF = textF.split("\n").map(l => l.trim()).filter(l => l !== "");
  
  let btCountF = 0;
  let suCountF = 0;
  
  linesF.forEach((line, idx) => {
    if (idx === 0) return; // Header
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, "").trim());
    if (cols.length > 14) {
      const isBT = cols[13].toLowerCase().includes("verifikasi");
      const isSU = cols[14].toLowerCase().includes("verifikasi");
      if (isBT) btCountF++;
      if (isSU) suCountF++;
    }
  });
  
  console.log(`FERNANDA Tab actual: verified BT = ${btCountF}, verified SU = ${suCountF}`);

  // 2. Inspect ROBERT (gid: 2130280599)
  console.log("Fetching ROBERT tab...");
  const resR = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=2130280599`);
  const textR = await resR.text();
  const linesR = textR.split("\n").map(l => l.trim()).filter(l => l !== "");
  
  let btCountR = 0;
  let suCountR = 0;
  
  linesR.forEach((line, idx) => {
    if (idx === 0) return; // Header
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/"/g, "").trim());
    if (cols.length > 14) {
      const isBT = cols[13].toLowerCase().includes("verifikasi");
      const isSU = cols[14].toLowerCase().includes("verifikasi");
      if (isBT) btCountR++;
      if (isSU) suCountR++;
    }
  });
  
  console.log(`ROBERT Tab actual: verified BT = ${btCountR}, verified SU = ${suCountR}`);
}

main().catch(console.error);
