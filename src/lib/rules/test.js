import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { checkCompliance } from "./ruleInterpreter.js";
import evaluateVerdict from "./verdictEvaluator.js";

// Load JSON safely in ESM across Node versions
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ruleConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "Ruleconfig.json"), "utf8")
);


// =====================================================
// HELPER FUNCTION
// =====================================================

function runTest(testName, extractedData) {

    console.log("\n\n========================================");
    console.log(testName);
    console.log("========================================");

    // Step 1: Run all rules
    const ruleResults = checkCompliance(
        ruleConfig.rules,
        extractedData
    );

    // Step 2: Evaluate overall verdict
    const complianceResult = evaluateVerdict(
        ruleResults
    );

    // Step 3: Overall result
    console.log("\nVERDICT:", complianceResult.verdict);
    console.log("Total Rules:", complianceResult.totalRules);
    console.log("Passed Rules:", complianceResult.passedRules);
    console.log("Failed Rules:", complianceResult.failedRules);
    console.log("Skipped Rules:", complianceResult.skippedRules);

    // Step 4: Individual rule results
    console.log("\nRULE RESULTS:");

    ruleResults.forEach(result => {

        console.log(
            `${result.rule_id} [${result.clause_citation}] → ` +
            `${result.passed ? "PASS" : "FAIL"} ` +
            `| Skipped: ${result.skipped} ` +
            `| Confidence: ${result.confidence}`
        );

        console.log(`Reason: ${result.reason}`);
    });

    // Step 5: Failures
    console.log("\nFAILURES:");

    if (complianceResult.failures.length === 0) {

        console.log("No failures");

    } else {

        complianceResult.failures.forEach(failure => {

            console.log(
                `[${failure.clause_citation}] ${failure.rule_id}: ${failure.description || ""} → ${failure.reason}`
            );
        });
    }

    return complianceResult;
}


// =====================================================
// BASE VALID DATA (Covers all 13 rules)
// =====================================================

const baseData = {

    MANUFACTURER_ADDRESS: {
        text: "ABC Pvt Ltd, Kolkata, India",
        confidence: 0.95
    },

    COMMODITY_NAME: {
        text: "Wheat Flour",
        confidence: 0.98
    },

    NET_QUANTITY: {
        text: "1 kg",
        confidence: 0.96
    },

    MANUFACTURE_DATE: {
        text: "08/2026",
        confidence: 0.91
    },

    MRP: {
        text: "MRP ₹120",
        confidence: 0.94
    },

    CONSUMER_CARE: {
        text: "1800-123-456",
        confidence: 0.89
    },

    COUNTRY_OF_ORIGIN: {
        text: "India",
        confidence: 0.93
    },

    UNIT_SALE_PRICE: {
        text: "₹ 120.00 / kg",
        confidence: 0.92
    },

    STANDARD_QUANTITY: {
        text: "1 kg (Standard pack under Second Schedule)",
        confidence: 0.95
    },

    BATCH_NUMBER: {
        text: "Batch No. B-2026-X8",
        confidence: 0.90
    },

    isImported: true,
    requiresUnitSalePrice: true,
    isStandardSizeApplicable: true,
    isBatchApplicable: true,

    DECLARATIONS: {
        text: "Manufactured by ABC Pvt Ltd.",
        fontSizeMm: 1.5,
        region: "principal_display_panel",
        confidence: 0.92
    }
};


// =====================================================
// TEST SUITE EXECUTION & VERIFICATION ASSERTIONS
// =====================================================

console.log("\n=======================================================");
console.log("RUNNING VERIFICATION SUITE FOR ALL RULES");
console.log("=======================================================");

// Test 1: Full compliance across all 13 rules
const test1 = { ...baseData };
const res1 = runTest("===== TEST 1: FULLY COMPLIANT (ALL 13 RULES) =====", test1);
if (res1.verdict !== "COMPLIANT" || res1.passedRules !== 13 || res1.failedRules !== 0) {
    throw new Error(`Test 1 Failed: Expected COMPLIANT (13 passed), got ${res1.verdict} (${res1.passedRules} passed)`);
}

// Test 2: Cosmetic failure (font size)
const test2 = {
    ...baseData,
    DECLARATIONS: {
        ...baseData.DECLARATIONS,
        fontSizeMm: 0.5
    }
};
const res2 = runTest("===== TEST 2: COSMETIC FAILURE (FONT SIZE) =====", test2);
if (res2.verdict !== "COMPLIANT_WITH_WARNINGS" || res2.failedRules !== 1) {
    throw new Error(`Test 2 Failed: Expected COMPLIANT_WITH_WARNINGS, got ${res2.verdict}`);
}

// Test 3: Substantive failure (MRP missing)
const test3 = {
    ...baseData,
    MRP: {
        text: "",
        confidence: 0.90
    }
};
const res3 = runTest("===== TEST 3: SUBSTANTIVE FAILURE (MRP MISSING) =====", test3);
if (res3.verdict !== "NON_COMPLIANT" || res3.failedRules !== 2) {
    throw new Error(`Test 3 Failed: Expected NON_COMPLIANT, got ${res3.verdict}`);
}

// Test 4: All 4 conditional rules skipped
const test4 = {
    ...baseData,
    isImported: false,
    requiresUnitSalePrice: false,
    isStandardSizeApplicable: false,
    isBatchApplicable: false,
    COUNTRY_OF_ORIGIN: null,
    UNIT_SALE_PRICE: null,
    STANDARD_QUANTITY: null,
    BATCH_NUMBER: null
};
const res4 = runTest("===== TEST 4: ALL 4 CONDITIONAL RULES SKIPPED =====", test4);
if (res4.verdict !== "COMPLIANT" || res4.skippedRules !== 4 || res4.passedRules !== 9) {
    throw new Error(`Test 4 Failed: Expected 4 skipped, got ${res4.skippedRules}`);
}

// Test 5: Unit sale price violation (Rule 6(11))
const test5 = {
    ...baseData,
    requiresUnitSalePrice: true,
    UNIT_SALE_PRICE: {
        text: "",
        confidence: 0
    }
};
const res5 = runTest("===== TEST 5: UNIT SALE PRICE VIOLATION (Rule 6(11)) =====", test5);
const uspFailed = res5.failures.some(f => f.rule_id === "UNIT_SALE_PRICE_PRESENCE" && f.clause_citation === "Rule 6(11)");
if (res5.verdict !== "NON_COMPLIANT" || !uspFailed) {
    throw new Error(`Test 5 Failed: Expected UNIT_SALE_PRICE_PRESENCE failure with citation Rule 6(11)`);
}

// Test 6: Standard quantity violation (Rule 5 / Second Schedule)
const test6 = {
    ...baseData,
    isStandardSizeApplicable: true,
    STANDARD_QUANTITY: null
};
const res6 = runTest("===== TEST 6: STANDARD QUANTITY VIOLATION (Rule 5 / Second Schedule) =====", test6);
const sqFailed = res6.failures.some(f => f.rule_id === "STANDARD_QUANTITY_SPECIFICATION" && f.clause_citation === "Rule 5 read with Second Schedule");
if (res6.verdict !== "NON_COMPLIANT" || !sqFailed) {
    throw new Error(`Test 6 Failed: Expected STANDARD_QUANTITY_SPECIFICATION failure`);
}

// Test 7: Batch number violation (Rule 6(1)(g))
const test7 = {
    ...baseData,
    isBatchApplicable: true,
    BATCH_NUMBER: {
        text: "   ",
        confidence: 0.85
    }
};
const res7 = runTest("===== TEST 7: BATCH NUMBER VIOLATION (Rule 6(1)(g)) =====", test7);
const batchFailed = res7.failures.some(f => f.rule_id === "BATCH_NUMBER_PRESENCE" && f.clause_citation.includes("Rule 6(1)(g)"));
if (res7.verdict !== "NON_COMPLIANT" || !batchFailed) {
    throw new Error(`Test 7 Failed: Expected BATCH_NUMBER_PRESENCE failure`);
}

console.log("\n=======================================================");
console.log("✅ ALL 7 TEST SUITES PASSED — ALL 13 RULES VERIFIED!");
console.log("=======================================================");
console.log(`Total Rules in Ruleconfig: ${ruleConfig.rules.length}`);
ruleConfig.rules.forEach((r, idx) => {
    console.log(` ${idx + 1}. [${r.clause_citation}] ${r.rule_id} (${r.check_type}, ${r.severity})`);
});
console.log("=======================================================\n");