const mongoose = require('mongoose');
const async = require('async');
const Graph = require('graph-data-structure');
const Denormalize = require('./Denormalize');
const {
  getSchemaType,
  getDenormalizeOptions,
  dSetPaths,
  dOptions,
  getModel,
  connections,
  connectionsMap,
} = require('./utils');

const getDenormalizeSchemaTypes = getSchemaType(Denormalize);
const mongooseGraph = Symbol('mongoose#graph');
const enforcedBy = Symbol('mongoose#enforcedBy');

module.exports = function denormalizePlugin(schema) {
  schema.pre('save', async function denormalizePluginPreSave() {
    this[mongooseGraph] = this[mongooseGraph] || Graph();

    await async.eachLimit(getDenormalizeSchemaTypes(schema), 2, async ([, schemaType]) => {
      const [_schemaType, SpecialConstructor] = getDenormalizeOptions(schemaType);
      const { patched: { from } } = _schemaType[dOptions];

      const ownModel = getModel(this);

      const { links = [] } = connections.serialize();

      const outdegree = links.filter(({ source }) => source === ownModel);

      if (this[enforcedBy] || this.isModified(from)) {
        await _schemaType[dSetPaths](this, SpecialConstructor);
      }

      if (outdegree.length && this.modifiedPaths().length) {
        await async.eachLimit(outdegree, 1, async ({ target }) => {
          const paths = connectionsMap.get(`${ownModel}:${target}`) || [];

          await async.eachLimit(paths, 2, async ({ from: $from }) => {
            const docs = await mongoose.model(target)
              .find({ [$from]: this._id }).cursor();

            await async.eachLimit(docs, 1, async (doc) => {
              const $own = `${ownModel}:${this._id}`;
              const $external = `${target}:${doc._id}`;

              if (!this[mongooseGraph].hasEdge($own, $external)) {
                this[mongooseGraph].addEdge($own, $external);

                doc[mongooseGraph] = this[mongooseGraph];
                doc[enforcedBy] = true;

                await doc.save();
              }
            });
          });
        });
      }
    });

    delete this[mongooseGraph];
    delete this[enforcedBy];
  });
};
