import {scheduler} from 'ts-scheduler'

import {FIO} from '../main/FIO'

import {BaseRuntime} from './BaseRuntime'

export class DefaultRuntime extends BaseRuntime {
  public scheduler = scheduler

  public async unsafeExecutePromise<E, A>(io: FIO<E, A>): Promise<A> {
    return new Promise((res, rej) => {
      this.unsafeExecute(io, res, rej)
    })
  }
}

export const defaultRuntime = () => new DefaultRuntime()
