/**
 * Created by tushar on 2019-05-20
 */

import {ICancellable, IScheduler} from 'ts-scheduler'

import {CB} from '../internals/CB'

import {Await} from './Await'
import {Fiber} from './Fiber'
import {Instruction, Tag} from './Instructions'

const Id = <A>(_: A): A => _

export type IO<E, A> = FIO<unknown, E, A>
export type Task<A> = IO<Error, A>
export type UIO<A> = IO<never, A>
const asapCB = <R1, A1>(res: CB<A1>, cb: (env: R1) => A1, env: R1) =>
  res(cb(env))

export class FIO<R1 = unknown, E1 = unknown, A1 = unknown> {
  public constructor(
    public readonly tag: Tag,
    // tslint:disable-next-line: no-unnecessary-initializer
    public readonly i0: unknown = undefined,
    // tslint:disable-next-line: no-unnecessary-initializer
    public readonly i1: unknown = undefined
  ) {}

  public static access<R1, A1>(cb: (env: R1) => A1): FIO<R1, never, A1> {
    return FIO.async((env, _, res, sh) => sh.asap(asapCB, res, cb, env))
  }

  public static accessM<R1, E1, A1>(
    cb: (env: R1) => FIO<R1, E1, A1>
  ): FIO<R1, E1, A1> {
    return FIO.access(cb).chain(Id)
  }

  public static accessP<R1 = unknown, E1 = never, A1 = unknown>(
    cb: (env: R1) => Promise<A1>
  ): FIO<R1, E1, A1> {
    return FIO.async((env, rej, res, sh) =>
      sh.asap(() => {
        cb(env)
          .then(res)
          .catch(rej)
      })
    )
  }

  public static constant<A1>(value: A1): UIO<A1> {
    return new FIO(Tag.Constant, value)
  }

  public static chain<R1, E1, A1, R2, E2, A2>(
    fa: FIO<R1, E1, A1>,
    aFb: (a: A1) => FIO<R2, E2, A2>
  ): FIO<R1 & R2, E1 | E2, A2> {
    return new FIO(Tag.Chain, fa, aFb)
  }

  public static map<R1, E1, A1, A2>(
    fa: FIO<R1, E1, A1>,
    ab: (a: A1) => A2
  ): FIO<R1, E1, A2> {
    return new FIO(Tag.Map, fa, ab)
  }

  public static catch<R1, E1, A1, R2, E2, A2>(
    fa: FIO<R1, E1, A1>,
    aFe: (e: E1) => FIO<R2, E2, A2>
  ): FIO<R1 & R2, E2, A2> {
    return new FIO(Tag.Catch, fa, aFe)
  }

  /**
   * **NOTE:** The default type is set to `never` because it hard for typescript to infer the types based on how we use `res`.
   * Using `never` will give devs compile time error always while using.
   */
  public static async<R1 = never, E1 = never, A1 = never>(
    cb: (env: R1, rej: CB<E1>, res: CB<A1>, sh: IScheduler) => ICancellable
  ): FIO<R1, E1, A1> {
    return new FIO(Tag.Async, cb)
  }

  public static asyncIO<E1 = never, A1 = never>(
    cb: (rej: CB<E1>, res: CB<A1>, sh: IScheduler) => ICancellable
  ): IO<E1, A1> {
    return FIO.async((env, rej, res, sh) => cb(rej, res, sh))
  }

  public static asyncTask<A1 = never>(
    cb: (rej: CB<Error>, res: CB<A1>, sh: IScheduler) => ICancellable
  ): Task<A1> {
    return FIO.async((env, rej, res, sh) => cb(rej, res, sh))
  }

  public static asyncUIO<A1 = never>(
    cb: (res: CB<A1>, sh: IScheduler) => ICancellable
  ): UIO<A1> {
    return FIO.async((env, rej, res, sh) => cb(res, sh))
  }

  public static encase<E, A, T extends unknown[]>(
    cb: (...t: T) => A
  ): (...t: T) => IO<E, A> {
    return (...t) => FIO.io(() => cb(...t))
  }

  public static encaseP<E, A, T extends unknown[]>(
    cb: (...t: T) => Promise<A>
  ): (...t: T) => IO<E, A> {
    return (...t) =>
      FIO.async((env, rej, res, sh) =>
        sh.asap(() => {
          void cb(...t)
            .then(res)
            .catch(rej)
        })
      )
  }

  public static never(): UIO<never> {
    return new FIO(Tag.Never, undefined)
  }

  public static of<A1>(value: A1): UIO<A1> {
    return new FIO(Tag.Constant, value)
  }
  public static reject<E1>(error: E1): IO<E1, never> {
    return new FIO(Tag.Reject, error)
  }

  /**
   * @ignore
   */
  public static resume<A1, A2>(cb: (A: A1) => A2): UIO<A2> {
    return new FIO(Tag.Resume, cb)
  }

  /**
   * @ignore
   */
  public static resumeM<E1, A1, A2>(cb: (A: A1) => Instruction): IO<E1, A2> {
    return new FIO(Tag.ResumeM, cb)
  }

  public static timeout<A>(value: A, duration: number): UIO<A> {
    return FIO.async((env, rej, res, sh) => sh.delay(res, duration, value))
  }

  public static try<A>(cb: () => A): Task<A> {
    return FIO.io(cb)
  }

  public static uio<A>(cb: () => A): UIO<A> {
    return FIO.io(cb)
  }

  public static io<E = never, A = unknown>(cb: () => A): IO<E, A> {
    return new FIO(Tag.Resume, cb)
  }

  public and<R2, E2, A2>(aFb: FIO<R2, E2, A2>): FIO<R1 & R2, E1 | E2, A2> {
    return this.chain(() => aFb)
  }

  public chain<R2, E2, A2>(
    aFb: (a: A1) => FIO<R2, E2, A2>
  ): FIO<R1 & R2, E1 | E2, A2> {
    return FIO.chain(this, aFb)
  }

  public const<A2>(a: A2): FIO<R1, E1, A2> {
    return this.and(FIO.of(a))
  }

  public delay(duration: number): FIO<R1, E1, A1> {
    return FIO.timeout(this, duration).chain(Id)
  }

  public map<A2>(ab: (a: A1) => A2): FIO<R1, E1, A2> {
    return FIO.map(this, ab)
  }

  public catch<R2, E2, A2>(
    aFb: (e: E1) => FIO<R2, E2, A2>
  ): FIO<R1 & R2, E2, A2> {
    return FIO.catch(this, aFb)
  }

  public toInstruction(): Instruction {
    return this as Instruction
  }

  public environment<R2>(): FIO<R2 & R1, E1, A1> {
    return FIO.access<R2, R2>(Id).and(this)
  }

  public once(): UIO<FIO<R1, E1, A1>> {
    return Await.of<E1, A1>().map(await =>
      await
        .set(this)
        .and(await.get())
        .environment<R1>()
    )
  }

  public suspend(): UIO<Fiber<E1, A1>> {
    return new FIO(Tag.Suspend, this)
  }

  public provide(env: R1): IO<E1, A1> {
    return new FIO(Tag.Provide, this, env)
  }
}
