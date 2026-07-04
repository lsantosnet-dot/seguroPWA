// Lembrete de backup — acompanha alterações feitas na base local e sinaliza
// quando faz tempo que o usuário não exporta um backup (arquivo pode ser
// perdido se o navegador limpar os dados ou o aparelho for trocado).
const LAST_BACKUP_KEY = "apolice-last-backup-at";
const CHANGES_KEY = "apolice-changes-since-backup";
const FIRST_CHANGE_KEY = "apolice-first-change-since-backup";
const SNOOZE_KEY = "apolice-backup-snooze-until";

export const REMINDER_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias sem backup
export const SNOOZE_MS = 24 * 60 * 60 * 1000; // "lembrar depois" = amanhã

function getChangesSinceBackup(): number {
  return Number(localStorage.getItem(CHANGES_KEY) ?? "0");
}

/** Chamado a cada mutação na base (ver DbContext). */
export function recordChange() {
  localStorage.setItem(CHANGES_KEY, String(getChangesSinceBackup() + 1));
  if (!localStorage.getItem(FIRST_CHANGE_KEY)) {
    localStorage.setItem(FIRST_CHANGE_KEY, String(Date.now()));
  }
}

/** Chamado após exportar ou importar um backup com sucesso. */
export function recordBackupDone() {
  localStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
  localStorage.removeItem(CHANGES_KEY);
  localStorage.removeItem(FIRST_CHANGE_KEY);
  localStorage.removeItem(SNOOZE_KEY);
}

export function snoozeBackupReminder() {
  localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
}

export function shouldRemindBackup(): boolean {
  if (getChangesSinceBackup() <= 0) return false;
  const snoozeUntil = Number(localStorage.getItem(SNOOZE_KEY) ?? "0");
  if (Date.now() < snoozeUntil) return false;
  const baseline = Number(localStorage.getItem(FIRST_CHANGE_KEY) ?? Date.now());
  return Date.now() - baseline >= REMINDER_INTERVAL_MS;
}
