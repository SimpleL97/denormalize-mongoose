import { SchemaTypes, Schema, SchemaType, SchemaTypeOptions } from 'mongoose';

declare type Paths = string[]|Object[]|Paths[];

export class DenormalizeOptions<T> extends SchemaTypeOptions<T> {
  paths: Paths;
}

export declare function plugin(schema: Schema);

declare function denormalizeMongoose(): {
  Denormalize,

}
