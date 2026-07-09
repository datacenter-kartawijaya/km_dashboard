import { fetchAllSheetsData, PROJECTS } from "./src/services/dataService";

async function main() {
  console.log("Fetching sheet data...");
  const result = await fetchAllSheetsData(PROJECTS[0].sheetIds);
  console.log(`Fetched ${result.data.length} operators.`);
  console.log("Statuses:", result.statuses);
  
  result.data.forEach(op => {
    let totalBT = 0;
    let totalSU = 0;
    op.workData.forEach(wd => {
      totalBT += wd.bt;
      totalSU += wd.su;
    });
    console.log(`Operator: ${op.name}, Total BT: ${totalBT}, Total SU: ${totalSU}`);
  });
}

main().catch(console.error);
