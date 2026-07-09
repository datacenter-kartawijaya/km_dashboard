async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1_vbL9s5xE6jeJPrylhcJDUJnpjMs05AD6VELHiTBY1o/gviz/tq?tqx=out:csv&gid=480789554";
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
  console.log(`Dashboard Lines fetched: ${lines.length}`);
  lines.forEach((line, idx) => {
    console.log(`${idx}: ${line}`);
  });
}

main().catch(console.error);
