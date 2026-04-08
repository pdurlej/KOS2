import fs from "fs";
import path from "path";

/**
 * Resolve the deterministic KOS2 vault fixture root used by integration tests.
 *
 * @returns Absolute fixture path.
 */
function getFixtureRoot(): string {
  return path.resolve(__dirname, "fixtures", "kos2-vault");
}

describe("KOS2 vault fixture", () => {
  it("contains the required top-level directories", () => {
    const fixtureRoot = getFixtureRoot();
    const directories = ["01_Inbox", "10_Projects", "20_Areas", "30_Resources"];

    directories.forEach((directory) => {
      expect(fs.existsSync(path.join(fixtureRoot, directory))).toBe(true);
    });
  });

  it("contains seeded notes for organise, next-steps, decision, and review flows", () => {
    const fixtureRoot = getFixtureRoot();
    const requiredFiles = [
      "01_Inbox/2026-04-01_raw-intake.md",
      "10_Projects/alpha-launch/project-alpha-launch.md",
      "10_Projects/alpha-launch/analysis-alpha-launch.md",
      "10_Projects/alpha-launch/decision-alpha-launch.md",
      "10_Projects/alpha-launch/review-alpha-launch.md",
      "10_Projects/alpha-launch/outcome-alpha-launch.md",
    ];

    requiredFiles.forEach((relativePath) => {
      expect(fs.existsSync(path.join(fixtureRoot, relativePath))).toBe(true);
    });
  });

  it("marks a seeded note as needs-review for review contract tests", () => {
    const fixtureRoot = getFixtureRoot();
    const reviewNote = fs.readFileSync(
      path.join(fixtureRoot, "10_Projects/alpha-launch/review-alpha-launch.md"),
      "utf8"
    );

    expect(reviewNote).toContain("needs-review");
    expect(reviewNote).toContain("Confirm that local-only usage works without any API key.");
  });
});
