// classify.js
// Free-tier classification for human, non-human, and agentic AI accounts
// Explicit logging, error handling, and JSON-ready outputs

export function daysSince(dateStr) {
  try {
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  } catch (e) {
    console.warn("Invalid date:", dateStr);
    return null;
  }
}

export function classifyAccount(record) {
  const {
    accountName,
    lastLogin,          // ISO string or null
    linkedOwner,        // employeeId or null
    roles = [],         // array of strings
    mfaEnabled = false, // boolean
    credentials = {     // optional
      type: "password|key|token",
      lastRotated: null, // ISO string or null
      rotationPolicyDays: 90
    }
  } = record;

  const patterns = [
    { regex: /^svc[_-]/i, label: "nonHuman" },
    { regex: /^bot[_-]/i, label: "nonHuman" },
    { regex: /^api[_-]/i, label: "nonHuman" },
    { regex: /^machine[_-]/i, label: "nonHuman" },
    { regex: /ai|agent|copilot/i, label: "agenticAI" }
  ];

  let type = "human";
  for (const p of patterns) {
    if (p.regex.test(accountName)) {
      type = p.label;
      break;
    }
  }

  if (!linkedOwner && type === "human") {
    // Human-looking but orphaned
    type = "orphaned";
  }

  const dormant = lastLogin ? daysSince(lastLogin) > 90 : true;
  const isPrivileged = roles.some(r =>
    /admin|root|owner|sys|super|global|privileged/i.test(r)
  );

  // Credential hygiene
  let longLivedKey = false;
  let rotationMissing = false;
  if (credentials && credentials.type !== "password") {
    const sinceRotate = credentials.lastRotated ? daysSince(credentials.lastRotated) : null;
    if (sinceRotate === null) {
      rotationMissing = true;
    } else {
      longLivedKey = sinceRotate > credentials.rotationPolicyDays;
    }
  }

  const flags = {
    dormant,
    isPrivileged,
    noMFA: isPrivileged && !mfaEnabled,
    longLivedKey,
    rotationMissing,
    orphaned: !linkedOwner
  };

  const riskScore = scoreRisk({ type, flags });

  const result = {
    accountName,
    type,
    linkedOwner: linkedOwner || null,
    lastLogin: lastLogin || null,
    roles,
    mfaEnabled,
    credentials,
    flags,
    riskScore
  };

  console.log(`[CLASSIFY] ${accountName} ->`, result);
  return result;
}

export function scoreRisk({ type, flags }) {
  let score = 0;

  // Base by type
  if (type === "agenticAI") score += 30;
  if (type === "nonHuman") score += 20;
  if (type === "orphaned") score += 25;

  // Flags
  if (flags.isPrivileged) score += 25;
  if (flags.noMFA) score += 20;
  if (flags.dormant) score += 10;
  if (flags.longLivedKey) score += 15;
  if (flags.rotationMissing) score += 10;
  if (flags.orphaned) score += 10;

  // Cap for free tier
  return Math.min(score, 100);
}

export function classifyAll(records = []) {
  const results = records.map(classifyAccount);

  const summary = {
    counts: {
      total: results.length,
      human: results.filter(r => r.type === "human").length,
      nonHuman: results.filter(r => r.type === "nonHuman").length,
      agenticAI: results.filter(r => r.type === "agenticAI").length,
      orphaned: results.filter(r => r.type === "orphaned").length,
      privileged: results.filter(r => r.flags.isPrivileged).length,
      noMFAAdmins: results.filter(r => r.flags.noMFA).length,
      dormant: results.filter(r => r.flags.dormant).length
    },
    topRisks: results
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map(r => ({ accountName: r.accountName, riskScore: r.riskScore, type: r.type }))
  };

  return { results, summary };
}