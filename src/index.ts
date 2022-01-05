
declare var setTimeout: any;

const RETRY_DEFAULT_MAX_RETRIES = 3
const RETRY_DEFAULT_WAIT_TIME = 500

interface RetryOptions {
    maxRetries?: number
    waitTime?: number
    label?: string
}

type RetryIfOptions = RetryOptions

export async function retryTransformer<T>(
    routine: () => Promise<T>,
    guard: (t: T) => boolean,
    errorGuard: (e: Error) => boolean | Promise<boolean>,
    options?: RetryOptions,
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < (options?.maxRetries || RETRY_DEFAULT_MAX_RETRIES); i++) {
        try {
            const value = await routine()
            if (guard(value)) {
                return value;
            } else {
                throw new Error("Retry guard failed")
            }
        } catch (err) {
            lastError = err as Error
            if (!(await errorGuard(lastError))) throw err
            await new Promise(resolve => setTimeout(resolve, options?.waitTime || RETRY_DEFAULT_WAIT_TIME))
        }
    }

    throw new Error(`${options?.label}::${options?.maxRetries || RETRY_DEFAULT_MAX_RETRIES} retries exceeded. last error: ` + lastError)
}


export async function retry<T>(routine: () => Promise<T>, options?: RetryOptions): Promise<T> {
    return retryTransformer(routine, () => true, () => true, options)
}

export async function retryUntil(routine: () => Promise<boolean>, options?: RetryOptions) {
    await retryTransformer(routine, r => r, () => true, options)
}

export async function retryIf<T>(routine: () => Promise<T>, retryCondition: (error: Error | any) => boolean, options?: RetryIfOptions): Promise<T> {
    return retryTransformer(routine, () => true, retryCondition, options)
}

export async function retryUntilIf(
    routine: () => Promise<boolean>,
    retryCondition: (error: Error | any) => boolean,
    options?: RetryOptions) {

    await retryTransformer(routine, r => r, retryCondition, options)
}

export async function retryWithIntermediateStep<T>(
    routine: () => Promise<T>,
    intermediateStep: () => Promise<void>,
    options?: RetryOptions): Promise<T> {

    return retryTransformer(routine, () => true, _ => intermediateStep().then(_ => true), options)
}

export async function retryUntilWithIntermediateStep(
    routine: () => Promise<boolean>,
    intermediateStep: () => Promise<void>,
    options?: RetryOptions) {

    await retryTransformer(routine, r => r, _ => intermediateStep().then(_ => true), options)
}


