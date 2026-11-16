// Bộ validate JSON Schema rút gọn, không cần thư viện ngoài.
// Hỗ trợ: type (kể cả mảng type), enum, required, properties,
// additionalProperties (false | schema), items, minimum, minLength, minItems, pattern.
// Cần nhiều hơn (oneOf, $ref...) thì thay bằng Ajv.

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function typeName(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function isType(v, t) {
  switch (t) {
    case 'object': return isObject(v);
    case 'array': return Array.isArray(v);
    case 'string': return typeof v === 'string';
    case 'boolean': return typeof v === 'boolean';
    case 'null': return v === null;
    case 'integer': return Number.isInteger(v);
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    default: return false;
  }
}

/** Trả về mảng lỗi (rỗng nếu hợp lệ). */
export function validate(value, schema, path = '$') {
  const errors = [];
  if (schema.type !== undefined) {
    const types = [].concat(schema.type);
    if (!types.some((t) => isType(value, t))) {
      errors.push(`${path}: cần kiểu ${types.join('|')}, nhận ${typeName(value)}`);
      return errors;
    }
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: phải là một trong [${schema.enum.join(', ')}]`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: phải >= ${schema.minimum}`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path}: không được rỗng`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: không khớp mẫu ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path}: cần ít nhất ${schema.minItems} phần tử`);
    if (schema.items) value.forEach((item, i) => errors.push(...validate(item, schema.items, `${path}[${i}]`)));
  }
  if (isObject(value)) {
    for (const key of schema.required ?? []) {
      if (!(key in value)) errors.push(`${path}: thiếu trường "${key}"`);
    }
    const props = schema.properties ?? {};
    for (const [key, sub] of Object.entries(props)) {
      if (key in value) errors.push(...validate(value[key], sub, `${path}.${key}`));
    }
    for (const key of Object.keys(value)) {
      if (key in props) continue;
      if (schema.additionalProperties === false) errors.push(`${path}: trường lạ "${key}" (sai chính tả?)`);
      else if (isObject(schema.additionalProperties)) errors.push(...validate(value[key], schema.additionalProperties, `${path}.${key}`));
    }
  }
  return errors;
}
