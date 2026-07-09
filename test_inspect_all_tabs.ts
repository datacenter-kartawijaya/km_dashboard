import { extractSheetIdAndGid, discoverWorkbookTabs } from "./src/services/dataService";

async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1_vbL9s5xE6jeJPrylhcJDUJnpjMs05AD6VELHiTBY1o/edit?usp=sharing";
  const { id } = extractSheetIdAndGid(url);
  const tabs = await discoverWorkbookTabs(url);

  console.log("Discovered tabs for Malang sheet:", tabs);

  for (const tab of tabs) {
    console.log(`\n=========================================`);
    console.log(`Tab: "${tab.name}" (gid: ${tab.gid})`);
    console.log(`=========================================`);
    const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${tab.gid}`;
    const res = await fetch(csvUrl);
    const text = await res.text();
    const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
    
    console.log(`Total non-empty lines: ${lines.length}`);
    lines.slice(0, 10).forEach((line, idx) => {
      console.log(`${idx}: ${line}`);
    });
  }
}

main().catch(console.error);
