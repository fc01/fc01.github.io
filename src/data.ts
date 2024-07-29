//@ts-ignore
import mnist from 'mnist'

type T = {
    input: number[]     //784
    output: number[]    //10
}

export const data = mnist.set(8000, 2000) as {
    training: T[]
    test: T[]
} 