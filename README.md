# denormalize-mongoose

denormalize-mongoose is a bidirectional denormalize [plugin](https://mongoosejs.com/docs/plugins.html)
for [Mongoose](https://www.npmjs.com/package/mongoose) from version 4.4

![node-current](https://img.shields.io/node/v/denormalize-mongoose)

## Description
Plugin has to be used with a custom [Type](https://mongoosejs.com/docs/schematypes.html)
for Mongoose [Schema](https://mongoosejs.com/docs/guide.html) called Denormalize,
that have options to config how data have to be denormalized.\
It adds pre save handlers to your Schema and can add post remove handler (optional)

## Installation
Plugin can be installed globally once from the library, but it needed to be used before mongoose initialization:
```javascript
require('denormalize-mongoose')();
const mongoose = require('mongoose');
```
Or can be installed manually to every needed schema:
```javascript
const { Denormalize, denormalizePlugin } = require('denormalize-mongoose');
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  name: String,
  post: {
    type: Denormalize,
    paths: ['createdAt', 'title', 'description'],
  },
});
```

If you use [middlewares](https://mongoosejs.com/docs/middleware.html) in Schema - manually initialization of plugin is recommended after all middlewares you want to add.

## Options
**paths** - main option, it defines what fields will be taken from original Document during denormalize process.\
It can be an Array of strings or Object, also it can be combined.
````javascript
const { Denormalize, denormalizePlugin } = require('denormalize-mongoose');
const { Schema, SchemaTypes } = require('mongoose');

const userSchema = new Schema({
  firstName: String,
  lastName: String,
  company: String,
  comments: [{
    type: Denormalize,
    of: SchemaTypes.ObjectId,
    paths: ['text'],
    ref: 'Comment',
  }],
  commentsData: [{
    text: String,
  }]
});

userSchema.virtual('fullName').get(function getFullName() {
  return `${this.firstName} ${this.lastName}`;
});

const commentSchema = new Schema({
  user: {
    type: Denormalize,
    of: SchemaTypes.ObjectId,
    paths: ['fullName', 'company'],
    ref: 'User',
  },
  userData: {
    fullName: String,
    company: String,
  },
  text: String,
});

userSchema.plugin(denormalizePlugin);
commentSchema.plugin(denormalizePlugin);

const User = model('User', userSchema);
const Comment = model('Comment', commentSchema);
````
As you can see from Schema, plugin can take even virtual fields from other Documents,
it's because it populates all the *Denormalize* fields to Document,
so all operations are running on *Documents*

**suffix** and **to** options doing similar things. They represent field of document where to denormalize data.\
**to** - is full path to Object or Array of Objects field to denormalize data, if it defines - **suffix** will be ignored\
**suffix** - string that will be added to name of field where *Denormalize* Type. That joined string will be used to denormalize data (as with **to** option), 'Data' by default
```javascript
const userSchema = new Schema({
  comments: [{
    type: Denormalize,
    of: SchemaTypes.ObjectId,
    suffix: 'SomeEnding',
    paths: ['text'],
    ref: 'Comment',
  }],
  commentsSomeEnding: [{
    text: String,
  }]
});
```
is the same as:
```javascript
const userSchema = new Schema({
  comments: [{
    type: Denormalize,
    of: SchemaTypes.ObjectId,
    to: 'commentsSomeEnding',
    paths: ['text'],
    ref: 'Comment',
  }],
  commentsSomeEnding: [{
    text: String,
  }]
});
```

**of** - option represents [Type](https://mongoosejs.com/docs/schematypes.html) of data used for Document id,
can be everything that Mongoose supports: *ObjectId*, *String*, *Number*, like it will be stored in DB. *ObjectId* by default

**ref** - option is using in the same way as in Mongoose [docs](https://mongoosejs.com/docs/populate.html), so it can be used for population data too.

## Additional
Denormalize operation can also be used with nested fields, so **paths** can be an Object that represents paths inside Document:
```javascript
const userSchema = new Schema({
  comments: [{
    type: Denormalize,
    of: SchemaTypes.ObjectId,
    to: 'commentsSomeEnding',
    paths: {
      text: {
        title: 1,
        desctiption: 'info' // Will rename field in denormalized data
      }
    },
    ref: 'Comment',
  }],
  commentsSomeEnding: [{
    text: String,
  }]
});
```
