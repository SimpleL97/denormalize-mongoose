const mongoose = require('mongoose');
const groupBy = require('lodash/groupBy');
const entries = require('lodash/entries');
const denormalizePlugin = require('./denormalizePlugin');
const Denormalize = require('./Denormalize');

const {
  getDenormalizeOptions,
  dOptions,
  connections,
  getRef,
  connectionsMap,
  getSchemaType,
} = require('./utils');

const getDenormalizeSchemaTypes = getSchemaType(Denormalize);
const byEdge = ({ edge }) => edge;

mongoose.model = new Proxy(mongoose.model, {
  apply(target, thisArg, argArray) {
    const result = Reflect.apply(target, thisArg, argArray);

    if (argArray.length > 1) {
      const { schema, modelName } = result;

      entries(groupBy(getDenormalizeSchemaTypes(schema).map(([, schemaType]) => {
        const [type] = getDenormalizeOptions(schemaType);

        const { patched: { from, to } } = type[dOptions];

        const refModel = getRef(schema.path(from));

        connections.addEdge(refModel, modelName);

        return { to, from, edge: `${refModel}:${modelName}` };
      }), byEdge)).forEach(([edge, $paths]) => connectionsMap.set(edge, $paths));
    }

    return result;
  },
});

let isInited = false;

/**
 * @param {Object} [options]
 * @param {boolean} [options.useOnRemove=true]
 * @returns {Denormalize}
 */
function initDenormalize(options) {
  if (!isInited) {
    mongoose.plugin(denormalizePlugin, options);

    isInited = true;
  }

  return Denormalize;
}
Denormalize.denormalizePlugin = denormalizePlugin;
Denormalize.Denormalize = Denormalize;

initDenormalize.Denormalize = Denormalize;
initDenormalize.denormalizePlugin = denormalizePlugin;

module.exports = initDenormalize;
