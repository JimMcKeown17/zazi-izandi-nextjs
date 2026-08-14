const UTC_MICROSECOND_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/;

export function timestampMicros(value: string): bigint {
  const match = UTC_MICROSECOND_TIMESTAMP_PATTERN.exec(value);
  if (!match) throw new TypeError("invalid timestamp");
  const [secondPart, fractionPart = ""] = value.slice(0, -1).split(".");
  const secondMillis = Date.parse(`${secondPart}Z`);
  return (
    BigInt(secondMillis) * BigInt(1000) +
    BigInt(fractionPart.padEnd(6, "0"))
  );
}
