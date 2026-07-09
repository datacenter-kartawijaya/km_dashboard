import { discoverWorkbookTabs } from "./src/services/dataService";

async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1j7dq7JTFfFUtUvNTrPANIwYRmXNKvU-RNtoal_my_7Y/edit?usp=sharing";
  const tabs = await discoverWorkbookTabs(url);
  console.log("Banyuasin Sheet Tabs:", JSON.stringify(tabs, null, 2));
}

main().catch(console.error);
