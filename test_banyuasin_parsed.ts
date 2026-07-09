import { fetchAllSheetsData } from "./src/services/dataService";

async function main() {
  const url = "https://docs.google.com/spreadsheets/d/1j7dq7JTFfFUtUvNTrPANIwYRmXNKvU-RNtoal_my_7Y/edit?usp=sharing";
  console.log("Fetching Banyuasin sheet data...");
  const result = await fetchAllSheetsData([url]);
  
  console.log(`Fetched ${result.data.length} operators.`);
  console.log("Statuses:", JSON.stringify(result.statuses, null, 2));
  
  let overallBT = 0;
  let overallSU = 0;
  
  result.data.forEach(op => {
    let opBT = 0;
    let opSU = 0;
    op.workData.forEach(wd => {
      opBT += wd.bt;
      opSU += wd.su;
    });
    overallBT += opBT;
    overallSU += opSU;
    console.log(`Operator: ${op.name}, BT: ${opBT}, SU: ${opSU}, Total: ${opBT + opSU}`);
  });
  
  console.log(`\nOverall BT: ${overallBT}`);
  console.log(`Overall SU: ${overallSU}`);
  console.log(`Overall Total Berkas: ${overallBT + overallSU}`);
}

main().catch(console.error);
