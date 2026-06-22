import fs from "fs";
import path from "path";

test("declares the HeroTrack Pro dashboard routes", () => {
  const appSource = fs.readFileSync(path.join(__dirname, "App.jsx"), "utf8");

  expect(appSource).toContain("HeroTrackDashboard");
  expect(appSource).toContain("EnterpriseTablePage");
  expect(appSource).toContain("/AdminDashboard");
});
