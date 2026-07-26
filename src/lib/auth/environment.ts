export function missingEnvironmentNames(
  names: readonly string[],
  environment: Record<string, string | undefined> = process.env,
): string[] {
  return names.filter((name) => !environment[name]?.trim());
}
