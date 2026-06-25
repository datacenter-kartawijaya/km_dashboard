import { databaseService } from "./src/lib/databaseService";
import { PROJECTS } from "./src/services/dataService";

async function main() {
  console.log("DEFAULT PROJECTS:", JSON.stringify(PROJECTS, null, 2));
  try {
    const activeProjects = await databaseService.fetchProjects(PROJECTS);
    console.log("ACTIVE PROJECTS IN DB:", JSON.stringify(activeProjects, null, 2));
  } catch (err) {
    console.error("Error reading projects:", err);
  }
}

main().catch(console.error);
