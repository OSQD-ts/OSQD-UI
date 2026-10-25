/**
 * A small password strength scorer: length and variety earn points, predictable shapes lose
 * them. It is a nudge for people choosing a password, not a security control — the server's
 * own rules decide what is accepted.
 */

export type StrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: StrengthScore;
  label: "Too weak" | "Weak" | "Fair" | "Good" | "Strong";
  /** What would make it stronger, most useful first. */
  hints: string[];
}

const LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;

const COMMON = [
  "password",
  "passw0rd",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "login",
  "dragon",
  "monkey",
  "iloveyou",
  "abc123",
  "123456",
  "football",
  "secret",
  "changeme",
];

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "abcdefghijklmnopqrstuvwxyz"];

/** Length of the longest run of characters that step by one, e.g. "abcd" or "4321" or "qwer". */
function longestSequence(s: string): number {
  const lower = s.toLowerCase();
  let best = 1;
  for (const row of ROWS) {
    for (const r of [row, [...row].reverse().join("")]) {
      let run = 1;
      for (let i = 1; i < lower.length; i++) {
        const prev = r.indexOf(lower[i - 1] as string);
        run = prev >= 0 && r[prev + 1] === lower[i] ? run + 1 : 1;
        best = Math.max(best, run);
      }
    }
  }
  return best;
}

export function scorePassword(password: string): PasswordStrength {
  const hints: string[] = [];
  if (password.length === 0) return { score: 0, label: LABELS[0], hints: ["Enter a password."] };

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  let points = 0;
  points += Math.min(password.length, 20) * 4; // length matters most
  points += (classes - 1) * 8;
  if (password.length >= 16) points += 10;

  const lower = password.toLowerCase();
  if (COMMON.some((w) => lower.includes(w))) {
    points -= 40;
    hints.push("Avoid common passwords and words like “password”.");
  }
  const seq = longestSequence(password);
  if (seq >= 4) {
    points -= seq * 5;
    hints.push("Avoid sequences like “abcd” or “1234”.");
  }
  if (/(.)\1{2,}/.test(password)) {
    points -= 15;
    hints.push("Avoid repeating the same character.");
  }
  const unique = new Set(password).size;
  if (unique <= password.length / 3) points -= 15;

  if (password.length < 12) hints.unshift(`Use at least 12 characters (${password.length} now).`);
  if (classes < 3) hints.push("Mix upper and lower case, digits and symbols.");

  const score: StrengthScore = points < 30 ? 0 : points < 45 ? 1 : points < 60 ? 2 : points < 80 ? 3 : 4;
  return { score, label: LABELS[score], hints };
}
