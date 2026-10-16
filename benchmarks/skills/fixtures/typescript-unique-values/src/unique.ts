export function uniqueValues(values: string[]): string[] {
  return values.sort().filter((value, index, sorted) =>
    index === 0 || value.toLowerCase() !== sorted[index - 1].toLowerCase(),
  );
}
