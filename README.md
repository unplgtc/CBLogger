[![CircleCI master build status](https://img.shields.io/circleci/project/github/unplgtc/CBLogger/master.svg?label=master&logo=circleci)](https://circleci.com/gh/unplgtc/CBLogger/tree/master)
[![npm version](https://img.shields.io/npm/v/@unplgtc/cblogger.svg)](https://www.npmjs.com/package/@unplgtc/cblogger)

# CBLogger

### Quality logger for Node applications

CBLogger can help you put an end to loosely formatted log messages. As your Node projects grow larger, haphazard and unstandardized log output become significantly less effective. If you don't have a strategy for identifying the source of your log messages and tagging them with timestamps, tracking down bugs with those logs becomes unnecessarily difficult and time consuming.

CBLogger provides a light interface which you can use in place of calls to `console.log`, `console.error`, or `console.trace`. Pass in some simple parameters and CBLogger will assemble and print your log messages in a standardized and information-rich way. Full stack traces can be added to any log message by flagging an option, but every log will always include the filename and line number of the CBLogger call, as well as both human-readable and [Unix epoch](https://en.wikipedia.org/wiki/Unix_time) timestamps.

Once you transition to CBLogger, your application's log output will be richer and more useful. Monitoring and debugging problems will be easier than ever before.

## Usage

Install CBLogger from npm:

```
$ npm install @unplgtc/cblogger --save
```

Import CBLogger into a service:

```js
const CBLogger = require('@unplgtc/cblogger');
```

CBLogger support four different log output calls: `CBLogger.debug`, `CBLogger.info`, `CBLogger.warn`, and `CBLogger.error`. All four use identical interfaces, so they can be used interchangeably based solely on what level of log you need to output. All arguments to CBLogger calls are optional, but you should at least include a `key` if you want your logs to mean anything.

The first argument CBLogger accepts is named `key`, and if you're following best practices then each key should be unique to each log message (or at least to a very small set of log messages). If your Node project is minuscule and that's already a stricter mandate than you're looking for, don't leave yet. CBLogger at its most basic supports a very similar interface to the familiar `console.log`. Feel free to pass in nothing but an arbitrary string of text for your `key` and CBLogger will happily output it. If you want to dump the contents of an Object, just use the `data` param — CBLogger's second argument.

```js
// MyService.js

CBLogger.info('Some arbitrary text');
```

Annotated output:

```
INFO: ** Some arbitrary text 
-> MyService.js L3 at 2018-10-08 03:50:35.417Z (1538970635417)
   ^            ^     ^                         ^
   Filename   Line #  Human-readable timestamp  Epoch timestamp
```

Log arbitrary text and an Object:

```js
var someObject = {
	foo: 'bar'
}
CBlogger.debug('Description of this object', someObject);
```

Output:

```
DEBUG: ** Description of this object 
{ foo: 'bar' } 
-> MyService.js L4 at 2018-10-08 03:50:35.417Z (1538970635417) 
```

Using CBLogger with unique keys works the exact same way, and has the added bonus of improving log aggregation techniques if you ever need to implement them. Keys are more easily identifiable in manual log searches as well. Here's an example with a `warn` message:

```js
CBLogger.warn('unique_key_for_this_warning', someObject);
```

Output:

```
WARN: ** unique_key_for_this_warning 
{ foo: 'bar' } 
-> MyService.js L5 at 2018-10-08 03:50:35.417Z (1538970635417) 
```

The second argument to any CBLogger log call, `data`, accepts any JavaScript Object. You can pass in your own Objects you want to output if you need no context around them other than your key, but it's also a good place to type out more descriptive messages in non-key form for your logs:

```js
CBLogger.info('some_info_key', {message: 'This is what happened', theObject: someObject});
```

Output:

```
INFO: ** some_info_key 
{ message: 'This is what happened', theObject: { foo: 'bar' } } 
-> MyService.js L4 at 2018-10-08 03:50:35.417Z (1538970635417) 
```

If the Object in your `data` field grows long enough, it will be split out onto separate lines:

```js
CBLogger.info('some_info_key', {message: 'This is what happened', theObject: someObject, bar: 'baz'});
```

Output:

```
INFO: ** some_info_key 
{ message: 'This is what happened',
  theObject: { foo: 'bar' },
  bar: 'baz' } 
-> MyService.js L4 at 2018-10-08 03:50:35.417Z (1538970635417) 
```

## Options

The third CBLogger argument is `options`, and unsurprisingly it takes an Object with which you can flag various options. Currently CBLogger supports four options: `stack`, `ts`, `alert`, and `webhook`.

Setting `stack` to `true` in the `options` parameter of any call to CBLogger will result in a full stacktrace being appended to your log's output:

```js
CBLogger.info('some_info_key', {message: 'This is what happened'}, {stack: true});
```

Output:

```
INFO: ** some_info_key 
{ message: 'This is what happened' } 
-> MyService.js L4 at 2018-10-08 03:50:35.417Z (1538970635417) 
   at Object.<anonymous> (/Users/path/to/file/src/MyService.js:4:10)
    at Module._compile (module.js:643:30)
    at Object.Module._extensions..js (module.js:654:10)
    at Module.load (module.js:556:32)
    at tryModuleLoad (module.js:499:12)
    at Function.Module._load (module.js:491:3)
    at Function.Module.runMain (module.js:684:10)
```

The `ts` options is always true by default, but you can explicitly set it to `false` if you want to remove the timestamps from your log output. This may be useful if your log data already includes a timestamp, of if you're using a process manager like PM2 and want to use its log timestamps instead of CBLogger's (a global flag for this option is coming in a future update).

```js
CBLogger.info('some_info_key', {message: 'This is what happened'}, {ts: false});
```

Output:

```
INFO: ** some_info_key 
{ message: 'This is what happened' } 
-> MyService.js L4
```

The `alert` and `webhook` options trigger custom webhook alerting objects which CBLogger can be extended with. See the "Extending with Alerters" section below for more information on using these options.

## Err

`err` is the fourth and final argument for CBLogger's log output functions. `err` can be any object, but by convention it should represent an actual error that the log message pertains to. This argument is often used for JavaScript `Error` objects which have been thrown and caught and need to be outputted into your logs. You can also use [StandardError](https://github.com/unplgtc/StandardError) errors for this argument, but those are most commonly placed in the `data` Object so that `err` is free for a thrown error. Whatever you choose to pass in for `err`, it will be printed underneath the `data` object, preceded by two asterisks.

```js
CBLogger.error('some_error_key', {message: 'Uh oh there was an error'}, undefined, new Error('oh no'));
```

Output:

```
INFO: ** some_error_key 
{ message: 'Uh oh there was an error' } 
** Error: oh no
    at Object.<anonymous> (/Users/path/to/file/src/MyService.js:7:79)
    at Module._compile (module.js:643:30)
    at Object.Module._extensions..js (module.js:654:10)
    at Module.load (module.js:556:32)
    at tryModuleLoad (module.js:499:12)
    at Function.Module._load (module.js:491:3)
    at Function.Module.runMain (module.js:684:10)
    at startup (bootstrap_node.js:187:16)
    at bootstrap_node.js:608:3 
-> test.js L7 at 2018-10-11 04:00:27.363Z (1539230427363)
```

If you are outputting an actual JavaScript `Error` Object — as by convention you generally should be for the `err` argument — then you can omit the `options` or `data` arguments on occassions where you have no options or data to pass. This means there's no need to add unnecessary `undefined` or `null` arguments to space out your CBLogger call such that `err` is the fouth arg. In other words, this call:

```js
CBLogger.error('some_error_key', {message: 'Uh oh there was an error'}, undefined, new Error('oh no'));
```

Is entirely equivalent to this call:

```js
CBLogger.error('some_error_key', {message: 'Uh oh there was an error'}, new Error('oh no'));
```

Similarly, if no extra data output is needed, this call will set the `Error` to the `err` argument as well:

```js
CBLogger.error('some_error_key', new Error('oh no'));
```

Again, this shortcut only works with actual `Error` Objects (or extensions of the `Error` Object), so if you want a string or other Object output as `err` then you will need to space the arguments with `undefined` or `null` as necessary.

## Extending with Alerters

CBLogger supports being extended with a single "alerter" Object. This can be any Object which implements a function named `alert`, but if your alerts just require sending a POST message to a webhook, Unapologetic's [CBAlerter](https://github.com/unplgtc/CBAlerter) package has been purpose-built for this use case.

To extend CBLogger with an alerter Object (exemplified here with CBAlerter, but that is not required) just pass the Object to CBLogger's `extend()` function:

```js
const CBLogger = require('@unplgtc/cblogger');
const CBAlerter = require('@unplgtc/cbalerter');

CBLogger.extend(CBAlerter);

// Log an error and trigger an alert with CBAlerter
CBLogger.error('some_error_key', {message: 'Uh oh there was an error and we should be alerted about it!'}, {alert: true}, new Error());
```

Once extended, when CBLogger receives a call with the `alert: true` option set, it will call its alerter and pass all of the data it was given. The alerter will post that data to whatever source it has set up, then let CBLogger know whether the request was successful. If the alert succeeded then CBLogger does nothing further, but if the alert failed then CBLogger will output an error message so that you can tell your alerts aren't going through.

When attempting to extend CBLogger, `CBLogger.extend()` will return `true` if the extension was successful, `false` otherwise. Currently all Objects which implement `alert()` functions are accepted, but in order for the alerts to work without throwing errors there are a few further requirements.

A valid alerter needs to not just implement a function named `alert`, but that function must take five arguments: `level`, `key`, `data`, `options`, and `err`. The function must also return a Promise that will unwrap to the success or failure of the alert.

In the example above, CBLogger would call its extended alerter with  `alert('ERROR', key, data, options, err)`. Assuming that alerter Object is functional, it will in turn post that message to a webhook somewhere and return the success value as a Promise to CBLogger. The `level` argument will be `'DEBUG'`, `'INFO'`, `'WARN'`, or `'ERROR'`, depending on which CBLogger function was called. The remaining arguments are passed to the alerter just as they were passed to CBLogger.

Finally, if for some reason you want to _change_ the alerter Object that CBLogger is extended with, you'll need to explicitly remove the existing alerter before being able to extend with a new one. This can be done with CBLogger's `unextend()` method.

```js
var result = CBLogger.extend(CBAlerter);
// true

result = CBLogger.extend(someAlerter);
// StandardError.CBLogger_409 (Logger has already been extended)

result = CBLogger.unextend();
// true

result = CBLogger.extend(someAlerter);
// true
```

## cls-rtracer Support

CBLogger supports outputting request IDs if your application is using the [cls-rtracer package](https://github.com/puzpuzpuz/cls-rtracer). cls-rtracer uses the [`AsyncLocalStorage` class](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage) from the experimental [`async_hooks` core Node module](https://nodejs.org/api/async_hooks.html) to generate unique IDs for requests coming into your application. cls-rtracer supports several different server middlewares, including [Express](https://expressjs.com). If you add support for cls-rtracer to your application, CBLogger will automatically identify this and include request IDs in your log output — no configuration required.
