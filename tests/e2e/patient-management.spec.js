/**
 * E2E Tests for Patient Management
 * Tests complete patient CRUD workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Patient Management E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'admin@hospital.com');
    await page.fill('input[name="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should create new patient', async ({ page }) => {
    // Navigate to patient creation
    await page.click('text=Patients');
    await page.click('text=Add Patient');
    
    // Fill patient form
    await page.fill('input[name="name"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '+1234567890');
    await page.fill('input[name="dateOfBirth"]', '1980-01-01');
    await page.selectOption('select[name="gender"]', 'male');
    await page.fill('input[name="address"]', '123 Main St');
    await page.fill('input[name="city"]', 'Lagos');
    await page.fill('input[name="state"]', 'Lagos');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await expect(page.locator('text=Patient created successfully')).toBeVisible();
    
    // Verify patient appears in list
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should search for patient', async ({ page }) => {
    // Navigate to patients list
    await page.click('text=Patients');
    
    // Search for patient
    await page.fill('input[placeholder*="Search"]', 'John');
    
    // Wait for results
    await expect(page.locator('text=John')).toBeVisible();
  });

  test('should view patient details', async ({ page }) => {
    await page.click('text=Patients');
    
    // Click on a patient
    await page.click('text=John Doe');
    
    // Verify patient details page
    await expect(page.locator('text=Patient Details')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should update patient information', async ({ page }) => {
    await page.click('text=Patients');
    await page.click('text=John Doe');
    
    // Click edit button
    await page.click('text=Edit');
    
    // Update name
    await page.fill('input[name="name"]', 'John Updated');
    
    // Save changes
    await page.click('button[type="submit"]');
    
    // Verify update
    await expect(page.locator('text=Patient updated successfully')).toBeVisible();
    await expect(page.locator('text=John Updated')).toBeVisible();
  });

  test('should delete patient', async ({ page }) => {
    await page.click('text=Patients');
    await page.click('text=John Doe');
    
    // Click delete button
    await page.click('text=Delete');
    
    // Confirm deletion
    await page.click('text=Confirm');
    
    // Verify deletion
    await expect(page.locator('text=Patient deleted successfully')).toBeVisible();
    await expect(page.locator('text=John Doe')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.click('text=Patients');
    await page.click('text=Add Patient');
    
    // Try to submit without filling required fields
    await page.click('button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=Name is required')).toBeVisible();
    await expect(page.locator('text=Email is required')).toBeVisible();
  });

  test('should handle duplicate patient detection', async ({ page }) => {
    await page.click('text=Patients');
    await page.click('text=Add Patient');
    
    // Fill form with existing patient data
    await page.fill('input[name="name"]', 'Existing Patient');
    await page.fill('input[name="email"]', 'existing@example.com');
    await page.fill('input[name="phone"]', '+1234567890');
    
    await page.click('button[type="submit"]');
    
    // Should show duplicate warning
    await expect(page.locator('text=Duplicate patient detected')).toBeVisible();
  });
});

