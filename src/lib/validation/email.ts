// Import disposable email domains list
import disposableDomains from "disposable-email-domains";

// Convert to Set for O(1) lookup
const disposableDomainSet = new Set<string>(disposableDomains as string[]);

// Additional commonly used disposable domains that might not be in the package
const additionalDisposableDomains = new Set([
  "tempmail.com",
  "temp-mail.org",
  "guerrillamail.com",
  "mailinator.com",
  "throwaway.email",
  "fakeinbox.com",
  "getnada.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "guerrillamail.info",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.de",
  "guerrillamail.net",
  "guerrillamail.org",
  "spam4.me",
  "byom.de",
  "trbvm.com",
  "dispostable.com",
  "mailnesia.com",
  "tempr.email",
  "discard.email",
  "tempail.com",
]);

// Extract domain from email address
function extractDomain(email: string): string {
  const parts = email.toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}

// Check if email uses a disposable domain
export function isDisposableEmail(email: string): boolean {
  const domain = extractDomain(email);

  if (!domain) {
    return false; // Invalid email format, let other validation handle it
  }

  // Check main list
  if (disposableDomainSet.has(domain)) {
    return true;
  }

  // Check additional domains
  if (additionalDisposableDomains.has(domain)) {
    return true;
  }

  // Check for subdomains of disposable domains
  const domainParts = domain.split(".");
  if (domainParts.length > 2) {
    const baseDomain = domainParts.slice(-2).join(".");
    if (disposableDomainSet.has(baseDomain) || additionalDisposableDomains.has(baseDomain)) {
      return true;
    }
  }

  return false;
}

// Check if email matches a pattern similar to another email (potential fraud)
export function emailsSimilar(email1: string, email2: string): boolean {
  const normalize = (email: string): string => {
    const [local, domain] = email.toLowerCase().split("@");
    if (!local || !domain) return email.toLowerCase();

    // Remove dots and common separators from local part
    const normalizedLocal = local
      .replace(/\./g, "")
      .replace(/_/g, "")
      .replace(/-/g, "")
      .replace(/\+.*$/, ""); // Remove + aliases

    return `${normalizedLocal}@${domain}`;
  };

  return normalize(email1) === normalize(email2);
}

// Check for plus addressing (email+tag@domain.com)
export function hasPlusAddressing(email: string): boolean {
  const [local] = email.split("@");
  return local?.includes("+") ?? false;
}

// Get base email without plus addressing
export function getBaseEmail(email: string): string {
  const [local, domain] = email.toLowerCase().split("@");
  if (!local || !domain) return email.toLowerCase();

  const baseLocal = local.replace(/\+.*$/, "");
  return `${baseLocal}@${domain}`;
}

// Validate email format and check for suspicious patterns
export function validateEmailSecurity(email: string): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  // Check for disposable domain
  if (isDisposableEmail(email)) {
    return {
      valid: false,
      warnings: ["Disposable email addresses are not allowed"],
    };
  }

  // Check for plus addressing (warning, not rejection)
  if (hasPlusAddressing(email)) {
    warnings.push("Email uses plus addressing");
  }

  // Check for suspicious patterns
  const [local] = email.split("@");
  if (local) {
    // Many numbers might indicate auto-generated email
    const numberCount = (local.match(/\d/g) || []).length;
    if (numberCount > 5) {
      warnings.push("Email contains many numbers");
    }

    // Very long local part
    if (local.length > 40) {
      warnings.push("Unusually long email address");
    }

    // Keyboard patterns
    const keyboardPatterns = ["qwerty", "asdf", "zxcv", "1234", "abcd"];
    if (keyboardPatterns.some((pattern) => local.toLowerCase().includes(pattern))) {
      warnings.push("Email contains keyboard patterns");
    }
  }

  return {
    valid: true,
    warnings,
  };
}
