import dotenv from 'dotenv';
dotenv.config();

// In-memory set of explicitly authorized administrator emails (normalized lowercase)
const runtimeAuthorizedEmails = new Set();

// Load initial authorized emails from process.env.AUTHORIZED_ADMIN_EMAILS
const loadInitialEmails = () => {
  const envEmails = (process.env.AUTHORIZED_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  envEmails.forEach((email) => runtimeAuthorizedEmails.add(email));
};

loadInitialEmails();

export const getApprovedDomains = () => {
  return (process.env.OFFICIAL_EMAIL_DOMAINS || 'biet.ac.in')
    .split(',')
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
};

export const getAuthorizedAdminEmails = () => {
  return Array.from(runtimeAuthorizedEmails);
};

export const addAuthorizedAdminEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  runtimeAuthorizedEmails.add(normalized);
  return true;
};

export const removeAuthorizedAdminEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return runtimeAuthorizedEmails.delete(normalized);
};

export const isAuthorizedAdminEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();

  // 1. Check explicit allowlist (including Gmail, etc.)
  if (runtimeAuthorizedEmails.has(normalized)) {
    return true;
  }

  // Also check direct env var in case updated
  const envEmails = (process.env.AUTHORIZED_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (envEmails.includes(normalized)) {
    runtimeAuthorizedEmails.add(normalized);
    return true;
  }

  // 2. Check approved official institutional domains
  const domain = normalized.split('@')[1];
  const allowedDomains = getApprovedDomains();
  if (domain && allowedDomains.includes(domain)) {
    return true;
  }

  return false;
};

