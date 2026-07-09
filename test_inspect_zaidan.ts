async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1_vbL9s5xE6jeJPrylhcJDUJnpjMs05AD6VELHiTBY1o/gviz/tq?tqx=out:csv&gid=999221363";
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
  console.log(`AHMAD ZAIDAN Lines: ${lines.length}`);
  lines.slice(0, 15).forEach((line, idx) => {
    console.log(`${idx}: ${line}`);
  });
}

main().catch(console.error);
