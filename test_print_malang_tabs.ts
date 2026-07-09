import { discoverWorkbookTabs } from "./src/services/dataService";

async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1_vbL9s5xE6jeJPrylhcJDUJnpjMs05AD6VELHiTBY1o/edit?usp=sharing";
  const tabs = await discoverWorkbookTabs(url);
  console.log("Malang Sheet Tabs:", JSON.stringify(tabs, null, 2));
}

main().catch(console.error);
