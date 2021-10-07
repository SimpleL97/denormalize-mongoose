const mongoose = require('mongoose');
const groupBy = require('lodash/groupBy');
const denormalize = require('./plugin');
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

mongoose.model = new Proxy(mongoose.model, {
  apply(target, thisArg, argArray) {
    const result = Reflect.apply(target, thisArg, argArray);

    if (argArray.length > 1) {
      const { schema, modelName } = result;

      Object.entries(groupBy(getDenormalizeSchemaTypes(schema).map(([, schemaType]) => {
        const [type] = getDenormalizeOptions(schemaType);

        const { patched: { from, to } } = type[dOptions];

        connections.addEdge(getRef(schema.path(from)), modelName);

        return { to, from, edge: `${getRef(schema.path(from))}:${modelName}` };
      }), ({ edge }) => edge)).forEach(([edge, $paths]) => connectionsMap.set(edge, $paths));
    }

    return result;
  },
});

let isInited = false;

function initDenormalize() {
  if (!isInited) {
    mongoose.plugin(denormalize);

    isInited = true;
  }

  return Denormalize;
}

initDenormalize.Denormalize = Denormalize;
initDenormalize.plugin = denormalize;

module.exports = initDenormalize;
