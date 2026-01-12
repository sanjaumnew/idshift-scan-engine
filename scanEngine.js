// scanEngine.js
// Modular SCAN engine for IDShift
// Detects identity risks across human and non-human accounts

// Core classification logic
export function runScan(inputData) {
  const results = [];

  inputData.forEach(account => {
    const classification = classifyAccount(account);
    results.push({
      id: account.id,
      type: classification.type,
      riskScore: classification.riskScore,
      notes: classification.notes
    });
  });

  return results;
}

// Account classification
function classifyAccount(account) {
  let riskScore = 0;
  let type = "human";
  let notes = [];

  // Example heuristics
  if (account.behavior?.automationSignals) {
    riskScore += 40;
    type = "agentic AI";
    notes.push("Detected automation patterns");
  }

  if (account.language?.syntheticTraits) {
    riskScore += 30;
    type = "synthetic identity";
    notes.push("Synthetic linguistic markers");
  }

  if (riskScore === 0) {
    notes.push("No anomalies detected");
  }

  return { type, riskScore, notes };
}

// Reporting
export function generateReport(scanResults) {
  return {
    timestamp: new Date().toISOString(),
    totalAccounts: scanResults.length,
    summary: {
      humans: scanResults.filter(r => r.type === "human").length,
      agenticAI: scanResults.filter(r => r.type === "agentic AI").length,
      synthetic: scanResults.filter(r => r.type === "synthetic identity").length
    },
    details: scanResults
  };
}