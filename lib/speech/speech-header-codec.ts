export function encodeSpeechHeaderValue(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return encodeURIComponent(value);
}

export function decodeSpeechHeaderValue(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
