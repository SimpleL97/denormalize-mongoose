const { SchemaType, Schema } = require('mongoose');
const getter = require('lodash/get');
const setter = require('lodash/set');

const { transformOptions, dOptions, dSetPaths } = require('./utils');

class Denormalize extends SchemaType {
  constructor(key, options) {
    const { base, patched } = transformOptions(key, options);
    super(key, { ...base, ...patched }, 'Denormalize');

    this[dOptions] = patched;
  }

  cast(val) {
    const $val = this[dOptions].caster(val);
    if (typeof $val === 'number') {
      if (Number.isNaN($val)) {
        throw new Error(`Denormalize: '${val}' illegal cast to NaN`);
      }

      if (!Number.isFinite($val)) {
        throw new Error(`Denormalize: '${val}' illegal cast to Infinite`);
      }
    }

    return $val;
  }

  async [dSetPaths](doc, SpecialConstructor) {
    const { patched: { paths = [], from, to } } = this[dOptions];

    const isPopulated = doc.populated(from) !== undefined;

    if (!isPopulated) {
      await doc.populate(from);
    }

    if (SpecialConstructor === Array) {
      doc.set(to, doc.get(from).map((v) => {
        const object = {};

        paths.forEach(({ get, set }) => {
          setter(object, set, getter(v, get));
        });

        return object;
      }));
    } else if (SpecialConstructor === Map) {
      doc.set(to, new Map(doc.get(from).entries().map(([key, v]) => {
        const object = {};

        paths.forEach(({ get, set }) => {
          setter(object, set, getter(v, get));
        });

        return [key, object];
      })));
    } else {
      const object = {};

      paths.forEach(({ get, set }) => {
        setter(object, set, doc.get(`${from}.${get}`));
      });

      doc.set(to, object);
    }

    if (!isPopulated) {
      doc.depopulate(from);
    }
  }
}

Schema.Types.Denormalize = Denormalize;

module.exports = Denormalize;
