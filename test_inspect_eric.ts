async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1j7dq7JTFfFUtUvNTrPANIwYRmXNKvU-RNtoal_my_7Y/gviz/tq?tqx=out:csv&gid=2131602058";
  const res = await fetch(url);
  const text = await res.text();
  const lines = text.split("\n").map(l => l.trim()).filter(l => l !== "");
  console.log(`ERIC Lines fetched: ${lines.length}`);
  lines.slice(0, 15).forEach((line, idx) => {
    console.log(`${idx}: ${line}`);
  });
}

main().catch(console.error);
