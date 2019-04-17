/**
 * Created by tushar on 2019-03-11
 */
import {assert} from 'chai'

import {IO} from '../'

describe('encaseP', () => {
  it('should resolve via promises', async () => {
    const fetch = (...t: string[]) => Promise.resolve(t.join(','))
    const fetchF = IO.encaseP(fetch)
    const actual = await fetchF('a', 'b', 'c').toPromise()

    const expected = 'a,b,c'
    assert.equal(actual, expected)
  })
})