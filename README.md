# Just try again

Again is a pure typescript library with zero dependencies for implementing retry logic in asynchronous code.

## How it works

The library exports a number of variants of retry functions, which all take the form `retry[If/Until/WithIntermediateStep]`. At it's core retry will perform the following:  

- Run the routine passed to it.
- If it didn't throw, returns the result, unless it's a `Until` variant, in which case the return value is checked for truthiness first and we continue retrying if it's not truthy.
- If the routine did throw and we are in a `If` variant, checks the error against the If-Guard and throws the error if the guard returns false.
- If we are in an `WithIntermediateStep` variant, we run the intermediate step
- We then perform an asynchronous sleep for `options?.waitTime || RETRY_DEFAULT_WAIT_TIME` milliseconds
- Finally we go to the top until `options?.maxRetries || RETRY_DEFAULT_MAX_RETRIES` is exceeded. If the max number of retries is exceeded, we throw the last error that occured.

## Examples

We use these retry blocks extensively in end-to-end testing where things regularily can and will fail. All these examples are representative of real code from our tests.

### The most basic retry - If we don't throw, we are good

```ts
// @note: Turning off the relay can fail, if another process is currently holding on to the serial channel
await retry(() => relay.off(this.podConfig.speaker.powerRelayChannel))
```

### retryIf - Protecting against specific annoying errors
The original motivation for retryIf. State element exceptions happen constantly and for no specific reason in E2E-Testing. Everywhere we can, we use this decorator to make our tests robust against that specific error.

```ts
export function isStaleElementException(e: Error): boolean {
    return (e as Error).name === "stale element reference"
}

/*
Decorator that wraps a function in a retryIf to protect against 'stale element reference' errors
Other errors will still bubble up normally
*/
export function retryIfStaleElementException(target: any, name: string, descriptor: PropertyDescriptor) {
    const inner = descriptor.value
    descriptor.value = function (...args: any[]) {
        return retryIf(() => inner.apply(this, args), isStaleElementException)
    }
}
```

### retryUntil - waiting for state changes
When you can't predict how long something is going to take, this is a pretty solid way of waiting for state changes.
```ts
/// Wait for the speaker to automatically reconnect
await retryUntil(async () => Boolean(await settings.isDeviceConnected(config.speaker.teamId)))
```

### retryWithIntermediateStep - aka. the big gun
Sometimes when times are rough, the only thing that helps is to literally "turn it off and on again".
```ts
await retryWithIntermediateStep(async () => {
    await settings.pairDevice(config.speaker.teamId);
}, async () => {
    await settings.ensureBluetoothReenabled( )
}, { waitTime: 1000 })
```