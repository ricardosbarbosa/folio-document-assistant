import { expect, test } from "@playwright/test";

test("loads the evidence workspace and seeded documents", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Answers you can trace back/i })).toBeVisible();
  await expect(page.getByText("Product discovery brief.txt")).toBeVisible();
  await expect(page.getByText("Retrieval architecture.md")).toBeVisible();
  await expect(page.getByText("Test workspace")).toBeVisible();
});

test("streams a cited answer and exposes quality evidence", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "How is response quality evaluated?" }).click();
  await expect(page.getByText("Folio answer")).toBeVisible();
  await expect(page.locator(".answer-copy")).toContainText(/groundedness, citation coverage/i);
  await expect(page.getByText(/Overall confidence/i)).toBeVisible();
  await expect(page.getByRole("tab", { name: "S1" })).toBeVisible();
  await page.getByRole("tab", { name: "S1" }).click();
  await expect(page.getByText(/match/)).toBeVisible();
});

test("explains why uploads are unavailable in the public workspace", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Add a document/i }).click();
  await expect(page.getByRole("status")).toContainText("Uploads are disabled in this public workspace");
});
