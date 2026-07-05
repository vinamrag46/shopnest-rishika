/**
 * escalation.js
 * ----------------------------------------------------------------------
 * Lightweight keyword-based escalation detector used ALONGSIDE the LLM's
 * own escalation logic (defined in prompt.js). This module doesn't decide
 * what Rishika says — it only tags incoming messages for server-side
 * logging/analytics/routing metadata, so the system has a deterministic
 * signal that doesn't depend solely on model behavior.
 * ----------------------------------------------------------------------
 */

const ESCALATION_RULES = [
  { keywords: ["fraud", "hacked", "unauthorized", "someone else ordered"], queue: "Fraud Team", urgency: "CRITICAL" },
  { keywords: ["consumer court", "complaint"], queue: "Senior Support", urgency: "HIGH" },
  { keywords: ["account was accessed", "didn't place this order", "did not place this order"], queue: "Security Team", urgency: "CRITICAL" },
  { keywords: ["data was leaked", "someone else's data"], queue: "Data Privacy Officer", urgency: "CRITICAL" },
  { keywords: ["social media", "news channel", "viral", "ceo"], queue: "PR & Executive Support", urgency: "HIGH" },
];

/**
 * Scans a message for escalation keywords.
 * @param {string} message
 * @returns {{ escalated: boolean, queue?: string, urgency?: string }}
 */
function detectEscalation(message) {
  const lower = message.toLowerCase();
  for (const rule of ESCALATION_RULES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return { escalated: true, queue: rule.queue, urgency: rule.urgency };
    }
  }
  return { escalated: false };
}

module.exports = { detectEscalation, ESCALATION_RULES };
