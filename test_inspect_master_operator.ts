import { extractSheetIdAndGid } from "./src/services/dataService";

async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1uF4vxj5h2phnSWtyAnrBjcAkXjdeW1vX9ehgtxp44i8/edit?usp=sharing";
  const { id } = extractSheetIdAndGid(url);

  console.log("Fetching MASTER OPERATOR...");
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=203011290`);
  const text = await res.text();
  const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
  
  console.log(`Loaded ${lines.length} non-empty lines from MASTER OPERATOR.`);
  
  lines.forEach((line, idx) => {
    const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    // Print lines that contain any of the target volumes or have non-empty columns
    const hasNumbers = cols.some(c => c.includes("42672") || c.includes("2648") || c.includes("1774") || c.includes("368") || c.includes("45940"));
    const hasOperator = cols.some(c => c.toUpperCase().includes("OPERATOR"));
    
    if (hasNumbers || hasOperator || idx < 10 || (idx > lines.length - 15)) {
      console.log(`Row ${idx}: ${line}`);
    }
  });
}

main().catch(console.error);
