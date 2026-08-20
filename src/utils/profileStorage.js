// Local draft cache for the profile forms.
//
// ⚠️ KEYED PER LEARNER PROFILE, not per account.
//
// These keys used to be flat ("shiksha_public_profile" /
// "shiksha_private_details"), i.e. shared by every child on the account. One
// email holds several LearnerProfiles, so switching from child A to child B
// pre-filled B's profile form with A's stored name, phone, DOB and address —
// a sibling PII leak, and one that could be SAVED onto the wrong child if the
// parent didn't notice the pre-filled values.
//
// The id is passed in by the caller (from AuthContext's activeProfile) rather
// than read here, so this module stays a dumb storage helper with no context
// dependency. A null/undefined id falls back to a clearly-marked anonymous
// bucket — never to the old shared key.

const PUBLIC_PREFIX = "shiksha_public_profile";
const PRIVATE_PREFIX = "shiksha_private_details";

// The pre-fix flat keys. Read once for migration, then deleted, so a user
// mid-edit doesn't lose their draft on the version they upgrade through.
const LEGACY_PUBLIC = "shiksha_public_profile";
const LEGACY_PRIVATE = "shiksha_private_details";

const keyFor = (prefix, profileId) => `${prefix}.${profileId || "anon"}`;

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch {
    return {};
  }
}

function write(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...read(key), ...data }));
  } catch {
    /* quota / private mode — a form draft is not worth throwing over */
  }
}

// One-time move of a flat key onto the ACTIVE profile. Deliberately only
// claims the legacy value for the first profile that asks: it belonged to
// whoever last used the form, and there is no way to tell which child that
// was, so copying it to every profile would spread the leak rather than fix
// it. Cleared either way.
function migrate(legacyKey, scopedKey) {
  let legacy;
  try {
    legacy = localStorage.getItem(legacyKey);
  } catch {
    return;
  }
  if (!legacy) return;
  try {
    if (!localStorage.getItem(scopedKey)) localStorage.setItem(scopedKey, legacy);
    localStorage.removeItem(legacyKey);
  } catch {
    /* ignore */
  }
}

export function getPublicProfile(profileId) {
  const key = keyFor(PUBLIC_PREFIX, profileId);
  migrate(LEGACY_PUBLIC, key);
  return read(key);
}

export function savePublicProfile(data, profileId) {
  write(keyFor(PUBLIC_PREFIX, profileId), data);
}

export function getPrivateDetails(profileId) {
  const key = keyFor(PRIVATE_PREFIX, profileId);
  migrate(LEGACY_PRIVATE, key);
  return read(key);
}

export function savePrivateDetails(data, profileId) {
  write(keyFor(PRIVATE_PREFIX, profileId), data);
}
