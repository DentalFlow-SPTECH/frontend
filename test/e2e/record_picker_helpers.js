import { expect } from '@playwright/test';

export async function chooseRecord(page, control, id, search) {
    await control.click();
    const dialog = page.getByRole('dialog').filter({ visible: true });
    await expect(dialog).toBeVisible();
    if (search !== undefined) await dialog.locator('input[type="search"]').fill(search);
    await dialog.locator(`[data-record-id="${id}"]`).click();
    await expect(dialog).toHaveCount(0);
    await expect(control).toHaveAttribute('value', id);
}
