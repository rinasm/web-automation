const { remote } = require('webdriverio');

/**
 * Test script to verify all navigation flows in Emirates NBD Banking App
 * Tests all 5 levels of navigation and accessibility identifiers
 */

async function testEmiratesBankingApp() {
  console.log('🏦 Starting Emirates NBD Banking App Navigation Test\n');

  const capabilities = {
    platformName: 'iOS',
    'appium:deviceName': 'iPhone',
    'appium:udid': '00008110-001E38A834C3801E',
    'appium:platformVersion': '18.0',
    'appium:automationName': 'XCUITest',
    'appium:bundleId': 'com.rinasmusthafa.MyTodoApp',
    'appium:noReset': true,
    'appium:newCommandTimeout': 300
  };

  const wdOpts = {
    hostname: '127.0.0.1',
    port: 4723,
    logLevel: 'info',
    capabilities
  };

  let driver;
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    driver = await remote(wdOpts);
    console.log('✅ Connected to Appium\n');

    // Wait for app to fully load
    await driver.pause(3000);

    // ============================================
    // LEVEL 1: Login Flow
    // ============================================
    console.log('📍 LEVEL 1: Testing Login Flow...');

    try {
      // Check if onboarding screen is visible
      const exploreButton = await driver.$('~onboardingExploreButton');
      if (await exploreButton.isDisplayed()) {
        console.log('  ✓ Onboarding screen displayed');
        await exploreButton.click();
        results.passed.push('Onboarding explore button');
        await driver.pause(1000);
      }
    } catch (e) {
      console.log('  ℹ️  Onboarding may already be dismissed');
    }

    try {
      // Test login sheet
      const faceIdButton = await driver.$('~loginFaceIdButton');
      if (await faceIdButton.isDisplayed()) {
        console.log('  ✓ Login sheet displayed with Face ID button');
        await faceIdButton.click();
        results.passed.push('Login with Face ID');
        console.log('  ✓ Clicked Face ID button - logging in...');
        await driver.pause(2000);
      }
    } catch (e) {
      results.failed.push(`Login Face ID button: ${e.message}`);
      console.log('  ❌ Face ID button not found');
    }

    // ============================================
    // LEVEL 2: Home Screen & Main Cards
    // ============================================
    console.log('\n📍 LEVEL 2: Testing Home Screen Navigation...');

    const level2Tests = [
      { id: '~homeAccountsCard', name: 'Accounts Card', next: 'AccountDetails' },
      { id: '~homeCardsCard', name: 'Cards Card', next: 'CardDetails' },
      { id: '~homeWealthCard', name: 'Wealth Card', next: null },
      { id: '~homeLoanCard', name: 'Loan Card', next: null }
    ];

    for (const test of level2Tests) {
      try {
        const element = await driver.$(test.id);
        if (await element.isDisplayed()) {
          console.log(`  ✓ ${test.name} visible`);
          results.passed.push(test.name);
        } else {
          console.log(`  ⚠️  ${test.name} exists but not visible`);
          results.warnings.push(test.name);
        }
      } catch (e) {
        console.log(`  ❌ ${test.name} not found`);
        results.failed.push(test.name);
      }
    }

    // ============================================
    // LEVEL 3: Card Details Screen
    // ============================================
    console.log('\n📍 LEVEL 3: Testing Card Details Navigation...');

    try {
      const cardsCard = await driver.$('~homeCardsCard');
      await cardsCard.click();
      console.log('  ✓ Navigated to Card Details');
      await driver.pause(2000);

      // Test card detail elements
      const cardDetailTests = [
        '~cardBackButton',
        '~cardTypeToggle',
        '~cardPointsLink',
        '~cardPayNowButton',
        '~cardBenefitsButton',
        '~cardLockButton',
        '~cardSettingsButton',
        '~cardOverviewTab',
        '~cardServicesTab',
        '~cardDetailsTab'
      ];

      for (const testId of cardDetailTests) {
        try {
          const element = await driver.$(testId);
          if (await element.isDisplayed()) {
            console.log(`  ✓ ${testId.replace('~', '')} visible`);
            results.passed.push(testId.replace('~', ''));
          }
        } catch (e) {
          console.log(`  ❌ ${testId.replace('~', '')} not found`);
          results.failed.push(testId.replace('~', ''));
        }
      }

      // ============================================
      // LEVEL 4: Card Services Tab
      // ============================================
      console.log('\n📍 LEVEL 4: Testing Card Services Tab...');

      try {
        const servicesTab = await driver.$('~cardServicesTab');
        await servicesTab.click();
        console.log('  ✓ Switched to Services tab');
        await driver.pause(1500);

        const serviceTests = [
          '~cardServiceInstallment',
          '~cardServiceCashAdvance',
          '~cardServiceLoan',
          '~cardServiceBalance',
          '~cardServiceDispute'
        ];

        for (const serviceId of serviceTests) {
          try {
            const element = await driver.$(serviceId);
            if (await element.isDisplayed()) {
              console.log(`  ✓ ${serviceId.replace('~cardService', '')} service visible`);
              results.passed.push(serviceId.replace('~', ''));
            }
          } catch (e) {
            console.log(`  ❌ ${serviceId.replace('~cardService', '')} not found`);
            results.failed.push(serviceId.replace('~', ''));
          }
        }

        // ============================================
        // LEVEL 5: Service Detail Views
        // ============================================
        console.log('\n📍 LEVEL 5: Testing Service Detail Views...');

        try {
          const installmentService = await driver.$('~cardServiceInstallment');
          await installmentService.click();
          console.log('  ✓ Opened Installment Plan detail');
          results.passed.push('Level 5 - Installment Plan Detail');
          await driver.pause(1500);

          // Go back
          const backButton = await driver.$('~backButton');
          if (await backButton.isDisplayed()) {
            await backButton.click();
            console.log('  ✓ Navigated back from service detail');
            await driver.pause(1000);
          }
        } catch (e) {
          console.log('  ⚠️  Service detail navigation: ' + e.message);
          results.warnings.push('Level 5 navigation');
        }

      } catch (e) {
        console.log('  ❌ Services tab error: ' + e.message);
        results.failed.push('Card Services Tab');
      }

      // Navigate back to home
      const cardBackButton = await driver.$('~cardBackButton');
      await cardBackButton.click();
      console.log('  ✓ Returned to home screen');
      await driver.pause(1500);

    } catch (e) {
      console.log('  ❌ Card Details navigation failed: ' + e.message);
      results.failed.push('Card Details Navigation');
    }

    // ============================================
    // Tab Bar Navigation
    // ============================================
    console.log('\n📍 Testing Tab Bar Navigation...');

    const tabTests = [
      { id: '~tabWealth', name: 'Wealth Tab' },
      { id: '~tabTransfer', name: 'Transfer Tab' },
      { id: '~tabServices', name: 'Services Tab' },
      { id: '~tabExplore', name: 'Explore Tab' },
      { id: '~tabHome', name: 'Home Tab' }
    ];

    for (const tab of tabTests) {
      try {
        const tabElement = await driver.$(tab.id);
        await tabElement.click();
        console.log(`  ✓ ${tab.name} clicked`);
        results.passed.push(tab.name);
        await driver.pause(1000);
      } catch (e) {
        console.log(`  ❌ ${tab.name} failed: ${e.message}`);
        results.failed.push(tab.name);
      }
    }

    // ============================================
    // Services Screen Tests
    // ============================================
    console.log('\n📍 Testing Services Screen...');

    // Navigate to Services tab
    const servicesTab = await driver.$('~tabServices');
    await servicesTab.click();
    await driver.pause(1500);

    const servicesTests = [
      '~servicesSearchField',
      '~servicesRequestsButton',
      '~servicesNoLiabilityCard',
      '~servicesAuthStatementCard',
      '~servicesAccountRefCard',
      '~servicesApplyButton'
    ];

    for (const testId of servicesTests) {
      try {
        const element = await driver.$(testId);
        if (await element.isDisplayed()) {
          console.log(`  ✓ ${testId.replace('~services', '')} visible`);
          results.passed.push(testId.replace('~', ''));
        }
      } catch (e) {
        console.log(`  ❌ ${testId.replace('~services', '')} not found`);
        results.failed.push(testId.replace('~', ''));
      }
    }

    // ============================================
    // Test Results Summary
    // ============================================
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));

    console.log(`\n✅ PASSED: ${results.passed.length} tests`);
    if (results.passed.length > 0) {
      results.passed.forEach(test => console.log(`   • ${test}`));
    }

    if (results.warnings.length > 0) {
      console.log(`\n⚠️  WARNINGS: ${results.warnings.length} tests`);
      results.warnings.forEach(test => console.log(`   • ${test}`));
    }

    if (results.failed.length > 0) {
      console.log(`\n❌ FAILED: ${results.failed.length} tests`);
      results.failed.forEach(test => console.log(`   • ${test}`));
    }

    const totalTests = results.passed.length + results.failed.length + results.warnings.length;
    const passRate = ((results.passed.length / totalTests) * 100).toFixed(1);

    console.log(`\n📈 Pass Rate: ${passRate}% (${results.passed.length}/${totalTests})`);
    console.log('='.repeat(60) + '\n');

    if (results.failed.length === 0) {
      console.log('🎉 All critical tests passed! Navigation structure verified.');
    } else {
      console.log('⚠️  Some tests failed. Review failed items above.');
    }

  } catch (error) {
    console.error('\n❌ Test execution error:', error.message);
    throw error;
  } finally {
    if (driver) {
      await driver.deleteSession();
      console.log('\n✅ Test session ended\n');
    }
  }
}

// Run the test
testEmiratesBankingApp().catch(console.error);
