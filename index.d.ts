import { SchemaType, SchemaTypeOptions, RefType, Schema } from 'mongoose';

interface Paths {
  [key: string]: string | number | boolean | string[] | Paths[]
}

interface DenormalizePluginOptions {
  useOnRemove?: boolean;
}

declare module 'mongoose' {
  export type Denormalize = Schema.Types.Denormalize;

  export class DenormalizeSchemaTypeOptions<T> extends SchemaTypeOptions<T> {
    to?: string
    from?: string
    suffix?: string
    paths?: string[]|Paths|Paths[]
  }

  namespace Schema {
    namespace Types {
      export class Denormalize extends SchemaType {
        OptionsConstructor: typeof DenormalizeSchemaTypeOptions;
        /**
         * @param {Schema} schema
         * @param {DenormalizePluginOptions} [options]
         * @param {boolean} [options.useOnRemove=true]
         */
        static denormalizePlugin(schema: Schema, options?: DenormalizePluginOptions): void
      }
    }
  }
}

export type Denormalize = Schema.Types.Denormalize;

/**
 * @param {Schema} schema
 * @param {DenormalizePluginOptions} [options]
 * @param {boolean} [options.useOnRemove=true]
 */
export function denormalizePlugin(schema: Schema<any>, options?: DenormalizePluginOptions): void;

/**
 * @param {DenormalizePluginOptions} [options]
 * @param {boolean} [options.useOnRemove=true]
 * @returns {Denormalize}
 */
export default function initDenormalize(options?: DenormalizePluginOptions): Denormalize;
