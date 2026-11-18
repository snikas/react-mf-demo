import type { ProtectionAction } from '@demo/shell-sdk';

export const DATA_ELEMENTS = ['SSN', 'Credit card', 'Email', 'Date of birth'] as const;
export const CONSUMER_ROLES = ['Analyst', 'Support', 'Auditor'] as const;
export type DataElement = (typeof DATA_ELEMENTS)[number];
export type ConsumerRole = (typeof CONSUMER_ROLES)[number];

export interface Rule {
  id: string;
  dataElement: DataElement;
  role: ConsumerRole;
  action: ProtectionAction;
}

const DEFAULTS: Record<DataElement, Record<ConsumerRole, ProtectionAction>> = {
  SSN: { Analyst: 'tokenized', Support: 'masked', Auditor: 'cleartext' },
  'Credit card': { Analyst: 'tokenized', Support: 'masked', Auditor: 'masked' },
  Email: { Analyst: 'masked', Support: 'cleartext', Auditor: 'cleartext' },
  'Date of birth': { Analyst: 'tokenized', Support: 'masked', Auditor: 'cleartext' },
};

export const initialRules: Rule[] = DATA_ELEMENTS.flatMap((dataElement) =>
  CONSUMER_ROLES.map((role) => ({
    id: `${dataElement}:${role}`.toLowerCase().replace(/\s+/g, '-'),
    dataElement,
    role,
    action: DEFAULTS[dataElement][role],
  })),
);

/** Mock API. Honors AbortSignal so effects can cancel it in cleanup. */
export function fetchRules(signal: AbortSignal, delayMs = 400): Promise<Rule[]> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => resolve(initialRules.map((r) => ({ ...r }))), delayMs);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });
}

export interface PersonRecord {
  id: number;
  name: string;
  values: Record<DataElement, string>;
}

const FIRST = ['Ana', 'Ben', 'Chen', 'Dara', 'Eli', 'Fatima', 'Goran', 'Hana', 'Ivan', 'Jun'];
const LAST = ['Okafor', 'Silva', 'Novak', 'Haddad', 'Kim', 'Larsen', 'Moreau', 'Patel', 'Rossi', 'Tanaka'];

const pad = (n: number, len: number) => String(n).padStart(len, '0');

export const PEOPLE: PersonRecord[] = Array.from({ length: 2000 }, (_, i) => {
  const first = FIRST[i % FIRST.length]!;
  const last = LAST[(i * 7) % LAST.length]!;
  return {
    id: i + 1,
    name: `${first} ${last}`,
    values: {
      SSN: `${pad((i * 37) % 900 + 100, 3)}-${pad((i * 13) % 99 + 1, 2)}-${pad((i * 7919) % 10000, 4)}`,
      'Credit card': `4${pad((i * 104729) % 1000, 3)} ${pad((i * 31) % 10000, 4)} ${pad((i * 17) % 10000, 4)} ${pad((i * 7) % 10000, 4)}`,
      Email: `${first}.${last}${i}@example.com`.toLowerCase(),
      'Date of birth': `19${pad(50 + (i % 50), 2)}-${pad((i % 12) + 1, 2)}-${pad((i % 28) + 1, 2)}`,
    },
  };
});

/** Deterministic, format-preserving pseudo-token: digits stay digits, letters stay letters. */
function tokenize(value: string): string {
  let h = 2166136261;
  return value.replace(/[a-z0-9]/gi, (ch) => {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    if (/\d/.test(ch)) return String(h % 10);
    const base = ch === ch.toUpperCase() ? 65 : 97;
    return String.fromCharCode(base + (h % 26));
  });
}

function mask(value: string): string {
  let seen = 0;
  const keep = 4;
  const total = (value.match(/[a-z0-9]/gi) ?? []).length;
  return value.replace(/[a-z0-9]/gi, (ch) => (++seen > total - keep ? ch : '•'));
}

/** What a given role would see for a value, according to the policy. */
export function protect(value: string, action: ProtectionAction): string {
  if (action === 'cleartext') return value;
  if (action === 'masked') return mask(value);
  return tokenize(value);
}
