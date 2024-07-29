//@ts-ignore
import mnist from 'mnist'
import { FloatArray } from './T'
type T = {
    input: FloatArray  //784
    output: FloatArray //10
}
export const data = mnist.set(8000, 2000) as {
    training: T[]
    test: T[]
}

console.log(data)