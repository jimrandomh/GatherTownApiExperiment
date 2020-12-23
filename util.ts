
export function isJson(str: string): boolean {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

/*export function stringToArrayBuffer(s: string) {
  var binary_string = Buffer.from(s).toString(`binary`);
  var len = binary_string.length;
  var bytes = new Uint8Array(len + 1);
  // We have to do some manual operation here because the Gather Town packages all start with \u0, which doesn't parse in UTF-8 (I think)
  bytes[1] = 123
  for (var i = 1; i <= len; i++) {
    bytes[i + 1] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}*/

export function stringToArrayBuffer(s: string) {
  var binary_string = Buffer.from(s).toString(`binary`);
  var len = binary_string.length;
  var bytes = new Uint8Array(len);
  for (var i = 0; i <= len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}