// data:image/png;base64,AAAA... -> { mimeType, dataBase64 }
export function dataUrlToInlineImage(dataUrl) {
  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl || "");
  if (!match) return null;
  return { mimeType: match[1], dataBase64: match[2] };
}
