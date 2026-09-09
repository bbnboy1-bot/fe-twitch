/**
 * Messages raised by the Supabase RPCs still use the original "Pokemon"
 * wording (kept to avoid a migration). Map them to unit wording here so
 * nothing Pokémon-flavoured reaches the screen.
 */
const PUBLIC_TRANSFER_ERRORS = new Set([
  "A Pokemon cannot be traded for itself",
  "Authentication required",
  "Gift recipient was not found",
  "Invalid gift recipient",
  "Invalid trade decision",
  "Offered Pokemon is not owned by the current user",
  "One of the Pokemon is no longer available",
  "One of the Pokemon is reserved in another trade",
  "Only the recipient can resolve this offer",
  "Only the sender can cancel this offer",
  "Pokemon is not owned by the current user",
  "Pokemon is reserved in an open trade",
  "Requested Pokemon is unavailable",
  "Trade offer not found",
]);

const GENERIC_TRANSFER_ERROR =
  "The transfer could not be completed. Please try again.";

export function getPublicTransferError(message: string) {
  if (!PUBLIC_TRANSFER_ERRORS.has(message)) return GENERIC_TRANSFER_ERROR;
  return message.replace(/A Pokemon/g, "A unit").replace(/Pokemon/g, "unit");
}
