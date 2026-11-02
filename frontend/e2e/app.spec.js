import { test, expect } from '@playwright/test'

const PASSWORD = 'correct-horse-1'
const uniqueEmail = () => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`

// A real JPEG made in the browser itself, so the tests need no image files or extra packages.
// "noise" is sharp (passes the blur check); other sizes test the size rule.
async function makePhoto(page, width = 640, height = 480) {
  const dataUrl = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      const img = ctx.createImageData(w, h)
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = Math.random() * 255
        img.data[i + 1] = Math.random() * 255
        img.data[i + 2] = Math.random() * 255
        img.data[i + 3] = 255
      }
      ctx.putImageData(img, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.9)
    },
    [width, height],
  )
  return { name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') }
}

async function signUp(page, email = uniqueEmail()) {
  await page.goto('/signup')
  await page.getByPlaceholder('Enter your full name').fill('E2E Tester')
  await page.getByPlaceholder('you@hospital.org').fill(email)
  await page.getByPlaceholder('Enter your password').first().fill(PASSWORD)
  await page.getByPlaceholder('Enter your password again').fill(PASSWORD)
  await page.locator('main form button[type=submit]').click()
  await expect(page).toHaveURL(/\/dashboard/)
  return email
}

// On phones the links sit behind a Menu button.
async function openMenuIfPhone(page) {
  const menu = page.getByRole('button', { name: 'Menu' })
  if (await menu.isVisible()) await menu.click()
}

test.describe('navigation and access control', () => {
  test('logged-out visitors see the public links only', async ({ page }) => {
    await page.goto('/')
    await openMenuIfPhone(page)
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: 'Log in' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Sign up' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'History' })).toHaveCount(0)
  })

  for (const route of ['/dashboard', '/history', '/results/1']) {
    test(`${route} sends a logged-out visitor to the login page`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
      await expect(page.getByText('Please log in to continue.')).toBeVisible()
    })
  }

  test('the Menu button appears on phones and not on desktops', async ({ page, isMobile }) => {
    await page.goto('/about')
    await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible({ visible: isMobile })
  })
})

test.describe('signup, login and logout', () => {
  test('sign up, use every nav link, reload, then log out', async ({ page }) => {
    await signUp(page)
    for (const name of ['History', 'About', 'Dashboard']) {
      await openMenuIfPhone(page)
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name }).click()
      await expect(page).toHaveURL(new RegExp(name.toLowerCase()))
    }
    await page.reload()
    await expect(page).toHaveURL(/\/dashboard/) // the session survives a reload
    await openMenuIfPhone(page)
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page).toHaveURL(/\/login/)
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/) // and the dashboard is closed again
  })

  test('a wrong password shows an error and stays on the login page', async ({ page }) => {
    const email = await signUp(page)
    await openMenuIfPhone(page)
    await page.getByRole('button', { name: 'Log out' }).click()
    await page.getByPlaceholder('you@hospital.org').fill(email)
    await page.getByPlaceholder('Enter your password').fill('wrong-password-1')
    await page.locator('main form button[type=submit]').click()
    await expect(page.getByRole('alert')).toContainText('Incorrect email or password')
    await expect(page).toHaveURL(/\/login/)
  })

  test('a short password and a repeated email are both refused', async ({ page }) => {
    await page.goto('/signup')
    await page.getByPlaceholder('Enter your full name').fill('E2E Tester')
    await page.getByPlaceholder('you@hospital.org').fill(uniqueEmail())
    await page.getByPlaceholder('Enter your password').first().fill('short')
    await page.getByPlaceholder('Enter your password again').fill('short')
    await page.locator('main form button[type=submit]').click()
    await expect(page.getByText(/8 characters/i).first()).toBeVisible()

    const email = await signUp(page)
    await openMenuIfPhone(page)
    await page.getByRole('button', { name: 'Log out' }).click()
    await page.goto('/signup')
    await page.getByPlaceholder('Enter your full name').fill('E2E Tester')
    await page.getByPlaceholder('you@hospital.org').fill(email.toUpperCase())
    await page.getByPlaceholder('Enter your password').first().fill(PASSWORD)
    await page.getByPlaceholder('Enter your password again').fill(PASSWORD)
    await page.locator('main form button[type=submit]').click()
    await expect(page.getByText(/already exists/i)).toBeVisible()
  })
})

test.describe('uploading an image (frontend, API, model and database together)', () => {
  test('a valid photo gives a classification, certainty, heatmap and explanation', async ({ page }) => {
    await signUp(page)
    await page.getByLabel('Choose an image file').setInputFiles(await makePhoto(page))
    await page.getByRole('button', { name: 'Analyse image' }).click()

    await expect(page).toHaveURL(/\/results\/\d+/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: 'Screening support result' })).toBeVisible()
    await expect(page.getByText(/^(High|Medium|Low) certainty$/)).toBeVisible()
    await expect(page.getByText(/% model confidence/)).toBeVisible()
    await expect(page.getByText(/not validated for clinical use/)).toBeVisible()
    const heatmap = page.getByAltText(/heatmap overlay/)
    await expect(heatmap).toBeVisible()
    // the picture really loaded (not a broken image)
    await expect.poll(() => heatmap.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  })

  test('the result appears in the history list', async ({ page }) => {
    await signUp(page)
    await page.getByLabel('Choose an image file').setInputFiles(await makePhoto(page))
    await page.getByRole('button', { name: 'Analyse image' }).click()
    await expect(page).toHaveURL(/\/results\/\d+/, { timeout: 30_000 })
    await page.goto('/history')
    await expect(page.getByText(/Normal|Abnormal/).first()).toBeVisible()
  })

  test('a photo of the wrong size is refused with a clear message', async ({ page }) => {
    await signUp(page)
    await page.getByLabel('Choose an image file').setInputFiles(await makePhoto(page, 400, 300))
    await page.getByRole('button', { name: 'Analyse image' }).click()
    await expect(page.getByRole('alert')).toContainText('640 x 480')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('a file that is not an image is refused', async ({ page }) => {
    await signUp(page)
    await page.getByLabel('Choose an image file').setInputFiles({
      name: 'notes.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('just some text'),
    })
    await page.getByRole('button', { name: 'Analyse image' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL(/\/dashboard/)
  })
})