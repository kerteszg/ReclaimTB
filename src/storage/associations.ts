export type AssociationKind = "event" | "task";
export type AssociationStatus = "pending" | "created" | "failed";

export interface Association {
  kind: AssociationKind;
  status: AssociationStatus;
  providerId?: string;
  link?: string;
  title?: string;
  createdAt: string;
  error?: string;
  /** Client-generated id for the attempt (idempotency) */
  attemptId: string;
}

export type AssociationsMap = Record<string, Association[]>;

const STORAGE_KEY = "associations";

async function load(): Promise<AssociationsMap> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as AssociationsMap) || {};
}

async function save(map: AssociationsMap): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: map });
}

export async function getAssociations(messageId: string): Promise<Association[]> {
  const map = await load();
  return map[messageId] ?? [];
}

export async function hasCreated(
  messageId: string,
  kind: AssociationKind,
): Promise<Association | undefined> {
  const list = await getAssociations(messageId);
  return list.find((a) => a.kind === kind && a.status === "created");
}

export async function addAssociation(
  messageId: string,
  association: Association,
): Promise<void> {
  const map = await load();
  const list = map[messageId] ?? [];
  list.push(association);
  map[messageId] = list;
  await save(map);
}

export async function updateAssociation(
  messageId: string,
  attemptId: string,
  patch: Partial<Association>,
): Promise<void> {
  const map = await load();
  const list = map[messageId] ?? [];
  const idx = list.findIndex((a) => a.attemptId === attemptId);
  if (idx === -1) return;
  list[idx] = { ...list[idx], ...patch };
  map[messageId] = list;
  await save(map);
}

export async function listAllAssociations(): Promise<AssociationsMap> {
  return load();
}
