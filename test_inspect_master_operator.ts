async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1j7dq7JTFfFUtUvNTrPANIwYRmXNKvU-RNtoal_my_7Y/gviz/tq?tqx=out:csv&gid=203011290";
  const res = await fetch(url);
  const text = await res.text();
  const rows = text.split("\n").map(l => l.trim()).filter(l => l !== "");
  console.log("MASTER OPERATOR Rows (first 30):");
  rows.slice(0, 30).forEach((r, idx) => console.log(`${idx}: ${r}`));
}

main().catch(console.error);
