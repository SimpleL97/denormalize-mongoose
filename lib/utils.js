const { SchemaTypes } = require('mongoose');
const defaults = require('lodash/defaults');
const isArray = require('lodash/isArray');
const isObject = require('lodash/isObject');
const pick = require('lodash/pick');
const flatten = require('lodash/flatten');
const entries = require('lodash/entries');
const Graph = require('graph-data-structure');

const dSetPaths = Symbol('mongoose#denormalizeOptions');
const dOptions = Symbol('mongoose#setPaths');

const connections = Graph();
const connectionsMap = new Map();

const $defaults = {
  paths: [],
  suffix: 'Data',
};

class DenormalizeError extends Error {
  /**
   * @param {string} key
   * @param {string|string[]} option
   * @param {string} message
   */
  constructor(key, option, message) {
    const options = isArray(option) ? option : [option];
    const optionsString = `'${options.join('|')}'`;

    super(`Denormalize: ${optionsString}' option in '${key}' field ${message}`);

    this.option = option;
    this.key = key;
  }
}

const primitives = {
  String,
  Number,
  Symbol,
  Array,
};

const processOf = (key, of) => {
  if (typeof of === 'string') {
    if (!primitives[of] && !SchemaTypes[of]) {
      throw new DenormalizeError(key, 'of', `There is no '${of}' type`);
    }

    return primitives[of] || SchemaTypes[of];
  }

  return primitives[of.name] || SchemaTypes[of.name] || ((v) => new of(v));
};

/**
 * @param {Object|Array} paths
 */
function normalisePaths(paths = {}) {
  if (isArray(paths)) {
    return paths.map((v) => {
      if (typeof v === 'object') {
        return normalisePaths(v);
      }

      return v;
    });
  }

  return flatten(entries(paths).map(([key, values]) => {
    if (isArray(values) || typeof values === 'object') {
      return flatten(normalisePaths(values)).map((v) => `${key}.${v}`);
    }

    if (['number', 'boolean'].includes(typeof values)) {
      return key;
    }

    return `${key}:${values}`;
  }));
}

const groupPaths = (paths) => paths.map((path) => {
  const [get, set] = path.split(/[:]+/g);

  let $set = get;
  if (set) {
    const [, ...rest] = get.split(/[.]+/).reverse();

    $set = `${rest.reverse().join('.')}.${set}`
      .replace(/^[.]|[.]$/g, '');
  }

  return { get, set: $set };
});

const processPaths = (paths) => groupPaths(normalisePaths(paths)
  .sort((a, b) => a.split('.').length - b.split('.').length));

const transformOptions = (key, _options) => {
  const options = defaults(_options, $defaults);

  if (!isArray(options.paths) && !isObject(options.paths)) {
    throw new DenormalizeError(key, 'paths', 'have to be an Array<string> or Object<string>');
  }

  let isInternal = false;

  if (options.of) {
    if (!options.to && !options.suffix) {
      throw new DenormalizeError(key, 'suffix', 'has to be not empty String');
    }

    if (!options.ref) {
      throw new DenormalizeError(key, 'ref', 'has to be not empty String');
    }

    if (!(options.of.constructor instanceof Function) && typeof options.of !== 'string') {
      throw new DenormalizeError(key, 'of', 'has to constructor or type in string');
    }

    isInternal = true;
  } else if (!options.from) {
    throw new DenormalizeError(key, 'from', 'has to be not empty path to existing field with ref');
  }

  const base = pick(options, ['ref', 'validate', 'set', 'get']);
  const patched = pick(options, ['suffix', 'paths', 'of', 'from', 'to']);

  patched.isInternal = isInternal;
  patched.key = key;
  patched.caster = function caster(v) {
    if (patched.isInternal) {
      const process = processOf(key, patched.of);

      if (v && v.constructor.name === process.name) {
        return v;
      }

      return process(v);
    }

    return v;
  };

  patched.patched = {
    paths: processPaths(patched.paths),
    to: (isInternal && (patched.to || `${key}${patched.suffix}`)) || key,
    from: (isInternal && key) || patched.from,
  };

  return { base, patched };
};

const getSchemaType = (type) => (schema) => Object.entries(schema.paths)
  .filter(([, schemaType]) => {
    if (['SchemaArray', 'SchemaMap'].includes(schemaType.constructor.name)) {
      return schemaType.caster instanceof type;
    }

    return schemaType.constructor === type;
  });

const getDenormalizeOptions = (schemaType) => {
  if (schemaType.constructor.name === 'SchemaArray') {
    return [schemaType.caster, Array];
  }

  if (schemaType.constructor.name === 'SchemaMap') {
    return [schemaType.caster, Map];
  }

  return [schemaType, false];
};

function getRef(schemaType) {
  return schemaType.options.ref || getRef(schemaType.caster);
}

function getModel(doc) {
  return doc.constructor.modelName || getModel(doc.$parent());
}

module.exports = {
  dOptions,
  dSetPaths,
  transformOptions,
  getSchemaType,
  getDenormalizeOptions,
  getRef,
  getModel,
  connections,
  connectionsMap,
};
